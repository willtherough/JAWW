# JAWW "Boomerang" Protocol: A Developer's Guide to BLE Data Transfer

This document outlines the principles and technical implementation of the "Boomerang" protocol for peer-to-peer data transfer over Bluetooth Low Energy (BLE) within the JAWW ecosystem. The protocol is named for its core sequence: a device "throws" a small piece of information (an advertisement), and the full interaction isn't complete until a final confirmation "returns" to the sender.

## Core Principles

Adhering to these principles is critical for stability, interoperability, and working within the physical constraints of BLE.

1.  **Lean First, Connect to Transact**: BLE advertisements are strictly limited to 31 bytes. They are **only** for discovery and announcing presence/intent. Never attempt to transfer large data in an advertisement. The workflow is always:
    1.  Broadcast a tiny, lean "teaser" payload.
    2.  Initiate a full connection to transfer the actual data.

2.  **Standardized Handshake**: All data requests over a connection follow a standardized string format: `REQ:<TYPE>:<VALUE>:<SENDER_HANDLE>`. This allows the receiving device (the peripheral) to understand and act on any request.

3.  **Chunk & Reassemble**: Large data payloads (like card JSON) are always broken into smaller "chunks" before being sent. The receiving device is responsible for reassembling these chunks until it sees a final `__EOF__` (End of File) marker.

4.  **Confirm the Catch (The Boomerang's Return)**: A data transfer is not considered successful until the device that *initiated* the request sends a final, signed **Acknowledgement (`ACK`)** back to the data source. This closes the loop, prevents data loss, and allows the source to verifiably update its own records (e.g., incrementing a card's "hops" count).

---

## The Four Phases of a Transfer

Every data exchange follows these four phases.

### Phase 1: The Broadcast (Throwing the Boomerang)

This is how devices discover each other.

-   **Implementation**: `BluetoothService.startAdvertising()`
-   **Purpose**: To announce presence and basic intent.
-   **Payload**: The advertisement payload is a highly compact byte array. To conserve space, we encode information into a single string within this payload.
    -   **Format**: A single string that uses prefixes and `|` delimiters.
    -   **Umpire Example**: `U1773428182|WillRuff` (`U` for Umpire, followed by a timestamp and a handle).
    -   **Question Example**: `?What is the password?`
    -   **Standard Example**: `MyHandle|CardSubject`
-   **GUIDELINE**: Keep broadcast data minimal. Use single-character prefixes for flags (`U`, `?`), use compact timestamps (seconds vs. milliseconds), and truncate data like handles. The payload's only job is to make the device discoverable and hint at its purpose.

### Phase 2: The Request (Guiding the Apex)

Once a device is discovered, the client initiates a connection to make a specific request.

-   **Implementation**: `BluetoothService.connectAndRequest()`
-   **Purpose**: To connect to the peripheral and ask for a specific piece of data.
-   **Payload**: A single formatted string written to the peripheral's BLE characteristic.
    -   **Format**: `REQ:<TYPE>:<VALUE>:<SENDER_HANDLE>`
    -   **Examples**:
        -   `REQ:CAT:professional:JohnDoe` (Request a card from the 'professional' category)
        -   `REQ:ID:card-12345:JaneSmith` (Request the specific card with ID 'card-12345')
        -   `REQ:STAT_PAYLOAD:{"a":5,"r":100}:OperatorX` (Send a stat payload to an Umpire)
-   **GUIDELINE**: To create a new feature, you must first define a new `<TYPE>` for the request (e.g., `GET_PROFILE`, `SEND_MESSAGE`). The request must be a single, easily parsable string.

### Phase 3: The Response (The Turnaround)

The peripheral receives the request and sends back the corresponding data.

-   **Implementation**: `PeripheralService.onCardReceived()` listens for requests. `PeripheralService.sendCardInChunks()` sends the data back.
-   **Purpose**: To process a valid request, fetch data from the local database, and transmit it back to the client.
-   **Process**:
    1.  The GATT server listens for a `REQ:` string.
    2.  It parses the `<TYPE>` and `<VALUE>`.
    3.  It may emit a `pendingTransfer` event to the UI for user confirmation.
    4.  It fetches the data (e.g., a full card object from SQLite).
    5.  The data is stringified (usually to JSON) and sent back in pieces using `sendCardInChunks`.
    6.  A final `__EOF__` chunk is sent to signify the end of the transmission.
-   **GUIDELINE**: The peripheral is the gatekeeper. It must validate requests and is responsible for correctly serializing, chunking, and terminating the data stream with `__EOF__`.

### Phase 4: The Acknowledgement (Confirming the Catch)

The client receives the data and sends a final confirmation "boomerang" back to the source.

-   **Implementation**: The `monitorCharacteristicForService` callback within `BluetoothService.connectAndRequest()`.
-   **Purpose**: To confirm successful receipt of all data chunks and provide the original sender with a signed "receipt" of the transaction.
-   **Process**:
    1.  The client listens for incoming chunks and concatenates them until `__EOF__` is seen.
    2.  It parses the complete data string (e.g., `JSON.parse(...)`).
    3.  It constructs a receipt (e.g., `<cardId>:<timestamp>:<myHandle>`).
    4.  It **signs** this receipt with its private key.
    5.  It sends a final message back to the peripheral: `REQ:ACK:<signed_receipt_json>`.
-   **GUIDELINE**: This final `ACK` is non-negotiable. It is the only way for the original data source to know its data was successfully received, which is essential for maintaining data integrity and logging interaction history (e.g., card "hops").

---

## Example: Adding a "Get Profile" Feature

1.  **Define Request Type**: Choose a new type: `GET_PROFILE`. The request from the client will be `REQ:GET_PROFILE:true:MyHandle`.
2.  **Update Peripheral (`PeripheralService.js`)**: In `onCardReceived`, add a new `if` block:
    ```javascript
    if (reqType === 'GET_PROFILE') {
      const myProfile = await loadProfile(); // Assume this function exists
      sendCardInChunks(myProfile); // The function can send any JSON object
      return;
    }
    ```
3.  **Update Client (`BluetoothService.js`)**: Create a new convenience function:
    ```javascript
    async getPeerProfile(peerId, myHandle) {
      return await this.connectAndRequest(peerId, 'GET_PROFILE', 'true', myHandle);
    }
    ```
4.  **Handle Acknowledgement**: The existing `ACK` logic in `connectAndRequest` will automatically handle creating and sending a receipt for the profile data, and the peripheral's `ACK` handling logic will receive it. No changes are needed here, as the protocol is designed to be generic.