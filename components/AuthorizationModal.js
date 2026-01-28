import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export default function AuthorizationModal({ visible, request, onApprove, onDeny }) {
  if (!visible || !request) return null;

  const { peerName, topic, trustLevel, peerId } = request;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.alertBox}>
          
          {/* HEADER: BLINKING WARNING */}
          <View style={styles.header}>
            <View style={styles.blinkDot} />
            <Text style={styles.headerTitle}>INCOMING REQUEST</Text>
            <View style={styles.blinkDot} />
          </View>

          {/* REQUESTER INTEL */}
          <View style={styles.intelBox}>
            <Text style={styles.label}>REQUESTER:</Text>
            <Text style={styles.value}>{peerName.toUpperCase()}</Text>
            
            <Text style={styles.label}>ID / HASH:</Text>
            <Text style={styles.subValue}>{peerId.substring(0, 16)}...</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.label}>REQUESTING ACCESS TO:</Text>
            <Text style={styles.target}>{topic.toUpperCase()} ARCHIVES</Text>
            
            <View style={styles.trustBadge}>
                <Text style={styles.trustText}>TRUST LEVEL: {trustLevel || 'UNKNOWN'}</Text>
            </View>
          </View>

          <Text style={styles.warningText}>
            Do you authorize this file transfer?
            {"\n"}This action will be logged in the ledger.
          </Text>

          {/* ACTIONS */}
          <View style={styles.actionGrid}>
            <TouchableOpacity onPress={onDeny} style={styles.btnDeny}>
              <Text style={styles.btnTextRed}>DENY ACCESS</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onApprove} style={styles.btnApprove}>
              <Text style={styles.btnTextBlack}>AUTHORIZE UPLOAD</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(50,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  alertBox: { width: '85%', backgroundColor: '#000', borderWidth: 2, borderColor: '#f59e0b', borderRadius: 10, padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { color: '#f59e0b', fontWeight: 'bold', fontSize: 18, letterSpacing: 2 },
  blinkDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f59e0b' },
  
  intelBox: { backgroundColor: '#111', padding: 15, borderRadius: 5, borderWidth: 1, borderColor: '#333' },
  label: { color: '#666', fontSize: 10, fontFamily: 'Courier', marginBottom: 2 },
  value: { color: '#fff', fontSize: 20, fontWeight: 'bold', fontFamily: 'Courier', marginBottom: 10 },
  subValue: { color: '#888', fontSize: 10, fontFamily: 'Courier', marginBottom: 10 },
  target: { color: '#00ff00', fontSize: 16, fontWeight: 'bold', fontFamily: 'Courier', marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  
  trustBadge: { backgroundColor: '#002200', padding: 5, alignSelf: 'flex-start', borderRadius: 3, borderWidth: 1, borderColor: '#005500' },
  trustText: { color: '#00ff00', fontSize: 10, fontWeight: 'bold' },
  
  warningText: { color: '#f59e0b', textAlign: 'center', marginVertical: 20, fontSize: 12, fontStyle: 'italic' },
  
  actionGrid: { flexDirection: 'row', gap: 10 },
  btnDeny: { flex: 1, padding: 15, borderWidth: 1, borderColor: '#ff0000', borderRadius: 5, alignItems: 'center' },
  btnApprove: { flex: 1, padding: 15, backgroundColor: '#f59e0b', borderRadius: 5, alignItems: 'center' },
  btnTextRed: { color: '#ff0000', fontWeight: 'bold' },
  btnTextBlack: { color: '#000', fontWeight: 'bold' }
});