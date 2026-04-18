import React, { useState, useEffect } from 'react';
import BluetoothService from '../services/BluetoothService';
import { 
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Dimensions, Alert, Vibration
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { insertTrustedSource, removeTrustedSource, isSourceTrusted } from '../model/database'; 

const SCREEN_HEIGHT = Dimensions.get('window').height;

const ReviewModal = ({ visible, onClose, onBlock, onRequestReview, onFlag }) => {
    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalBox, {borderColor: '#F59E0B', borderWidth: 2}]}>
                    <View style={styles.reviewHeader}>
                        <Feather name="alert-triangle" size={18} color="#F59E0B" />
                        <Text style={styles.reviewTitle}>OPERATOR REVIEW</Text>
                    </View>
                    
                    <TouchableOpacity onPress={onRequestReview} style={styles.btnOutlineAmber}>
                        <Text style={styles.btnTextAmber}>REQUEST NETWORK REVIEW</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={onFlag} style={styles.btnOutlineAmber}>
                        <Text style={styles.btnTextAmber}>FLAG CONTENT</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={onBlock} style={styles.btnOutlineDanger}>
                        <Feather name="x-octagon" size={14} color="#EF4444" style={{marginRight: 6}} />
                        <Text style={styles.btnTextDanger}>BURN CARD & BLOCK OP</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={onClose} style={styles.btnCancel}>
                        <Text style={styles.btnTextGray}>ABORT</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function CardDetailModal({ visible, card, onClose, onFork, onChain, onEnhance, onBlockOperator, currentUserHandle, onRequestReview, onOffer, onMeshSync, onAddToGroceryList }) {
  const [isQRVisible, setIsQRVisible] = useState(false);
  const [isTrusted, setIsTrusted] = useState(false);
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  
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

  const SYSTEM_CATEGORIES = [
    'TECH', 'MEDICAL', 'PHYSIOLOGY', 'OUTDOORS', 'SURVIVAL', 
    'TRADES', 'DOMESTIC', 'FINANCE', 'BUSINESS', 'SCIENCE', 'CIVICS', 'LOGIC'
  ];
  const isSystemCard = SYSTEM_CATEGORIES.includes(card.category) && card.author !== currentUserHandle;

  const forkNote = card.history?.slice().reverse().find(h => h.action === 'FORKED' || h.action === 'FORK')?.note;
  const author = card.originalAuthor || (card.genesis ? card.genesis.author_id : card.author) || "Unknown";
  const qrPayload = `JAWW:${currentUserHandle}:${card.id}`;

  let isNutritionCard = card.topic === 'nutrition';
  let isNutrientCard = card.topic === 'nutrient';
  let nutritionData = null;
  let nutrientData = null;

  if (isNutritionCard) {
      try {
          nutritionData = JSON.parse(card.body);
      } catch (e) {
          isNutritionCard = false;
      }
  }

  if (isNutrientCard) {
      try {
          nutrientData = JSON.parse(card.body);
      } catch (e) {
          isNutrientCard = false;
      }
  }

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
    console.log("Flag pressed");
    setReviewModalVisible(false);
    onClose();
  }

  const formatKey = (key) => {
    if (!key || key === 'Unknown') return 'UNKNOWN';
    if (key === 'Local Generation') return 'LOCAL GENERATION';
    if (key.length > 20) return `${key.substring(0, 8)}...${key.substring(key.length - 8)}`;
    return key;
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
            
            {/* --- TOP BAR: CHAIN OF CUSTODY --- */}
            <View style={styles.topBar}>
                {!isSystemCard ? (
                    <TouchableOpacity onPress={onChain} style={styles.topChainBtn}>
                        <Feather name="link" size={12} color="#94A3B8" />
                        <Text style={styles.topChainText}>CHAIN OF CUSTODY</Text>
                    </TouchableOpacity>
                ) : <View />}
                <TouchableOpacity onPress={onClose}>
                    <Feather name="x" size={24} color="#64748B" />
                </TouchableOpacity>
            </View>

            {/* --- HEADER --- */}
            <View style={styles.headerContainer}>
                <View style={{flexDirection:'row', alignItems:'center', justifyContent: 'center', flexWrap: 'wrap'}}>
                    <Text style={styles.modalTitle}>{card.title}</Text>
                    {card.forkedFrom && (
                        <View style={styles.forkBadge}>
                            <Text style={styles.forkText}>⑂ FORKED</Text>
                        </View>
                    )}
                </View>
                
                <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                        {isSystemCard 
                            ? `// CORE LIBRARY: ${card.category} //` 
                            : (card.forkedFrom ? `Original Author: ${card.originalAuthor || 'Unknown'}` : `By ${author}`)
                        }
                    </Text>
                    {!isSystemCard && author !== currentUserHandle && (
                        <TouchableOpacity onPress={handleVouchOperator} style={styles.vouchBtn}>
                            <Feather name="star" size={14} color={isTrusted ? '#F59E0B' : '#64748B'} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* --- BODY SCROLL --- */}
            <ScrollView style={styles.bodyScroll}>
                {isNutritionCard && nutritionData ? (
                    <View style={styles.nutritionBox}>
                        <Text style={styles.nutritionHeader}>NUTRITION FACTS</Text>
                        <Text style={styles.nutritionUnit}>Amount Per {nutritionData.baseline_unit}</Text>
                        <View style={styles.nutritionDividerThick} />
                        <View style={styles.nutritionRow}><Text style={styles.nutritionLabelBold}>Calories</Text><Text style={styles.nutritionValueBold}>{nutritionData.macros?.calories}</Text></View>
                        <View style={styles.nutritionDividerThick} />
                        <View style={styles.nutritionRow}><Text style={styles.nutritionLabel}>Protein</Text><Text style={styles.nutritionValue}>{nutritionData.macros?.protein_g}g</Text></View>
                        <View style={styles.nutritionDivider} />
                        <View style={styles.nutritionRow}><Text style={styles.nutritionLabel}>Total Fat</Text><Text style={styles.nutritionValue}>{nutritionData.macros?.fat_g}g</Text></View>
                        <View style={styles.nutritionDivider} />
                        <View style={styles.nutritionRow}><Text style={styles.nutritionLabel}>Total Carbohydrate</Text><Text style={styles.nutritionValue}>{nutritionData.macros?.carbs_g}g</Text></View>
                        <View style={styles.nutritionDivider} />
                        <View style={styles.nutritionRow}><Text style={styles.nutritionLabel}>Sodium</Text><Text style={styles.nutritionValue}>{nutritionData.macros?.sodium_mg}mg</Text></View>
                        <View style={styles.nutritionDividerThick} />
                        
                        {nutritionData.description && <Text style={[styles.cardBody, {marginTop: 15, color: '#000'}]}>{nutritionData.description}</Text>}
                        {nutritionData.content && !nutritionData.description && <Text style={[styles.cardBody, {marginTop: 15, color: '#000'}]}>{nutritionData.content}</Text>}
                        
                        {nutritionData.where_found && (
                            <>
                                <Text style={[styles.nutrientSubheader, {marginTop: 15, color: '#64748B'}]}>WHERE IT'S FOUND:</Text>
                                <Text style={[styles.nutrientListItem, {color: '#334155'}]}>{nutritionData.where_found}</Text>
                            </>
                        )}
                        {nutritionData.benefits && (
                            <>
                                <Text style={[styles.nutrientSubheader, {marginTop: 15, color: '#10B981'}]}>BIOLOGICAL BENEFITS:</Text>
                                <Text style={[styles.nutrientListItem, {color: '#059669'}]}>{nutritionData.benefits}</Text>
                            </>
                        )}
                        {nutritionData.associated_nutrients && (
                            <>
                                <Text style={[styles.nutrientSubheader, {marginTop: 15, color: '#38BDF8'}]}>ASSOCIATED NUTRIENTS:</Text>
                                {nutritionData.associated_nutrients.map((nut, index) => (
                                    <Text key={index} style={[styles.nutrientListItem, {color: '#0284C7'}]}>• {nut}</Text>
                                ))}
                            </>
                        )}
                    </View>
                ) : isNutrientCard && nutrientData ? (
                    <View style={styles.nutrientBox}>
                        <Text style={styles.nutrientHeader}>BIOLOGICAL NUTRIENT</Text>
                        <View style={styles.nutritionDividerThick} />
                        <Text style={[styles.cardBody, {marginTop: 10, marginBottom: 20}]}>{nutrientData.content}</Text>
                        
                        <Text style={styles.nutrientSubheader}>RECOMMENDED DAILY VALUE:</Text>
                        <Text style={styles.nutrientValue}>{nutrientData.recommended_daily_value}</Text>
                        
                        <Text style={[styles.nutrientSubheader, {marginTop: 15}]}>COMMON SOURCES:</Text>
                        {nutrientData.common_sources?.map((source, index) => (
                            <Text key={index} style={styles.nutrientListItem}>• {source}</Text>
                        ))}
                        
                        <Text style={[styles.nutrientSubheader, {marginTop: 15, color: '#EF4444'}]}>DEFICIENCY SYMPTOMS:</Text>
                        {nutrientData.deficiency_symptoms?.map((symptom, index) => (
                            <Text key={index} style={[styles.nutrientListItem, {color: '#FCA5A5'}]}>• {symptom}</Text>
                        ))}
                    </View>
                ) : (
                    <Text style={styles.cardBody}>{card.body}</Text>
                )}
                
                {forkNote && !isSystemCard && (
                    <View style={styles.noteBox}>
                        <View style={styles.noteHeader}>
                            <Feather name="edit-3" size={12} color="#F59E0B" />
                            <Text style={styles.noteLabel}>CURATOR'S NOTE</Text>
                        </View>
                        <Text style={styles.noteText}>"{forkNote}"</Text>
                    </View>
                )}
            </ScrollView>
            
            {/* --- QR CODE (CONDITIONAL) --- */}
            {isQRVisible && !isSystemCard && (
              <View style={styles.qrContainer}>
                <View style={styles.qrWrapper}>
                    <QRCode value={qrPayload} size={150} backgroundColor="#FFFFFF" color="#000000" />
                </View>
                <Text style={styles.qrLabel}>SCAN TO ACQUIRE</Text>
              </View>
            )}
            
            {/* --- FOOTER ACTIONS --- */}
            <View style={styles.footerContainer}>
                {isSystemCard ? (
                    <TouchableOpacity style={styles.btnEnhance} onPress={() => onEnhance(card)}>
                        <Feather name="plus-circle" size={16} color="#10B981" />
                        <Text style={styles.btnEnhanceText}>CREATE A BETTER GUIDE</Text>
                    </TouchableOpacity>
                ) : (
                    <>
                        <View style={styles.actionRow}>
                            <TouchableOpacity onPress={() => onFork(card)} style={styles.btnActionAmber}>
                                <Text style={styles.btnActionIconAmber}>⑂</Text>
                                <Text style={styles.btnActionTextAmber}>FORK</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => onMeshSync && onMeshSync(card.id)} style={styles.btnActionAmber}>
                                <Feather name="refresh-cw" size={14} color="#F59E0B" />
                                <Text style={styles.btnActionTextAmber}>SYNC</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                onPress={() => {
                                    const nextState = !isQRVisible;
                                    setIsQRVisible(nextState);
                                    if (nextState && onOffer) {
                                        onOffer(card); 
                                    } else if (!nextState) {
                                        BluetoothService.stopBroadcasting();
                                    }
                                }} 
                                style={isQRVisible ? styles.btnActionActive : styles.btnActionGreen}
                            >
                                <Feather name={isQRVisible ? "eye-off" : "radio"} size={14} color={isQRVisible ? '#F8FAFC' : '#10B981'} />
                                <Text style={isQRVisible ? styles.btnActionTextActive : styles.btnActionTextGreen}>
                                    {isQRVisible ? 'CLOSE TX' : 'OFFER TX'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {isNutritionCard && onAddToGroceryList && (
                            <TouchableOpacity onPress={() => onAddToGroceryList(card)} style={[styles.btnEnhance, { marginTop: 12, backgroundColor: '#0F172A', borderColor: '#38BDF8' }]}>
                                <Feather name="shopping-cart" size={16} color="#38BDF8" />
                                <Text style={[styles.btnEnhanceText, { color: '#38BDF8' }]}>ADD TO GROCERY LIST</Text>
                            </TouchableOpacity>
                        )}

                        {author !== currentUserHandle && (
                            <TouchableOpacity onPress={() => setReviewModalVisible(true)} style={styles.btnReview}>
                                <Feather name="shield" size={14} color="#64748B" />
                                <Text style={styles.btnReviewText}>OPERATOR REVIEW</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </View>
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  modalBox: { backgroundColor: '#0F172A', borderRadius: 8, padding: 20, borderWidth: 1, borderColor: '#334155' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  topChainBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 4, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', gap: 6 },
  topChainText: { color: '#94A3B8', fontSize: 10, fontFamily: 'Courier', fontWeight: 'bold' },
  headerContainer: { alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 16 },
  modalTitle: { color: '#F8FAFC', fontSize: 20, fontWeight: 'bold', fontFamily: 'Courier', textAlign: 'center', letterSpacing: 1 },
  forkBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  forkText: { color: '#000', fontSize: 10, fontWeight: 'bold', fontFamily: 'Courier' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  metaText: { color: '#10B981', fontSize: 11, fontFamily: 'Courier', letterSpacing: 0.5 },
  vouchBtn: { marginLeft: 10, padding: 4, backgroundColor: '#1E293B', borderRadius: 4, borderWidth: 1, borderColor: '#334155' },
  bodyScroll: { maxHeight: SCREEN_HEIGHT * 0.40 },
  cardBody: { color: '#E2E8F0', fontSize: 15, lineHeight: 24, fontFamily: 'Courier', marginVertical: 10 },
  noteBox: { marginTop: 16, padding: 12, backgroundColor: '#1E293B', borderLeftWidth: 3, borderLeftColor: '#F59E0B', borderRadius: 4 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 },
  noteLabel: { color: '#F59E0B', fontSize: 11, fontWeight: 'bold', fontFamily: 'Courier' },
  noteText: { color: '#CBD5E1', fontStyle: 'italic', fontSize: 13, lineHeight: 20 },
  qrContainer: { alignItems: 'center', marginVertical: 20 },
  qrWrapper: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8 },
  qrLabel: { color: '#10B981', fontSize: 12, marginTop: 12, fontFamily: 'Courier', fontWeight: 'bold', letterSpacing: 2 },
  footerContainer: { marginTop: 16, paddingTop: 16 },
  actionRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btnActionAmber: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 14, borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnActionTextAmber: { color: '#F59E0B', fontWeight: 'bold', fontFamily: 'Courier', fontSize: 14 },
  btnActionIconAmber: { color: '#F59E0B', fontWeight: 'bold', fontSize: 16 },
  btnActionGreen: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 14, borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnActionTextGreen: { color: '#10B981', fontWeight: 'bold', fontFamily: 'Courier', fontSize: 14 },
  btnActionActive: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: '#F8FAFC', backgroundColor: '#334155', padding: 14, borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 6 },
  btnActionTextActive: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontFamily: 'Courier',
    fontSize: 10
  },
  // --- NUTRITION FACTS UI ---
  nutritionBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    marginBottom: 20,
  },
  nutritionHeader: {
    fontFamily: 'Courier',
    fontWeight: '900',
    fontSize: 32,
    color: '#000',
    marginBottom: 4,
  },
  nutritionUnit: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nutritionDivider: {
    height: 1,
    backgroundColor: '#000',
    marginVertical: 4,
  },
  nutritionDividerThick: {
    height: 8,
    backgroundColor: '#000',
    marginVertical: 6,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  nutritionLabel: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#000',
  },
  nutritionLabelBold: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
  },
  nutritionValue: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#000',
  },
  nutritionValueBold: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
  },
  // --- NUTRIENT CARD UI ---
  nutrientBox: {
    backgroundColor: '#0F172A',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginBottom: 20,
  },
  nutrientHeader: {
    fontFamily: 'Courier',
    fontWeight: 'bold',
    fontSize: 20,
    color: '#38BDF8',
    marginBottom: 4,
  },
  nutrientSubheader: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  nutrientValue: {
    fontFamily: 'Courier',
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nutrientListItem: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#E2E8F0',
    marginBottom: 4,
    paddingLeft: 8,
  },
  btnReview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#334155', borderRadius: 6, gap: 8 },
  btnReviewText: { color: '#94A3B8', fontWeight: 'bold', fontFamily: 'Courier', fontSize: 12, letterSpacing: 1 },
  btnEnhance: { flexDirection: 'row', backgroundColor: '#022C22', paddingVertical: 16, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#10B981', width: '100%', gap: 8 },
  btnEnhanceText: { color: '#10B981', fontWeight: 'bold', fontFamily: 'Courier', fontSize: 14 },
  btnCancel: { marginTop: 16, padding: 12, alignItems: 'center' },
  btnTextGray: { color: '#94A3B8', fontFamily: 'Courier', fontSize: 13, fontWeight: 'bold', letterSpacing: 1 },
  
  // Review Modal Styles
  reviewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, gap: 8 },
  reviewTitle: { color: '#F59E0B', fontSize: 16, fontWeight: 'bold', fontFamily: 'Courier', letterSpacing: 1 },
  btnOutlineAmber: { borderWidth: 1, borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.05)', padding: 14, borderRadius: 6, alignItems: 'center', marginBottom: 12 },
  btnTextAmber: { color: '#F59E0B', fontFamily: 'Courier', fontSize: 12, fontWeight: 'bold' },
  btnOutlineDanger: { flexDirection: 'row', borderWidth: 1, borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 14, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  btnTextDanger: { color: '#EF4444', fontFamily: 'Courier', fontSize: 12, fontWeight: 'bold' },

});