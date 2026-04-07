import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, View, Text, TouchableOpacity, ActivityIndicator, 
  Animated, StyleSheet, Platform 
} from 'react-native';

const JAWWMessages = [
  "THE LEDGER: Every card carries a cryptographically signed history of its journey. Your ledger is the immutable truth of who shared what, and when.",
  "RANKING EXPERTISE: Rank isn't bought; it's earned through physical proximity. Your cred grows based on how many trusted operators sync your intel.",
  "BOT RESISTANCE: JAWW operates on Proof-of-Proximity. Because data only moves over local radio connections, remote bot farms cannot invade the mesh.",
  "DATA SOVEREIGNTY: There are no central servers. There is no cloud database. Your identity and your ledger live exclusively on this hardware.",
  "BLUETOOTH LOW ENERGY: The mesh relies on short-range, peer-to-peer radio frequencies. Data is transmitted entirely off-grid.",
  "THE PROTOCOL: Before any ledger merges, devices execute a cryptographic handshake to verify identities and prevent node spoofing.",
  "OFFLINE INTEGRITY: Even completely disconnected from the internet, the cryptographic zipper ensures no block in the ledger can be tampered with."
];

const SyncStatusScreen = ({ isVisible, onClose }) => {
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      // Fade Out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        // Change text while invisible
        setIndex((prevIndex) => (prevIndex + 1) % JAWWMessages.length);
        
        // Fade In
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 6000); // Cycles every 6 seconds

    return () => clearInterval(interval);
  }, [isVisible, fadeAnim]);

  return (
    <Modal visible={isVisible} animationType="slide" transparent={true}>
      <View style={styles.syncModalContainer}>
        
        <ActivityIndicator size="large" color="#F59E0B" style={{ marginBottom: 30 }} />
        
        <Text style={styles.syncModalTitle}>(( ON AIR ))</Text>
        <Text style={styles.syncModalSubtitle}>Broadcasting Identity to Mesh</Text>

        <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 40, marginTop: 40 }}>
          <Text style={styles.syncModalLoreText}>
            {JAWWMessages[index]}
          </Text>
        </Animated.View>

        <TouchableOpacity style={styles.syncModalCloseBtn} onPress={onClose}>
          <Text style={styles.syncModalCloseText}>CLOSE CONNECTION</Text>
        </TouchableOpacity>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  syncModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.98)', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncModalTitle: {
    color: '#10B981', 
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  syncModalSubtitle: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  syncModalLoreText: {
    color: '#F8FAFC',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  syncModalCloseBtn: {
    position: 'absolute',
    bottom: 50,
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  syncModalCloseText: {
    color: '#EF4444',
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});

export default SyncStatusScreen;