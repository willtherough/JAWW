import React, { useState, useEffect } from 'react';
import BluetoothService from '../services/BluetoothService';
import { 
  Modal, View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform, Dimensions, Alert, Vibration
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { Feather } from '@expo/vector-icons';
import { insertTrustedSource, removeTrustedSource, isSourceTrusted, getAllCards, searchCards, getCitedCards } from '../model/database';
import { calculateTrustScore } from '../model/Schema';
import { loadProfile } from '../model/Storage';
import { calculateDailyRequirements } from '../utils/BiologyEngine';

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

export default function CardDetailModal({ visible, card, onClose, onFork, onChain, onEnhance, onBlockOperator, currentUserHandle, onRequestReview, onOffer, onMeshSync, onAddToGroceryList, onAirGapTransfer }) {
  const [isQRVisible, setIsQRVisible] = useState(false);
  const [isTrusted, setIsTrusted] = useState(false);
  const [isReviewModalVisible, setReviewModalVisible] = useState(false);
  const [biologyStats, setBiologyStats] = useState(null);
  const [fridgeAnalysis, setFridgeAnalysis] = useState(null);
  const [relatedRecipes, setRelatedRecipes] = useState([]);
  const [activeUmpireEvent, setActiveUmpireEvent] = useState(null);
  const [counterNarratives, setCounterNarratives] = useState([]);
  const [citedCards, setCitedCards] = useState([]);
  const [trustScore, setTrustScore] = useState(100);

  useEffect(() => {
    const checkTrust = async () => {
      if (card?.genesis?.author_id) {
        const trusted = await isSourceTrusted(card.genesis.author_id);
        setIsTrusted(trusted);
      }
    };

    const checkUmpireEvent = async () => {
      try {
        const str = await AsyncStorage.getItem('@jaww_active_event_state');
        if (str) {
            setActiveUmpireEvent(JSON.parse(str));
        } else {
            setActiveUmpireEvent(null);
        }
      } catch(e) {}
    };

    const processFridgeCard = async () => {
      if (card?.subject?.startsWith('FRIDGE:')) {
        try {
          const itemData = JSON.parse(card.body);
          const profile = await loadProfile();
          const reqs = calculateDailyRequirements(profile);
          setBiologyStats(reqs);

          // Calculate weight in oz (assuming input was lbs)
          const weightLbs = parseFloat(itemData.weight);
          const weightOz = weightLbs * 16;
          const mealPortionOz = 8; // standard meat portion
          const totalMeals = Math.floor(weightOz / mealPortionOz);

          // Look up nutrition facts
          const allCards = await getAllCards();
          const nutritionCard = allCards.find(c => c.topic === 'nutrition' && c.title.toLowerCase() === itemData.trueIngredient.toLowerCase());
          
          let mealNutrition = null;
          if (nutritionCard) {
              const nutData = JSON.parse(nutritionCard.body);
              // Assume baseline is 100g (~3.5 oz)
              const multiplier = mealPortionOz / 3.5; 
              mealNutrition = {
                  calories: Math.round(nutData.macros.calories * multiplier),
                  protein: Math.round(nutData.macros.protein_g * multiplier),
                  carbs: Math.round(nutData.macros.carbs_g * multiplier),
                  fat: Math.round(nutData.macros.fat_g * multiplier),
              };
          }

          setFridgeAnalysis({
              totalMeals,
              mealNutrition,
              ingredient: itemData.trueIngredient
          });

          // Find recipes
          const recipes = allCards.filter(c => 
             (c.topic === 'human/food' || c.subject.includes('RECIPE')) && 
             (c.title.toLowerCase().includes(itemData.trueIngredient.toLowerCase()) || 
              c.body.toLowerCase().includes(itemData.trueIngredient.toLowerCase()))
          );
          setRelatedRecipes(recipes);

        } catch (e) {
            console.error("Fridge Card Parsing Error", e);
        }
      } else {
        setFridgeAnalysis(null);
        setBiologyStats(null);
        setRelatedRecipes([]);
      }
    };

    const fetchCounterNarratives = async () => {
      if (card?.topic === 'intel/news' && card?.title) {
        // Extract basic keywords (words > 4 chars)
        const keywords = card.title.split(' ').filter(w => w.length > 4).map(w => w.replace(/[^a-zA-Z0-9]/g, '')).filter(w => w.length > 0);
        if (keywords.length > 0) {
           const query = keywords.join(' OR ');
           try {
             // We use searchCards but we must filter to ensure they are also news cards
             const results = await searchCards(query, { prioritizeTrusted: true });
             // Filter out the exact same card, and only keep intel/news
             const relatedNews = results.filter(c => c.id !== card.id && c.topic === 'intel/news');
             
             // Sort by Mesh Consensus (Trust) - Assuming we have local functions or just sorting by endorsements
             // For MVP, we sort by hop count and endorsements length as a proxy
             relatedNews.sort((a, b) => (b.endorsements?.length || 0) - (a.endorsements?.length || 0));
             
             setCounterNarratives(relatedNews.slice(0, 5));
           } catch(e) {
             console.error("FTS5 Triangulation failed:", e);
           }
        }
      }
    };

    const fetchCitations = async () => {
      if (card?.citations && card.citations.length > 0) {
        try {
          const results = await getCitedCards(card.citations);
          setCitedCards(results);
        } catch (e) {
          console.error("Failed to fetch citations:", e);
        }
      } else {
        setCitedCards([]);
      }
    };

    const calculateTrust = () => {
      if (card) {
        const score = calculateTrustScore(card, [], [], -50);
        setTrustScore(score);
      }
    };

    if (visible) {
      checkTrust();
      checkUmpireEvent();
      processFridgeCard();
      fetchCounterNarratives();
      fetchCitations();
      calculateTrust();
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
  const author = card.originalAuthor || (card.genesis ? card.genesis.author_handle : null) || card.author || (card.genesis ? card.genesis.author_id : "Unknown");
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

  const isFridgeCard = card.subject?.startsWith('FRIDGE:');

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

  const isCorroded = trustScore < 0.1 || (card.safety && card.safety.flag_count > 0);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalBox, isCorroded && styles.corrodedBox]}>
            
            {isCorroded && (
                <View style={styles.corrosionHeader}>
                    <Feather name="alert-triangle" size={14} color="#000" />
                    <Text style={styles.corrosionText}>HIGHLY DISPUTED INTEL</Text>
                </View>
            )}
            
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
            <ScrollView style={[styles.bodyScroll, isCorroded && { opacity: 0.7 }]}>
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
                ) : isFridgeCard && fridgeAnalysis ? (
                    <View style={styles.fridgeBox}>
                        <Text style={styles.fridgeHeader}>BIOLOGICAL YIELD CALCULATION</Text>
                        <Text style={styles.fridgeSub}>INGREDIENT: {fridgeAnalysis.ingredient.toUpperCase()}</Text>
                        
                        <View style={styles.yieldBox}>
                            <Text style={styles.yieldValue}>{fridgeAnalysis.totalMeals}</Text>
                            <Text style={styles.yieldLabel}>STANDARD 8oz MEALS</Text>
                        </View>

                        {fridgeAnalysis.mealNutrition && biologyStats ? (
                            <View style={styles.arbitrageBox}>
                                <Text style={styles.arbitrageHeader}>NUTRITIONAL ARBITRAGE (1 MEAL)</Text>
                                <Text style={styles.arbitrageSub}>
                                    Target based on {biologyStats.isWorkoutDay ? biologyStats.workoutName : "Sedentary Rest Day"}
                                </Text>
                                
                                {(() => {
                                    const req = biologyStats.male || biologyStats.female; // Fallback to male if no specific profile selected
                                    if (!req) return null;
                                    
                                    const pPct = Math.round((fridgeAnalysis.mealNutrition.protein / req.protein_g) * 100);
                                    const cPct = Math.round((fridgeAnalysis.mealNutrition.carbs / req.carbs_g) * 100);
                                    
                                    return (
                                        <View style={{marginTop: 10}}>
                                            <Text style={styles.arbText}>PROTEIN: {fridgeAnalysis.mealNutrition.protein}g ({pPct}% of Daily Requirement)</Text>
                                            <View style={styles.arbBarBg}><View style={[styles.arbBarFill, {width: `${Math.min(pPct, 100)}%`, backgroundColor: '#38BDF8'}]}/></View>
                                            
                                            <Text style={[styles.arbText, {marginTop: 10}]}>CALORIES: {fridgeAnalysis.mealNutrition.calories} ({Math.round((fridgeAnalysis.mealNutrition.calories / req.calories)*100)}%)</Text>
                                            <View style={styles.arbBarBg}><View style={[styles.arbBarFill, {width: `${Math.min((fridgeAnalysis.mealNutrition.calories / req.calories)*100, 100)}%`, backgroundColor: '#F59E0B'}]}/></View>
                                        </View>
                                    );
                                })()}
                            </View>
                        ) : (
                            <Text style={{color: '#94A3B8', marginTop: 10, fontFamily: 'Courier'}}>Nutritional mapping unavailable. Ensure Biometrics are set in Identity Dossier.</Text>
                        )}

                        {relatedRecipes.length > 0 && (
                            <View style={styles.recipeBox}>
                                <Text style={styles.recipeHeader}>AVAILABLE RECIPES</Text>
                                {relatedRecipes.map(r => (
                                    <View key={r.id} style={styles.recipeItem}>
                                        <Text style={{color: '#10B981', fontFamily: 'Courier', fontSize: 12}}>• {r.title}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                ) : card.subject === 'NUTRITION_LOG' ? (
                    <View style={{ marginTop: 10 }}>
                        <Text style={[styles.cardBody, { color: '#38BDF8', fontWeight: 'bold' }]}>SYSTEM LOG DATA</Text>
                        <Text style={[styles.cardBody, { fontSize: 12, color: '#94A3B8' }]}>
                            {JSON.stringify(JSON.parse(card.body), null, 2)}
                        </Text>
                    </View>
                ) : card.topic === 'intel/news' ? (
                    <View style={{ marginTop: 10 }}>
                        {(() => {
                            const urlRegex = /(https?:\/\/[^\s]+)/g;
                            const urls = card.body.match(urlRegex) || [];
                            const cleanBody = card.body.replace(urlRegex, '[ LINK REMOVED FOR AIR-GAP SECURITY ]');
                            
                            return (
                                <>
                                    <Text style={styles.cardBody}>{cleanBody}</Text>
                                    {urls.length > 0 && (
                                        <View style={{ marginTop: 15, padding: 10, backgroundColor: '#1E293B', borderRadius: 8, borderWidth: 1, borderColor: '#334155' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                                <Feather name="shield" size={14} color="#F59E0B" />
                                                <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: 'bold', marginLeft: 6 }}>AIR-GAP LINK SECURITY</Text>
                                            </View>
                                            <Text style={{ color: '#94A3B8', fontSize: 10, marginBottom: 8 }}>Links are disabled. Long-press to manually copy to your sandboxed browser.</Text>
                                            {urls.map((url, i) => (
                                                <Text key={i} selectable={true} style={{ color: '#38BDF8', fontFamily: 'Courier', fontSize: 12, paddingVertical: 4 }}>
                                                    {url}
                                                </Text>
                                            ))}
                                        </View>
                                    )}
                                </>
                            );
                        })()}
                    </View>
                ) : forkNote && !isSystemCard ? (
                    <View style={{ marginBottom: 15 }}>
                        <Text style={[styles.cardBody, {color: '#F8FAFC', fontSize: 16, fontWeight: 'bold'}]}>{forkNote}</Text>
                        <View style={styles.noteBox}>
                            <View style={styles.noteHeader}>
                                <Feather name="file-text" size={12} color="#64748B" />
                                <Text style={[styles.noteLabel, {color: '#64748B'}]}>ORIGINAL SOURCE MATERIAL</Text>
                            </View>
                            <Text style={[styles.noteText, {color: '#94A3B8'}]}>{card.body}</Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.cardBody}>{card.body}</Text>
                )}
                
                {citedCards.length > 0 && (
                    <View style={{ marginTop: 20, borderTopWidth: 1, borderColor: '#333', paddingTop: 15 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Feather name="link-2" size={16} color="#38BDF8" />
                            <Text style={{ color: '#38BDF8', fontFamily: 'Courier', fontSize: 14, fontWeight: 'bold', marginLeft: 8 }}>
                                // CITED EVIDENCE
                            </Text>
                        </View>
                        {citedCards.map((cCard, idx) => (
                            <View key={idx} style={{ 
                                backgroundColor: '#111', padding: 12, borderRadius: 8, borderWidth: 1, 
                                borderColor: '#333', marginBottom: 8 
                            }}>
                                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{cCard.title}</Text>
                                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
                                    Authored by: <Text style={{ color: '#38BDF8' }}>@{cCard.genesis?.author_handle || 'Unknown'}</Text>
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
                
                {/* --- TRIANGULATION PANEL --- */}
                {card.topic === 'intel/news' && counterNarratives.length > 0 && (
                    <View style={{ marginTop: 25, borderTopWidth: 1, borderColor: '#333', paddingTop: 15 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Feather name="git-branch" size={16} color="#10B981" />
                            <Text style={{ color: '#10B981', fontFamily: 'Courier', fontSize: 14, fontWeight: 'bold', marginLeft: 8 }}>
                                // MESH COUNTER-NARRATIVES
                            </Text>
                        </View>
                        {counterNarratives.map((relCard, idx) => (
                            <View key={idx} style={{ 
                                backgroundColor: '#111', padding: 12, borderRadius: 8, borderWidth: 1, 
                                borderColor: relCard.endorsements?.length > 2 ? '#F59E0B' : '#333', 
                                marginBottom: 8 
                            }}>
                                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }} numberOfLines={1}>{relCard.title}</Text>
                                <Text style={{ color: '#64748B', fontSize: 12, marginTop: 4 }}>
                                    Authored by: <Text style={{ color: '#38BDF8' }}>@{relCard.genesis.author_handle}</Text>
                                </Text>
                            </View>
                        ))}
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

                            {activeUmpireEvent ? (
                                <TouchableOpacity 
                                    onPress={() => {
                                        const eventTopic = `human/${activeUmpireEvent.subject.replace('Mission: ', '').trim()}`;
                                        const subCard = { ...card, topic: eventTopic };
                                        onAirGapTransfer && onAirGapTransfer(subCard);
                                        onClose();
                                    }} 
                                    style={[styles.btnActionGreen, { backgroundColor: '#38BDF8', borderColor: '#0284C7' }]}
                                >
                                    <Feather name="upload-cloud" size={14} color="#0F172A" />
                                    <Text style={[styles.btnActionTextGreen, { color: '#0F172A' }]}>SUBMIT TO EVENT</Text>
                                </TouchableOpacity>
                            ) : onAirGapTransfer ? (
                                <TouchableOpacity onPress={() => { onAirGapTransfer(card); onClose(); }} style={styles.btnActionGreen}>
                                    <Feather name="share-2" size={14} color="#10B981" />
                                    <Text style={styles.btnActionTextGreen}>SHARE</Text>
                                </TouchableOpacity>
                            ) : (
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
                            )}
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
  corrodedBox: { borderColor: '#F59E0B', borderWidth: 2 },
  corrosionHeader: { backgroundColor: '#F59E0B', padding: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16, borderRadius: 4 },
  corrosionText: { color: '#000', fontWeight: 'bold', fontFamily: 'Courier', fontSize: 12, letterSpacing: 1 },
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
  // --- FRIDGE YIELD UI ---
  fridgeBox: { backgroundColor: '#0F172A', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#10B981', marginBottom: 20 },
  fridgeHeader: { fontFamily: 'Courier', fontWeight: 'bold', fontSize: 18, color: '#10B981', marginBottom: 4 },
  fridgeSub: { fontFamily: 'Courier', fontSize: 12, color: '#94A3B8', letterSpacing: 1, marginBottom: 15 },
  yieldBox: { backgroundColor: '#1E293B', padding: 15, borderRadius: 6, alignItems: 'center', marginBottom: 20 },
  yieldValue: { fontFamily: 'Courier', fontSize: 32, fontWeight: 'bold', color: '#F8FAFC' },
  yieldLabel: { fontFamily: 'Courier', fontSize: 12, color: '#94A3B8', marginTop: 4 },
  arbitrageBox: { padding: 15, borderRadius: 6, borderWidth: 1, borderColor: '#334155', marginBottom: 20 },
  arbitrageHeader: { fontFamily: 'Courier', fontWeight: 'bold', fontSize: 14, color: '#38BDF8', marginBottom: 4 },
  arbitrageSub: { fontFamily: 'Courier', fontSize: 10, color: '#94A3B8', marginBottom: 10, fontStyle: 'italic' },
  arbText: { fontFamily: 'Courier', fontSize: 12, color: '#E2E8F0', marginBottom: 4 },
  arbBarBg: { height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden' },
  arbBarFill: { height: '100%', borderRadius: 3 },
  recipeBox: { padding: 15, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: 6, borderWidth: 1, borderColor: '#047857' },
  recipeHeader: { fontFamily: 'Courier', fontWeight: 'bold', fontSize: 14, color: '#10B981', marginBottom: 10 },
  recipeItem: { paddingVertical: 4 },
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