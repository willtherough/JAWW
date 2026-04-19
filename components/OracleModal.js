import React, { useState, useMemo, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import SearchBar from './SearchBar';
import { getAllEvents, getCardsByEvent, deleteEvent, getAllCards, insertOrReplaceCard, deleteCard } from '../model/database';
import { aggregateListMacros } from '../utils/NutritionMath';
import { loadProfile } from '../model/Storage';
import { calculateDailyRequirements } from '../utils/BiologyEngine';
import { createCard } from '../model/Schema';
import MealPlannerModal from './MealPlannerModal';
import MealHistoryModal from './MealHistoryModal';
import WeeklyPlannerModal from './WeeklyPlannerModal';

export default function OracleModal({ visible, onClose, masterLibrary = [], funLibrary = [], groceryList = [], onSelect, onNavigate, onEndEvent, refreshTrigger }) {
  const [query, setQuery] = useState('');
  
  // --- NEW: EVENT STATE ---
  const [activeTab, setActiveTab] = useState('VAULT'); // 'VAULT', 'FRIDGE', 'HEALTH', 'ASSEMBLY'
  const [activeVaultMenu, setActiveVaultMenu] = useState(null); // 'CORE', 'FUN', or 'NUTRITION'
  const [events, setEvents] = useState([]);
  const [activeEventCards, setActiveEventCards] = useState(null); // Null = not looking at an event
  const [activeEventId, setActiveEventId] = useState(null); // Keep track of the active event ID
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isWeeklyPlannerVisible, setIsWeeklyPlannerVisible] = useState(false);

  const MASTER_TAGS = [
    'MEDICAL', 'SURVIVAL', 'TECH', 'PHYSIOLOGY', 
    'OUTDOORS', 'TRADES', 'DOMESTIC', 'FINANCE', 
    'BUSINESS', 'SCIENCE', 'CIVICS', 'LOGIC'
  ];

  const FUN_TAGS = [
    'SPORTS', 'NFL', 'SUPER BOWL', 'NCAA', 
    'NBA', 'MLB', 'NHL', 'UFC', 'RACING', 'NASCAR', 'LE MANS'
  ];

  const NUTRITION_TAGS = [
    'FOOD', 'NUTRIENTS', 'MACROS', 'VITAMINS', 'MINERALS'
  ];

  const library = [...masterLibrary, ...funLibrary];

  // --- PHASE 5: FRIDGE STATE ---
  const fridgeItems = useMemo(() => {
    return library.filter(c => c.subject && c.subject.startsWith('PURCHASE:'));
  }, [library]);

  const handleCheckPrices = () => {
    if (groceryList.length === 0) {
        Alert.alert("Store Node Broadcast", "Connected to Store Node. You have no items in your Assembly queue to estimate.");
        return;
    }

    let totalEstimate = 0;
    groceryList.forEach(item => {
        totalEstimate += (Math.random() * 8 + 3); // Random price between $3 and $11 per item
    });

    Alert.alert(
        "Store Node Broadcast Received",
        `Connected to Store Node: The Fresh Market\n\nCross-referenced public store prices with your local encrypted Assembly List.\n\nFound prices for ${groceryList.length} items.\n\nESTIMATED BILL: $${totalEstimate.toFixed(2)}\n\nThis calculation occurred on-device. The store does not know what is on your list.`,
        [{ text: "Acknowledge", style: "cancel" }]
    );
  };

  // --- PHASE 5: NUTRITION ARBITRAGE MATH ---
  const [bioGender, setBioGender] = useState('male');
  const [fullDailyReqs, setFullDailyReqs] = useState(null);
  const [todayMealCard, setTodayMealCard] = useState(null);
  const [isMealPlannerVisible, setIsMealPlannerVisible] = useState(false);
  const [isMealHistoryVisible, setIsMealHistoryVisible] = useState(false);
  const [localLibrary, setLocalLibrary] = useState([]);
  const [bioTargets, setBioTargets] = useState({
    workoutBurn: 0,
    maintain: { protein_g: 0, calories: 0, carbs_g: 0, fat_g: 0 },
    lose_2lbs: { protein_g: 0, calories: 0, carbs_g: 0, fat_g: 0 },
    gain_1lb: { protein_g: 0, calories: 0, carbs_g: 0, fat_g: 0 },
    sodium_mg: 2300
  });

  const listTotals = useMemo(() => aggregateListMacros(groceryList), [groceryList]);
  
  const mealTotals = useMemo(() => {
      if (!todayMealCard) return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0 };
      try {
          const parsed = JSON.parse(todayMealCard.body);
          return parsed.totals || { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0 };
      } catch(e) {
          return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sodium_mg: 0 };
      }
  }, [todayMealCard]);

  const handleSaveMealPlan = async (plan, totals) => {
      try {
          const profile = await loadProfile();
          if (!profile || !profile.publicKey) {
              Alert.alert("Error", "You need a complete Identity Dossier to author ledger cards.");
              return;
          }
          const todayDateStr = new Date().toLocaleDateString();
          const title = `Meals Eaten ${todayDateStr}`;
          const body = JSON.stringify({ plan, totals });
          const card = await createCard(
              profile.publicKey,
              title,
              body,
              ['health', 'nutrition'],
              'NUTRITION_LOG',
              profile.handle || 'Unknown',
              'standard'
          );
          
          // Prevent ledger bloat by deleting the old version of today's card before saving the updated one
          if (todayMealCard && todayMealCard.id) {
              await deleteCard(todayMealCard.id);
          }

          await insertOrReplaceCard(card);
          setTodayMealCard(card);
          Alert.alert("Saved", "Meal plan recorded to local ledger.");
      } catch (err) {
          console.error(err);
          Alert.alert("Error", "Failed to save meal plan.");
      }
  };

  const getBarColor = (current, target) => {
      if (!target || target === 0) return '#333';
      const pct = current / target;
      if (pct < 0.5) return '#EF4444'; // Red (Dangerously low)
      if (pct <= 1.1) return '#10B981'; // Green (Optimal)
      return '#EF4444'; // Red (Too high)
  };

  const getBarWidth = (current, target) => {
      if (!target || target === 0) return '0%';
      const pct = Math.min((current / target) * 100, 100);
      return `${pct}%`;
  };

  // --- NEW: FETCH EVENTS ON MOUNT ---
  useEffect(() => {
    const fetchBiology = async () => {
      const profile = await loadProfile();
      
      let activeWorkoutCard = null;
      const allCards = await getAllCards();
      
      if (profile && profile.schedule) {
          const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
          const scheduledWorkout = profile.schedule[today];
          if (scheduledWorkout && scheduledWorkout !== 'REST') {
              activeWorkoutCard = allCards.find(c => c.title === scheduledWorkout) || null;
          }
      }

      setLocalLibrary(allCards);

      // Check for today's meal plan card
      const todayDateStr = new Date().toLocaleDateString();
      const expectedTitle = `Meals Eaten ${todayDateStr}`;
      const foundMealCard = allCards.find(c => c.title === expectedTitle && c.subject === 'NUTRITION_LOG');
      setTodayMealCard(foundMealCard || null);

      const dailyReqs = calculateDailyRequirements(profile, activeWorkoutCard);
      if (dailyReqs) {
          setFullDailyReqs(dailyReqs);
          const req = dailyReqs[bioGender];
          if (req && req.maintain) {
             setBioTargets({
                workoutBurn: dailyReqs.workoutBurn || 0,
                maintain: req.maintain,
                lose_2lbs: req.lose_2lbs,
                gain_1lb: req.gain_1lb,
                sodium_mg: 2300
             });
          }
      }
    };

    if (visible) {
      loadEvents();
      fetchBiology();
    } else {
      // Reset when closed
      setActiveEventCards(null);
      setActiveEventId(null); // Reset active event ID
      setQuery('');
      setActiveTab('VAULT');
    }
  }, [visible]);

  useEffect(() => {
      if (fullDailyReqs) {
          const req = fullDailyReqs[bioGender];
          if (req && req.maintain) {
              setBioTargets({
                  workoutBurn: fullDailyReqs.workoutBurn || 0,
                  maintain: req.maintain,
                  lose_2lbs: req.lose_2lbs,
                  gain_1lb: req.gain_1lb,
                  sodium_mg: 2300
              });
          }
      }
  }, [bioGender, fullDailyReqs]);



  useEffect(() => {
    if (visible && activeEventId) {
        handleOpenEvent(activeEventId);
    }
  }, [refreshTrigger]);

  const loadEvents = async () => {
    setIsLoadingEvents(true);
    const dbEvents = await getAllEvents();
    setEvents(dbEvents);
    setIsLoadingEvents(false);
  };

  const handleOpenEvent = async (eventId) => {
    setIsLoadingEvents(true);
    setActiveEventId(eventId); // Set the active event ID
    const cards = await getCardsByEvent(eventId);
    setActiveEventCards(cards);
    setIsLoadingEvents(false);
  };

  const handleDeleteEvent = (eventId) => {
    Alert.alert(
      "Delete Assembly",
      "Are you sure you want to delete this assembly and all its intel?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteEvent(eventId);
            loadEvents();
          },
        },
      ]
    );
    };

  // --- INTERNAL FILTER LOGIC ---
  const results = useMemo(() => {
    // If we are looking inside an event folder, only filter those specific cards
    if (activeEventCards) {
        const q = query.toLowerCase().trim();
        if (!q) return activeEventCards;
        return activeEventCards.filter(card => 
            card.title.toLowerCase().includes(q) || 
            (card.topic && card.topic.toLowerCase().includes(q))
        );
    }

    // Otherwise, do the standard global library search
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const source = MASTER_TAGS.map(t => t.toLowerCase()).includes(q) 
        ? masterLibrary.filter(c => c.topic !== 'nutrition' && c.topic !== 'nutrient') 
        : FUN_TAGS.map(t => t.toLowerCase()).includes(q)
            ? funLibrary
            : NUTRITION_TAGS.map(t => t.toLowerCase()).includes(q)
                ? library.filter(c => c.topic === 'nutrition' || c.topic === 'nutrient')
                : library;

    // Handle Macro Queries from the giant buttons
    if (q === '#core') {
      return masterLibrary.filter(c => c.topic !== 'nutrition' && c.topic !== 'nutrient');
    }
    if (q === '#fun') {
      return funLibrary;
    }
    if (q === '#nutrition') {
      return library.filter(c => c.topic === 'nutrition' || c.topic === 'nutrient');
    }

    return source.filter(card => {
        if (activeTab === 'GROCERY_LIST' && card.topic !== 'nutrition' && card.topic !== 'nutrient') return false;

        const isMatch = card.title.toLowerCase().includes(q) || 
        (card.topic && card.topic.toLowerCase().includes(q)) ||
        (card.tags && card.tags.some(t => t.toLowerCase().includes(q))) ||
        (card.keywords && card.keywords.some(k => k.toLowerCase().includes(q)));
        
        return isMatch;
    });
  }, [library, query, masterLibrary, funLibrary, activeEventCards, activeTab]);


  // --- RENDER ITEMS ---
  const renderCardItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => onSelect(item)} 
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultCategory}>{item.topic || item.category || 'INTEL'}</Text>
      </View>
      <Text numberOfLines={2} style={styles.resultPreview}>
        {item.body}
      </Text>
    </TouchableOpacity>
  );

  const renderEventFolder = ({ item }) => (
    <TouchableOpacity 
      style={styles.folderItem}
      onPress={() => handleOpenEvent(item.id)} 
      onLongPress={() => handleDeleteEvent(item.id)}
    >
      <View style={styles.folderHeader}>
        <Text style={styles.folderIcon}>{item.is_umpire === 1 ? '👑' : '📁'}</Text>
        <View>
          <Text style={styles.folderTitle}>{item.name}</Text>
          <Text style={styles.folderDate}>
             {new Date(item.timestamp * 1000).toLocaleDateString()} // ID: {item.id.split(':')[1]}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {activeEventCards ? '// ASSEMBLY DEBRIEF' : 'ORACLE ENGINE'}
          </Text>
          {activeEventCards ? (
            <View style={{flexDirection: 'row'}}>
                <TouchableOpacity onPress={() => onEndEvent()}>
                    <Text style={[styles.headerStatus, {color: '#ff0000', marginRight: 10}]}>[ END EVENT ]</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveEventCards(null)}>
                  <Text style={styles.headerStatus}>[ CLOSE FOLDER ]</Text>
                </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.headerStatus}>// ONLINE</Text>
          )}
        </View>

        {/* SEARCH INPUT */}
        <View style={styles.searchContainer}>
            <SearchBar 
                value={query}
                onChangeText={setQuery}
                onClear={() => setQuery('')}
            />
        </View>

        {/* CONTENT AREA */}
        <View style={styles.content}>
            {isLoadingEvents ? (
                <ActivityIndicator size="large" color="#00ffff" style={{marginTop: 50}} />
            ) : activeEventCards ? (
                // --- VIEWING INSIDE A FOLDER ---
                <FlatList 
                    data={results}
                    keyExtractor={item => item.id}
                    renderItem={renderCardItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={<Text style={styles.emptyText}>No intel found in this assembly.</Text>}
                />
            ) : query.trim() !== '' ? (
                // --- VIEWING GLOBAL SEARCH RESULTS ---
                <FlatList 
                    data={results}
                    keyExtractor={item => item.id}
                    renderItem={renderCardItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                />
            ) : (
                // --- DEFAULT EMPTY STATE (TABS) ---
                <View style={{flex: 1}}>
                    {/* Tab Navigation */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'VAULT' && styles.activeTabBtn]}
                            onPress={() => setActiveTab('VAULT')}
                        >
                            <Text style={[styles.tabText, activeTab === 'VAULT' && styles.activeTabText]}>VAULT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'FRIDGE' && styles.activeTabBtn]}
                            onPress={() => setActiveTab('FRIDGE')}
                        >
                            <Text style={[styles.tabText, activeTab === 'FRIDGE' && styles.activeTabText]}>FRIDGE</Text>
                        </TouchableOpacity>
                                <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'HEALTH' && styles.activeTabBtn]} 
                            onPress={() => { setActiveTab('HEALTH'); setActiveEventCards(null); setActiveEventId(null); setQuery(''); }}
                        >
                            <Feather name="activity" size={14} color={activeTab === 'HEALTH' ? '#10B981' : '#64748B'} style={{marginRight: 4}} />
                            <Text style={[styles.tabText, activeTab === 'HEALTH' && styles.activeTabText]}>HEALTH</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'ASSEMBLY' && styles.activeTabBtn]}
                            onPress={() => setActiveTab('ASSEMBLY')}
                        >
                            <Text style={[styles.tabText, activeTab === 'ASSEMBLY' && styles.activeTabText]}>ASSEMBLY</Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'VAULT' ? (
                        <View style={styles.emptyState}>
                            {activeVaultMenu === null ? (
                                <>
                                    <TouchableOpacity style={styles.macroBtn} onPress={() => setActiveVaultMenu('CORE')}>
                                        <Feather name="database" size={24} color="#00ffff" style={{ marginBottom: 8 }} />
                                        <Text style={styles.macroBtnText}>CORE KNOWLEDGE</Text>
                                        <Text style={styles.macroBtnSub}>{masterLibrary.filter(c => c.topic !== 'nutrition' && c.topic !== 'nutrient').length} Nodes Available</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.macroBtn, { borderColor: '#33ff00' }]} onPress={() => setActiveVaultMenu('FUN')}>
                                        <Feather name="play-circle" size={24} color="#33ff00" style={{ marginBottom: 8 }} />
                                        <Text style={[styles.macroBtnText, { color: '#33ff00' }]}>RECREATIONAL & SPECIAL INTEREST</Text>
                                        <Text style={styles.macroBtnSub}>{funLibrary.length} Nodes Available</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity style={[styles.macroBtn, { borderColor: '#F59E0B' }]} onPress={() => setActiveVaultMenu('NUTRITION')}>
                                        <Feather name="activity" size={24} color="#F59E0B" style={{ marginBottom: 8 }} />
                                        <Text style={[styles.macroBtnText, { color: '#F59E0B' }]}>NUTRITION</Text>
                                        <Text style={styles.macroBtnSub}>{library.filter(c => c.topic === 'nutrition' || c.topic === 'nutrient').length} Nodes Available</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={{ width: '100%', alignItems: 'center' }}>
                                    <TouchableOpacity style={styles.backBtn} onPress={() => setActiveVaultMenu(null)}>
                                        <Feather name="chevron-left" size={16} color="#94A3B8" />
                                        <Text style={styles.backBtnText}>BACK TO MENUS</Text>
                                    </TouchableOpacity>

                                    {activeVaultMenu === 'CORE' && (
                                        <>
                                            <Text style={styles.sectionTitle}>// CORE KNOWLEDGE</Text>
                                            <View style={styles.tagCloud}>
                                                {MASTER_TAGS.map(tag => (
                                                    <TouchableOpacity key={tag} style={styles.tagPill} onPress={() => setQuery(tag)}>
                                                        <Text style={styles.tagText}>{tag}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </>
                                    )}

                                    {activeVaultMenu === 'FUN' && (
                                        <>
                                            <Text style={styles.sectionTitle}>// RECREATIONAL & SPECIAL INTEREST</Text>
                                            <View style={styles.tagCloud}>
                                                {FUN_TAGS.map(tag => (
                                                    <TouchableOpacity key={tag} style={[styles.tagPill, { borderColor: '#33ff00' }]} onPress={() => setQuery(tag)}>
                                                        <Text style={[styles.tagText, { color: '#33ff00' }]}>{tag}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </>
                                    )}

                                    {activeVaultMenu === 'NUTRITION' && (
                                        <>
                                            <Text style={styles.sectionTitle}>// NUTRITION</Text>
                                            <View style={styles.tagCloud}>
                                                {NUTRITION_TAGS.map(tag => (
                                                    <TouchableOpacity key={tag} style={[styles.tagPill, { borderColor: '#F59E0B' }]} onPress={() => setQuery(tag)}>
                                                        <Text style={[styles.tagText, { color: '#F59E0B' }]}>{tag}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </>
                                    )}
                                </View>
                            )}
                        </View>
                    ) : activeTab === 'FRIDGE' ? (
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>// INVENTORY & PURCHASES</Text>
                            
                            <View style={[styles.arbitrageAlert, { marginBottom: 15 }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <Feather name="share-2" size={16} color="#F59E0B" />
                                    <Text style={styles.arbitrageTitle}>ARBITRAGE & PRICING</Text>
                                </View>
                                <Text style={styles.arbitrageText}>
                                    Share Nutritional Pricing with those around you to compare pricing for your nutritional needs. This will allow users to share the items they purchase with you as they walk by...
                                </Text>
                                <TouchableOpacity style={styles.btnSwap} onPress={() => Alert.alert("Broadcasting", "Broadcasting local nutritional pricing to nearby nodes...")}>
                                    <Text style={styles.btnSwapText}>BROADCAST PRICING</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList 
                                data={fridgeItems}
                                keyExtractor={item => item.id}
                                renderItem={({ item }) => {
                                    let details = { store: 'Unknown', price: 0, date: '' };
                                    try { details = JSON.parse(item.body); } catch(e) {}
                                    
                                    return (
                                        <View style={styles.resultItem}>
                                            <View style={styles.resultHeader}>
                                                <Text style={styles.resultTitle}>{item.title}</Text>
                                                <Text style={styles.resultCategory}>${details.price} @ {details.store}</Text>
                                            </View>
                                            <Text style={styles.resultPreview}>{new Date(details.date || item.timestamp).toLocaleDateString()}</Text>
                                        </View>
                                    );
                                }}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyText}>No receipt purchases found in your Fridge.</Text>
                                    </View>
                                }
                            />

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                                <TouchableOpacity style={[styles.footBtnMain, { flex: 1 }]} onPress={() => onNavigate('scan_receipt')}>
                                    <Text style={styles.footTextMain}>SCAN RECEIPT</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : activeTab === 'HEALTH' ? (
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>// BIOLOGICAL RADAR</Text>
                            
                            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 15, marginTop: 10, gap: 10 }}>
                                <TouchableOpacity 
                                    style={[styles.footBtnMain, { flex: 1, backgroundColor: bioGender === 'male' ? '#10B981' : '#001', borderColor: bioGender === 'male' ? '#10B981' : '#38BDF8' }]}
                                    onPress={() => setBioGender('male')}
                                >
                                    <Text style={[styles.footTextMain, { color: bioGender === 'male' ? '#000' : '#38BDF8' }]}>MALE CALC</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.footBtnMain, { flex: 1, backgroundColor: bioGender === 'female' ? '#10B981' : '#001', borderColor: bioGender === 'female' ? '#10B981' : '#38BDF8' }]}
                                    onPress={() => setBioGender('female')}
                                >
                                    <Text style={[styles.footTextMain, { color: bioGender === 'female' ? '#000' : '#38BDF8' }]}>FEMALE CALC</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Biological Targets */}
                            {bioTargets.workoutBurn > 0 && (
                                <Text style={[styles.sectionTitle, { color: '#10B981', textAlign: 'center', marginBottom: 10 }]}>+ {bioTargets.workoutBurn} KCAL ACTIVE BURN DETECTED</Text>
                            )}
                            <View style={styles.radarMetrics}>
                                <View style={[styles.metricRow, { backgroundColor: '#1E293B', padding: 10, borderRadius: 5, marginBottom: 5, borderLeftWidth: 3, borderColor: '#38BDF8' }]}>
                                    <Text style={styles.metricLabel}>MAINTAIN WEIGHT (TDEE)</Text>
                                    <Text style={[styles.metricValue, { color: '#00ffff' }]}>{bioTargets.maintain.calories} kcal | {bioTargets.maintain.protein_g}g Pro</Text>
                                </View>
                                <View style={[styles.metricRow, { backgroundColor: '#1E293B', padding: 10, borderRadius: 5, marginBottom: 5, borderLeftWidth: 3, borderColor: '#F59E0B' }]}>
                                    <Text style={styles.metricLabel}>LOSE 2 LBS / WEEK</Text>
                                    <Text style={[styles.metricValue, { color: '#F59E0B' }]}>{bioTargets.lose_2lbs.calories} kcal | {bioTargets.lose_2lbs.protein_g}g Pro</Text>
                                </View>
                                <View style={[styles.metricRow, { backgroundColor: '#1E293B', padding: 10, borderRadius: 5, marginBottom: 5, borderLeftWidth: 3, borderColor: '#10B981' }]}>
                                    <Text style={styles.metricLabel}>GAIN 1 LB / WEEK</Text>
                                    <Text style={[styles.metricValue, { color: '#10B981' }]}>{bioTargets.gain_1lb.calories} kcal | {bioTargets.gain_1lb.protein_g}g Pro</Text>
                                </View>
                            </View>

                            {/* Visual Progress Bars */}
                            <Text style={[styles.sectionTitle, { marginTop: 15 }]}>// DAILY INTAKE PROGRESS (MEAL PLAN)</Text>
                            <View style={[styles.radarMetrics, { gap: 12 }]}>
                                {/* CALORIES */}
                                <View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={styles.metricLabel}>CALORIES</Text>
                                        <Text style={styles.metricValue}>{mealTotals.calories} / {bioTargets.maintain.calories} kcal</Text>
                                    </View>
                                    <View style={{ height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' }}>
                                        <View style={{ height: '100%', width: getBarWidth(mealTotals.calories, bioTargets.maintain.calories), backgroundColor: getBarColor(mealTotals.calories, bioTargets.maintain.calories) }} />
                                    </View>
                                </View>
                                {/* PROTEIN */}
                                <View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={styles.metricLabel}>PROTEIN</Text>
                                        <Text style={styles.metricValue}>{mealTotals.protein_g} / {bioTargets.maintain.protein_g} g</Text>
                                    </View>
                                    <View style={{ height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' }}>
                                        <View style={{ height: '100%', width: getBarWidth(mealTotals.protein_g, bioTargets.maintain.protein_g), backgroundColor: getBarColor(mealTotals.protein_g, bioTargets.maintain.protein_g) }} />
                                    </View>
                                </View>
                                {/* CARBS */}
                                <View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={styles.metricLabel}>CARBS</Text>
                                        <Text style={styles.metricValue}>{mealTotals.carbs_g} / {bioTargets.maintain.carbs_g} g</Text>
                                    </View>
                                    <View style={{ height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' }}>
                                        <View style={{ height: '100%', width: getBarWidth(mealTotals.carbs_g, bioTargets.maintain.carbs_g), backgroundColor: getBarColor(mealTotals.carbs_g, bioTargets.maintain.carbs_g) }} />
                                    </View>
                                </View>
                                {/* FATS */}
                                <View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <Text style={styles.metricLabel}>FATS</Text>
                                        <Text style={styles.metricValue}>{mealTotals.fat_g} / {bioTargets.maintain.fat_g} g</Text>
                                    </View>
                                    <View style={{ height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' }}>
                                        <View style={{ height: '100%', width: getBarWidth(mealTotals.fat_g, bioTargets.maintain.fat_g), backgroundColor: getBarColor(mealTotals.fat_g, bioTargets.maintain.fat_g) }} />
                                    </View>
                                </View>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 10 }}>
                                <TouchableOpacity 
                                    style={[styles.footBtnMain, { flex: 1, borderColor: '#38BDF8', backgroundColor: '#001' }]} 
                                    onPress={() => setIsMealPlannerVisible(true)}
                                >
                                    <Text style={[styles.footTextMain, { color: '#38BDF8', fontSize: 12 }]}>+ PLAN TODAY</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.footBtnMain, { flex: 1, borderColor: '#10B981', backgroundColor: '#001a0f' }]} 
                                    onPress={() => setIsWeeklyPlannerVisible(true)}
                                >
                                    <Text style={[styles.footTextMain, { color: '#10B981', fontSize: 12 }]}>AUTO-PLAN WEEK</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.footBtnMain, { flex: 1, borderColor: '#F59E0B', backgroundColor: '#1a0f00' }]} 
                                    onPress={() => setIsMealHistoryVisible(true)}
                                >
                                    <Text style={[styles.footTextMain, { color: '#F59E0B', fontSize: 12 }]}>HISTORY</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <FlatList 
                            data={events}
                            keyExtractor={item => item.id}
                            renderItem={renderEventFolder}
                            contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}
                            ListEmptyComponent={<Text style={styles.emptyText}>No assemblies recorded.</Text>}
                        />
                    )}
                </View>
            )}
        </View>

        {/* --- FOOTER NAVIGATION --- */}
        <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.footBtn}>
                <Text style={styles.footText}>DASHBOARD</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('scan')} style={styles.footBtn}>
                <Text style={styles.footText}>SCAN QR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('create')} style={styles.footBtnMain}>
                <Text style={styles.footTextMain}>+ CREATE</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onNavigate('radar')} style={styles.footBtn}>
                <Text style={styles.footText}>RADAR</Text>
            </TouchableOpacity>
        </View>

        <MealPlannerModal 
            visible={isMealPlannerVisible}
            onClose={() => setIsMealPlannerVisible(false)}
            fridgeItems={fridgeItems}
            masterLibrary={masterLibrary}
            localLibrary={localLibrary}
            onSavePlan={handleSaveMealPlan}
            initialPlanJson={todayMealCard ? todayMealCard.body : null}
        />

        <MealHistoryModal
            visible={isMealHistoryVisible}
            onClose={() => setIsMealHistoryVisible(false)}
            localLibrary={localLibrary}
            bioTargets={bioTargets}
        />
        <WeeklyPlannerModal
            visible={isWeeklyPlannerVisible}
            onClose={() => setIsWeeklyPlannerVisible(false)}
            localLibrary={localLibrary}
            bioTargets={bioTargets}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: Platform.OS === 'android' ? 20 : 0
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  headerTitle: {
    color: '#00ffff', 
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Courier',
    letterSpacing: 1,
  },
  headerStatus: { 
    color: '#00ff00', 
    fontFamily: 'Courier', 
    fontSize: 10 
  },
  searchContainer: {
    paddingVertical: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // --- TABS ---
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTabBtn: {
    borderBottomWidth: 2,
    borderBottomColor: '#00ffff',
  },
  tabText: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#00ffff',
  },
  // --- RESULT ITEMS ---
  resultItem: {
    backgroundColor: '#111',
    marginBottom: 10,
    padding: 15,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: '#00ffff',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  resultTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  resultCategory: {
    color: '#00ffff',
    fontSize: 10,
    fontFamily: 'Courier',
    marginTop: 2,
    marginLeft: 10,
  },
  resultPreview: {
    color: '#888',
    fontSize: 12,
  },
  // --- FOLDER ITEMS ---
  folderItem: {
    backgroundColor: '#0a0a0a',
    marginBottom: 10,
    padding: 15,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  folderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  folderIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  folderTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Courier',
  },
  folderDate: {
    color: '#666',
    fontSize: 10,
    fontFamily: 'Courier',
    marginTop: 4,
  },
  statLabel: { color: '#888', fontSize: 10, fontFamily: 'Courier', textAlign: 'center' },
  statValue: { color: '#00ff00', fontSize: 16, fontFamily: 'Courier', fontWeight: 'bold', textAlign: 'center' },
  macroBtn: {
    width: '100%',
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#00ffff',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  macroBtnText: {
    color: '#00ffff',
    fontFamily: 'Courier',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  macroBtnSub: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: 12,
    marginTop: 8,
  },
  emptyText: {
    color: '#666',
    fontFamily: 'Courier',
    textAlign: 'center',
    marginTop: 40,
  },
  // --- EMPTY STATE (TOPICS) ---
  emptyState: {
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#444',
    fontFamily: 'Courier',
    marginBottom: 20,
    fontSize: 12,
  },
  tagCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  tagPill: {
    backgroundColor: '#002222',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#004444',
  },
  tagText: {
    color: '#00ffff',
    fontSize: 12,
    fontFamily: 'Courier',
    fontWeight: 'bold',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#0F172A',
  },
  backBtnText: {
    color: '#94A3B8',
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  statsText: {
    color: '#333',
    marginTop: 50,
    fontFamily: 'Courier',
    fontSize: 10,
  },
  // --- FOOTER STYLES ---
  footer: {
    flexDirection: 'row',
    height: 80,
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 10,
  },
  footBtn: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1, 
    height: '100%' 
  },
  footText: { 
    color: '#666', 
    fontSize: 10, 
    fontFamily: 'Courier', 
    fontWeight: 'bold' 
  },
  footBtnMain: {
    backgroundColor: '#003300',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00ff00',
  },
  footTextMain: { color: '#00ff00', fontWeight: 'bold', fontSize: 14, fontFamily: 'Courier' },
  // --- RADAR UI ---
  radarMetrics: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  metricLabel: {
    color: '#888',
    fontFamily: 'Courier',
    fontSize: 12
  },
  metricValue: {
    fontFamily: 'Courier',
    fontSize: 12,
    fontWeight: 'bold'
  },
  arbitrageAlert: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20
  },
  arbitrageTitle: {
    color: '#F59E0B',
    fontFamily: 'Courier',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 8
  },
  arbitrageText: {
    color: '#CBD5E1',
    fontFamily: 'Courier',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12
  },
  btnSwap: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B'
  },
  btnSwapText: {
    color: '#F59E0B',
    fontFamily: 'Courier',
    fontWeight: 'bold',
    fontSize: 12
  }
});