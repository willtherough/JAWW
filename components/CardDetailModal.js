import React, { useState, useEffect } from 'react';
import BluetoothService from '../services/BluetoothService';
import { 
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, Alert, Vibration
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons'; // Import Feather icons
import { insertTrustedSource, removeTrustedSource, isSourceTrusted } from '../model/database'; // Import DB functions

const SCREEN_HEIGHT = Dimensions.get('window').height;

const ReviewModal = ({ visible, onClose, onBlock, onRequestReview, onFlag }) => {
    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, {borderColor: '#f59e0b'}]}>
                    <Text style={styles.modalTitle}>REVIEW OPTIONS</Text>
                    <TouchableOpacity onPress={onRequestReview} style={[styles.btnOutline, {marginTop: 0, borderColor: '#f59e0b'}]}>
                        <Text style={[styles.btnTextGray, {color: '#f59e0b'}]}>REQUEST REVIEW</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onFlag} style={[styles.btnOutline, {borderColor: '#f59e0b'}]}>
                        <Text style={[styles.btnTextGray, {color: '#f59e0b'}]}>FLAG</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onBlock} style={[styles.btnOutline, {borderColor: '#ff0000', backgroundColor: '#440000'}]}>
                        <Text style={[styles.btnTextGray, {color: '#ff0000'}]}>BURN CARD & BLOCK</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
                        <Text style={styles.btnTextGray}>CANCEL</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function CardDetailModal({ visible, card, onClose, onFork, onChain, onEnhance, onBlockOperator, currentUserHandle, onRequestReview }) {
  const [isQRVisible, setIsQRVisible] = useState(false);
  const [isTrusted, setIsTrusted] = useState(false); // State for vouch status
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);

  // --- TRIGGER BROADCAST WHEN OFFERING ---
  useEffect(() => {
    if (isQRVisible) {
        console.log(">> OFFER MODE: Starting Broadcast...");
        BluetoothService.startAdvertising();
    }
  }, [isQRVisible]);
  
  // --- CHECK TRUST STATUS ON CARD LOAD ---
  useEffect(() => {
    const checkTrust = async () => {
      if (card?.genesis?.author_id) {
        const trusted = await isSourceTrusted(card.genesis.author_id);
        setIsTrusted(trusted);
      }
    };
    if (visible) {
      checkTrust();
    }
  }, [card, visible]);

  if (!visible || !card) return null;

  // --- HANDLER FOR VOUCH/UNVOUCH ---
  const handleVouchOperator = async () => {
    const authorId = card.genesis?.author_id;
    const authorHandle = card.author || 'Unknown';

    if (!authorId) {
      Alert.alert("Error", "Operator identity unknown. Cannot update trust status.");
      return;
    }

    try {
      if (isTrusted) {
        await removeTrustedSource(authorId);
        setIsTrusted(false);
        Alert.alert("Trust Revoked", `You are no longer vouching for ${authorHandle}.`);
      } else {
        const source = {
          uid: authorId,
          handle: authorHandle,
          publicKey: authorId,
          timestamp: new Date().toISOString(),
        };
        await insertTrustedSource(source);
        setIsTrusted(true);
        Alert.alert("Operator Trusted", "Intel from this Operator will be prioritized.");
      }
    } catch (error) {
      console.error("Trust update failed:", error);
      Alert.alert("Error", "Failed to update trust status.");
    }
  };

  // 1. DETECT SYSTEM CARD
  const SYSTEM_CATEGORIES = [
    'TECH', 'MEDICAL', 'PHYSIOLOGY', 'OUTDOORS', 'SURVIVAL', 
    'TRADES', 'DOMESTIC', 'FINANCE', 'BUSINESS', 'SCIENCE', 'CIVICS', 'LOGIC'
  ];
  const isSystemCard = SYSTEM_CATEGORIES.includes(card.category) && card.author !== currentUserHandle;

  // 2. PREPARE DATA
  const forkNote = card.history?.slice().reverse().find(h => h.action === 'FORKED')?.note;
  const author = card.originalAuthor || (card.genesis ? card.genesis.author_id : card.author) || "Unknown";
  
  const qrPayload = `JAWW:${currentUserHandle}:${card.id}`;

  const handleBlock = () => {
    onBlockOperator(card);
    Vibration.vibrate([0, 100, 50, 500]);
    setReviewModalVisible(false);
    onClose();
  }

  const handleRequestReview = () => {
    onRequestReview(card);
    setReviewModalVisible(false);
  }

  const handleFlag = () => {
    // TODO: Implement Flag
    console.log("Flag pressed");
    setReviewModalVisible(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
            
            {/* --- HEADER --- */}
            <View style={{alignItems:'center', marginBottom:10}}>
                {!isSystemCard && (
                    <TouchableOpacity onPress={onChain} style={styles.topChainBtn}>
                        <Text style={styles.topChainText}>⛓ CHAIN OF CUSTODY</Text>
                    </TouchableOpacity>
                )}

                <View style={{flexDirection:'row', alignItems:'center', marginTop: 10}}>
                    <Text style={styles.modalTitle}>{card.title}</Text>
                    {card.forkedFrom && (
                        <View style={styles.forkBadge}>
                            <Text style={styles.forkText}>⑂ FORKED</Text>
                        </View>
                    )}
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.metaText}>
                        {isSystemCard 
                            ? `// CORE LIBRARY: ${card.category} //` 
                            : (card.forkedFrom ? `Original Author: ${card.originalAuthor || 'Unknown'}` : `By ${author}`)
                        }
                    </Text>
                    {!isSystemCard && author !== currentUserHandle && (
                        <TouchableOpacity onPress={handleVouchOperator} style={{ marginLeft: 8 }}>
                            <Feather name="star" size={16} color={isTrusted ? '#f59e0b' : '#555'} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* --- BODY SCROLL --- */}
            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.45 }}>
                <Text style={styles.cardBody}>{card.body}</Text>
                
                {forkNote && !isSystemCard && (
                    <View style={styles.noteBox}>
                        <Text style={styles.noteLabel}>CURATOR'S NOTE</Text>
                        <Text style={styles.noteText}>"{forkNote}"</Text>
                    </View>
                )}
            </ScrollView>
            
            {/* --- QR CODE --- */}
            {isQRVisible && !isSystemCard && (
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <View style={{backgroundColor:'white', padding: 10, borderRadius: 5}}>
                    <QRCode value={qrPayload} size={150}/>
                </View>
                <Text style={{color:'#00ff00', fontSize:12, marginTop: 10, fontFamily:'Courier', fontWeight:'bold'}}>
                    SCAN TO ACQUIRE
                </Text>
              </View>
            )}
            
            {/* --- FOOTER ACTIONS --- */}
            <View style={styles.footerContainer}>
                
                {isSystemCard ? (
                    <TouchableOpacity 
                        style={styles.btnEnhance} 
                        onPress={() => onEnhance(card)}
                    >
                        <Text style={styles.btnEnhanceText}>CREATE A BETTER GUIDE</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <View style={{flexDirection:'row', gap: 10, width: '100%'}}>
                            <TouchableOpacity onPress={() => onFork(card)} style={[styles.btnAction, {borderColor: '#f59e0b'}]}>
                                <Text style={{color: '#f59e0b', fontWeight:'bold', fontSize: 16}}>⑂</Text>
                                <Text style={{color: '#f59e0b', fontWeight:'bold', fontFamily: 'Courier', marginLeft: 5}}>FORK</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => setIsQRVisible(!isQRVisible)} 
                                style={[
                                    styles.btnAction, 
                                    {
                                        borderColor: isQRVisible ? '#fff' : '#00ff00', 
                                        backgroundColor: isQRVisible ? '#222' : 'transparent'
                                    }
                                ]}
                            >
                                <Text style={{color: isQRVisible ? '#fff' : '#00ff00', fontWeight:'bold', fontFamily: 'Courier'}}>
                                    {isQRVisible ? 'CLOSE' : 'OFFER'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {/* THE GUARDRAIL: Do not allow the Operator to burn themselves */}
                        {author !== currentUserHandle && (
                            <TouchableOpacity onPress={() => setReviewModalVisible(true)} style={[styles.btnAction, {borderColor: '#f59e0b', marginTop: 10, backgroundColor: '#4c3b00'}]}>
                                <Text style={{color: '#f59e0b', fontWeight:'bold', fontFamily: 'Courier'}}>REVIEW</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>

            <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
                <Text style={styles.btnTextGray}>CLOSE</Text>
            </TouchableOpacity>

        </View>
      </View>
      <ReviewModal 
        visible={isReviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        onBlock={handleBlock}
        onRequestReview={handleRequestReview}
        onFlag={handleFlag}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#333' },
  topChainBtn: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, backgroundColor: '#222', borderWidth: 1, borderColor: '#444' },
  topChainText: { color: '#888', fontSize: 10, fontFamily: 'Courier', fontWeight: 'bold' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 5, fontFamily: 'Courier', textAlign: 'center' },
  metaText: { color: '#00ff00', fontSize: 10, fontFamily: 'Courier', marginTop: 5 },
  forkBadge: { backgroundColor: '#f59e0b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  forkText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  cardBody: { color: '#ccc', fontSize: 14, lineHeight: 22, fontFamily: 'Courier', marginVertical: 10 },
  noteBox: { marginTop: 15, padding: 10, backgroundColor: '#222', borderLeftWidth: 3, borderLeftColor: '#f59e0b', borderRadius: 4 },
  noteLabel: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold', marginBottom: 5, fontFamily: 'Courier' },
  noteText: { color: '#ccc', fontStyle: 'italic', fontSize: 12 },
  footerContainer: { marginTop: 20, borderTopWidth: 1, borderColor: '#333', paddingTop: 20 },
  btnAction: { flex: 1, flexDirection: 'row', borderWidth: 1, padding: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  btnEnhance: {
    backgroundColor: '#003300', 
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#00ff00',     
    width: '100%',
  },
  btnEnhanceText: {
    color: '#00ff00',
    fontSize: 14, 
    fontWeight: 'bold', 
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  btnCancel: { marginTop: 15, padding: 10, alignItems: 'center' },
  btnTextGray: { color: '#444', fontFamily: 'Courier', fontSize: 12, fontWeight: 'bold' },
  btnOutline: { borderWidth: 1, borderColor: '#666', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
});