import { NativeModules, DeviceEventEmitter } from 'react-native';
import { Buffer } from 'buffer';
import { searchCards, fetchCards, getCardById, fetchTrustedSources, isBlocked } from '../model/database';
import { verifySignature } from '../model/Security';

const { SourceGattModule } = NativeModules;
const CHUNK_SIZE = 150;
const MAX_HANDSHAKE_SIZE = 600;

import { getAdvertisedCard } from './BroadcastState';

let cardReceivedListener = null;

const onCardReceived = async (requestString) => {
    if (!requestString || typeof requestString !== 'string' || requestString.length > MAX_HANDSHAKE_SIZE) {
        console.warn(`>> SECURITY: Dropped invalid packet.`);
        return;
    }

    console.log(`>> GATT SERVER: Parsed request: ${requestString}`);
    const request = requestString;

    if (request.startsWith('REQ:')) {
        const parts = request.split(':');
        const reqType = parts[1];
        const reqValue = parts[2] ? parts[2].trim() : null;
        const userHandle = parts[3] || 'Unknown';
        const senderPublicKey = parts[4] || null;

        if (senderPublicKey) {
            const blocked = await isBlocked(senderPublicKey, null);
            if (blocked) {
                console.log(`>> GATT SERVER: Denying request from blocked operator ${userHandle}`);
                sendCardInChunks({ error: "BLOCKED" });
                return;
            }
        }

        console.log(`>> GATT SERVER: Request ${reqType}="${reqValue}" from ${userHandle}`);

        if (reqType === 'ACK') {
            const jsonPayload = request.substring(request.indexOf('{'));
            try {
                const ackData = JSON.parse(jsonPayload);
                const { receipt, signature, publicKey } = ackData;
                const receiptParts = receipt.split(':');
                const cardId = receiptParts[0];
                const recipientHandle = receiptParts[2];
                const isValid = verifySignature(receipt, signature, publicKey);
                if (isValid) {
                    console.log(`>> GATT SERVER: Received VALID ACK for ${cardId} from ${recipientHandle}`);
                    DeviceEventEmitter.emit('transferComplete', { cardId, recipientHandle });
                }
            } catch (e) {
                console.error(">> GATT SERVER: Failed to parse signed ACK.", e);
            }
            return;
        }
        
        // --- LINE LOGIC ---
        if (reqType === 'Q') {
            const advertisedCard = getAdvertisedCard(); // Check memory state
            if (advertisedCard) {
                console.log(">> LINE: Received REQ:Q, sending advertised question.");
                sendCardInChunks(advertisedCard);
            } else {
                console.log(">> LINE: Received REQ:Q, but question has expired.");
                sendCardInChunks({ error: "QUESTION_EXPIRED" });
            }
            return; // We're done with the REQ:Q case.
        }
        // --- END LINE LOGIC ---

        let cardToSend = null;
        
        if (reqType === 'ID') {
            if (reqValue) cardToSend = await getCardById(reqValue);
            if (!cardToSend) console.warn(`>> GATT SERVER: 404 - ID [${reqValue}] not found.`);
        }
        else if (reqType === 'CAT' || reqType === 'general') {
            let category = (!reqValue || reqValue === 'undefined' || reqValue === 'none' || reqType === 'general' || reqValue === 'general') ? null : reqValue;
            if (category) {
                const catLower = category.toLowerCase().trim();
                if (catLower.includes('fit')) category = 'health OR fitness OR cooking';
                else if (catLower.includes('food')) category = 'food OR cooking OR culinary OR health';
                else if (catLower.includes('edu')) category = 'education OR history OR science';
                else if (catLower.includes('pro')) category = 'professional OR technology OR military';
                else if (catLower.includes('fun')) category = 'fun OR survival OR music';
            }

            if (!category) {
                console.log(">> GATT SERVER: Fetching highest ranked general card...");
                const allCards = await fetchCards(1, 0);
                if (allCards.length > 0) cardToSend = allCards[0];
            } else {
                console.log(`>> GATT SERVER: Deep searching for [${category}]...`);
                const results = await searchCards(category);
                if (results.length > 0) cardToSend = results[0];
            }
        }

        if (cardToSend) {
            // For questions, we send directly. For others, we ask for confirmation.
            console.log(`>> GATT SERVER: Pausing for user confirmation...`);
            DeviceEventEmitter.emit('pendingTransfer', {
                deviceId: "connected_peer",
                requester: userHandle,
                card: cardToSend
            });
        } else {
            console.log(">> GATT SERVER: No content to send. Sending clean error to client.");
            sendCardInChunks({ error: "NO_CARDS" });
        }
    }
};

// WIRE 3 FIXED: Catch both arguments from the UI, but only send the chunk to Kotlin
const sendCardInChunks = async (deviceId, card) => {
    // THE MAGIC LINE: If the UI sends two arguments, use 'card'. If the background sends one, use 'deviceId'.
    const actualCard = card || deviceId; 

    const cardString = JSON.stringify(actualCard);
    const totalSize = cardString.length;
    console.log(">> GATT SERVER: Sending", actualCard.title || "Error Object", "Size:", totalSize);

    let offset = 0;
    while (offset < totalSize) {
        const chunk = cardString.slice(offset, offset + CHUNK_SIZE);
        try {
            // Pass only the chunk string to Kotlin
            await SourceGattModule.sendData(chunk);
        } catch (e) {
            console.error(">> GATT SERVER: Pipe Broken:", e);
            return;
        }
        offset += CHUNK_SIZE;
        await new Promise(r => setTimeout(r, 150));
    }

    try {
        await SourceGattModule.sendData("__EOF__");
    } catch(e) {}
    
    console.log(">> GATT SERVER: Done.");

    DeviceEventEmitter.emit('onTransferSuccess', { cardTitle: actualCard.title });
};

const startServer = async () => {
    if (SourceGattModule) {
        if (!cardReceivedListener) {
            // WIRE 1 FIXED: Listen for the exact event name Kotlin is emitting
            cardReceivedListener = DeviceEventEmitter.addListener('onDeviceRequest', onCardReceived);
            console.log(">> PERIPHERAL SERVICE: Attached GATT knock listener.");
        }
        try {
            const result = await SourceGattModule.startServer();
            console.log(`>> ENGINE 4: ${result}`);
            console.log(">> ENGINE 4: Listening...");
        } catch (e) {
            console.error(">> ENGINE 4: FAILED to start GATT server", e);
        }
    }
};

const stopServer = () => {
    if (SourceGattModule) SourceGattModule.stopServer();
    if (cardReceivedListener) {
        cardReceivedListener.remove();
        cardReceivedListener = null;
    }
};

export { startServer, stopServer, sendCardInChunks };