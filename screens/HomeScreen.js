import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert 
} from 'react-native';

import BluetoothService from '../services/BluetoothService';
import KnowledgeCard from '../components/KnowledgeCard';
import { getOrGenerateKeys, signData } from '../model/Security';
import { createCard } from '../model/Schema';

// --- MOCK IDENTITY (Phase 7 Placeholder) ---
// In the future, these come from the secure wallet.
const MOCK_KEYS = {
  publicKey: '04a1b2c3d4e5f67890...' // A fake key to sign our truth
};
const MY_HANDLE = "Patriot_One"; 

export const HomeScreen = () => {
  const [message, setMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [keys, setKeys] = useState(null);

  // 1. THE ACTION: Prepare the Truth
  const handlePreparePacket = async () => {
    if (!message.trim()) {
      Alert.alert("Empty Chamber", "You cannot fire an empty message.");
      return;
    }

    // PASS THE IDENTITY SERVICE SO WE CAN SIGN IT
    const packet = await createPacket(message);
    
    if (packet) {
        setPreviewCard(packet);
    }
  };

  // 2. THE TRIGGER: Start/Stop the Beacon
  const toggleBroadcast = async () => {
    if (isBroadcasting) {
      // Cease Fire
      await BluetoothService.stopBroadcasting();
      setIsBroadcasting(false);
    } else {
      // Open Fire
      if (!previewCard) {
        await handlePreparePacket(); // Auto-prepare if they haven't yet
        if (!message.trim()) return;
      }

      // 1. GENERATE LIVE PACKET
      // We pass the IdentityService so it can sign the packet with your real Private Key
      const livePacket = await createPacket(message);
      
      // 2. DERIVE HANDLE
      // We use the first 8 characters of your Public Key as your "Callsign"
      const myHandle = keys.publicKey 
        ? keys.publicKey.slice(0, 8) 
        : "Unknown";

      // 3. BROADCAST
      await BluetoothService.startBroadcasting(myHandle, livePacket);
      setIsBroadcasting(true);
      Alert.alert("Beacon Active", "You are now a Sovereign Node.");
    }
  };

  const createPacket = async (message) => {
    if (!keys) {
        Alert.alert("Identity Error", "User identity not loaded.");
        return null;
    }
    // 1. Create the basic card structure
    const card = await createCard(keys.publicKey, "Broadcast", message, "/ble/broadcast");

    // 2. Sign the hash of the card
    const signature = await signData(card.hash);
    card.genesis.signature = signature;

    return card;
  };

  // Cleanup on unmount (Don't leave the radio running)
  useEffect(() => {
    // MINT THE KEYS ON LOAD
    const init = async () => {
        const userKeys = await getOrGenerateKeys();
        setKeys(userKeys);
        console.log(">> SYSTEM: Identity Loaded. Public Key:", userKeys.publicKey);
    };
    init();
    
    return () => {
      BluetoothService.stopBroadcasting();
    };
  }, []);

  return (
    <View style={styles.container}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>THE SOURCE</Text>
        <Text style={styles.subtitle}>Sovereign Link: {isBroadcasting ? "ACTIVE" : "SILENT"}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* INPUT SECTION */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Compose Transmission</Text>
          <TextInput
            style={styles.input}
            placeholder="Type your message to the local mesh..."
            placeholderTextColor="#999"
            multiline
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              if (previewCard) setPreviewCard(null); // Reset preview on edit
            }}
          />
        </View>

        {/* PREVIEW SECTION (Phase 4 Integration) */}
        {previewCard && (
          <View style={styles.previewContainer}>
            <Text style={styles.label}>Payload Preview</Text>
            {/* This uses the component we built earlier to show the 'Shield' or 'Crown' */}
            <KnowledgeCard card={previewCard} />
          </View>
        )}

        {/* CONTROLS */}
        <TouchableOpacity 
          style={[styles.button, isBroadcasting ? styles.buttonStop : styles.buttonStart]}
          onPress={toggleBroadcast}
        >
          <Text style={styles.buttonText}>
            {isBroadcasting ? "CEASE BROADCAST" : "BROADCAST TRUTH"}
          </Text>
        </TouchableOpacity>

        {/* DEBUG INFO */}
        <Text style={styles.disclaimer}>
          Protocol: BLE 5.0 (Advertising Mode){"\n"}
          Origin Status: {previewCard ? previewCard.header.origin_status : "N/A"}
        </Text>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#222',
  },
  title: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#4CAF50', // Terminal Green
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  previewContainer: {
    marginBottom: 20,
  },
  button: {
    paddingVertical: 18,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonStart: {
    backgroundColor: '#1976D2', // Blue for Liberty
  },
  buttonStop: {
    backgroundColor: '#D32F2F', // Red for Stop
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  disclaimer: {
    textAlign: 'center',
    color: '#AAA',
    fontSize: 10,
  }
});

export default HomeScreen;