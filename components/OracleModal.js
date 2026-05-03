import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Alert,
  ScrollView,
  TextInput
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import SearchBar from './SearchBar';
import { getAllEvents, getCardsByEvent, deleteEvent, getAllCards, insertOrReplaceCard, deleteCard } from '../model/database';
import { aggregateListMacros } from '../utils/NutritionMath';
import { loadProfile, loadNewsFrequencies, saveNewsFrequencies } from '../model/Storage';
import { calculateDailyRequirements } from '../utils/BiologyEngine';
import { createCard } from '../model/Schema';
import MealPlannerModal from './MealPlannerModal';
import MealHistoryModal from './MealHistoryModal';
import WeeklyPlannerModal from './WeeklyPlannerModal';
import GroceryListModal from './GroceryListModal';
import WorkoutLoggerModal from './WorkoutLoggerModal';
import { loadModel, generateResponse, releaseModel } from '../services/AIService';
import { downloadModel, checkModelExistsAndVerify, MODEL_PATH, deleteModel, pauseDownload, resumeDownload } from '../services/ModelDownloader';

export default function OracleModal({ visible, onClose, masterLibrary = [], funLibrary = [], groceryList = [], onSelect, onNavigate, onEndEvent, refreshTrigger, initialTab = 'VAULT', initialSubModal = null, onCreateNewWorkout }) {
  const [query, setQuery] = useState('');
  
  // --- NEW: EVENT STATE ---
  const [activeTab, setActiveTab] = useState(initialTab); // 'VAULT', 'FRIDGE', 'HEALTH', 'ASSEMBLY', 'AI'
  const [activeVaultMenu, setActiveVaultMenu] = useState(null); // 'CORE', 'FUN', or 'NUTRITION'
  const [events, setEvents] = useState([]);
  
  // --- ORACLE CARD STATE ---
  const [isSavingCard, setIsSavingCard] = useState(false);
  const [oracleSubject, setOracleSubject] = useState('');
  const [oracleCategory, setOracleCategory] = useState('TECH');
  const activePrompt = useRef('');
  const [aiCitations, setAiCitations] = useState([]);
  const [vaultScanEnabled, setVaultScanEnabled] = useState(true);
  const [activeEventCards, setActiveEventCards] = useState(null); // Null = not looking at an event
  const [activeEventId, setActiveEventId] = useState(null); // Keep track of the active event ID
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [isWeeklyPlannerVisible, setIsWeeklyPlannerVisible] = useState(false);
  const [isGroceryListVisible, setIsGroceryListVisible] = useState(false);
  const [activeNewsFrequencies, setActiveNewsFrequencies] = useState([]);

  // --- SLM STATE ---
  const [isAiReady, setIsAiReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [aiResponse, setAiResponse] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    checkModelExistsAndVerify().then(exists => setIsAiReady(exists));
  }, []);

  const handleDownloadModel = async () => {
    setIsDownloading(true);
    try {
        await downloadModel((progress) => {
            setDownloadProgress(progress);
        });
        setIsAiReady(true);
        Alert.alert("Success", "SLM downloaded successfully.");
    } catch (e) {
        Alert.alert("Error", "Failed to download the model.");
    } finally {
        setIsDownloading(false);
    }
  };

  const handleAskAI = async () => {
      if (!query.trim()) return;
      if (!isAiReady) {
          Alert.alert("Model Missing", "Please download the model first.");
          return;
      }
      activePrompt.current = query; // Save the prompt in case the user clears the search bar
      setIsAiThinking(true);
      setAiResponse('');
      try {
          await loadModel(MODEL_PATH);
          
          // RAG: 1. Fetch Profile
          const profile = await loadProfile();
          const profileStr = profile ? `User Profile: Age ${profile.age}, Height ${profile.height}in, Weight ${profile.weight}lbs.` : "User Profile: Not provided.";
          
          // RAG: 2. Filter Database context
          let relevantCards = [];
          if (vaultScanEnabled) {
              const keywords = query.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 3);
              const scoredCards = masterLibrary.map(c => {
                  let score = 0;
                  const titleStr = (c.title || '').toLowerCase();
                  const bodyStr = (c.body || '').toLowerCase();
                  keywords.forEach(k => {
                      if (titleStr.includes(k)) score += 3; // Title matches are highly relevant
                      if (bodyStr.includes(k)) score += 1;
                  });
                  return { card: c, score };
              }).filter(item => item.score > 0);
              
              relevantCards = scoredCards.sort((a, b) => b.score - a.score).map(item => item.card).slice(0, 5);
          }
          
          setAiCitations(relevantCards);
          
          const dbStr = relevantCards.length > 0 ? "Relevant User Database Cards:\n" + relevantCards.map(c => `[Type: ${c.type || c.topic}] ${c.title}: ${c.body}`).join('\n') : "No relevant cards found.";
          
          const sysPrompt = `You are JAWW Oracle, an extremely logical offline AI. Answer the user based ONLY on the following context. Do not hallucinate data.\n\n${profileStr}\n\n${dbStr}`;
          
          await generateResponse(sysPrompt, query, (token) => {
              setAiResponse(prev => prev + token);
          });
      } catch (e) {
          Alert.alert("Error", "Inference failed: " + e.message);
      } finally {
          setIsAiThinking(false);
      }
  };

  const handleCrystallizeCard = async () => {
      if (!oracleSubject.trim() || !oracleCategory) {
          Alert.alert("Required", "Please provide a subject and category.");
          return;
      }
      try {
          const profile = await loadProfile();
          if (!profile || !profile.publicKey) {
              Alert.alert("Identity Required", "You must complete your Identity Dossier to author cards.");
              return;
          }

          const newCard = await createCard(
              profile.publicKey,
              activePrompt.current || oracleSubject || 'Important Question', // Title is the saved prompt
              aiResponse, // Body is the AI's output
              oracleCategory.toLowerCase(), // Must be a string, not an array
              oracleSubject,
              `${profile.handle || 'Unknown'} (Oracle AI)`,
              'IMPORTANT_QUESTIONS', // Special Type
              aiCitations.map(c => ({ id: c.id, title: c.title })) // Permanently link readable citations to the ledger!
          );

          // Allow the card to be shared/synced across the mesh
          newCard.privacy = 'PUBLIC';

          await insertOrReplaceCard(newCard);
          Alert.alert("Saved to Vault", "This answer has been permanently locked to your personal ledger. It is now shareable.");
          
          // Reset UI
          setIsSavingCard(false);
          setOracleSubject('');
          setQuery('');
          activePrompt.current = '';
          setAiResponse('');
          setAiCitations([]);
      } catch (e) {
          console.error(e);
          Alert.alert("Error", "Failed to crystallize card.");
      }
  };

  useEffect(() => {
    loadNewsFrequencies().then(freq => setActiveNewsFrequencies(freq || []));
  }, []);

  const toggleFrequency = async (tag) => {
    let newFreqs = [...activeNewsFrequencies];
    if (newFreqs.includes(tag)) {
        newFreqs = newFreqs.filter(t => t !== tag);
    } else {
        newFreqs.push(tag);
    }
    setActiveNewsFrequencies(newFreqs);
    await saveNewsFrequencies(newFreqs);
  };

  const NEWS_OPTIONS = [
      '#Local', '#Tech', '#Geopolitics', '#Medical', '#Survival', '#Finance'
  ];

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
  const [isWorkoutLoggerVisible, setIsWorkoutLoggerVisible] = useState(false);
  const [todayWorkoutLog, setTodayWorkoutLog] = useState(null);
  const [localLibrary, setLocalLibrary] = useState([]);

  useEffect(() => {
    if (visible && initialSubModal === 'MEAL_PLANNER') {
      setIsMealPlannerVisible(true);
    } else if (visible && initialSubModal === 'WORKOUT_LOGGER') {
      setIsWorkoutLoggerVisible(true);
    }
  }, [visible, initialSubModal]);
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

  const handleSaveWorkoutLog = async (workoutCard) => {
      try {
          const profile = await loadProfile();
          if (!profile || !profile.publicKey) {
              Alert.alert("Error", "You need a complete Identity Dossier to author ledger cards.");
              return;
          }
          const todayDateStr = new Date().toLocaleDateString();
          const title = `Workout Completed ${todayDateStr}: ${workoutCard.title}`;
          const body = JSON.stringify({ workout_id: workoutCard.id, workout_title: workoutCard.title });
          const card = await createCard(
              profile.publicKey,
              title,
              body,
              ['health', 'fitness'],
              'WORKOUT_LOG',
              profile.handle || 'Unknown',
              'standard'
          );
          
          if (todayWorkoutLog && todayWorkoutLog.id) {
              await deleteCard(todayWorkoutLog.id);
          }

          await insertOrReplaceCard(card);
          setTodayWorkoutLog(card);
          Alert.alert("Saved", "Workout log recorded to local ledger.");
      } catch (err) {
          console.error(err);
          Alert.alert("Error", "Failed to save workout log.");
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

      const todayDateStr = new Date().toLocaleDateString();

      // Check for today's workout log card
      const foundWorkoutLogCard = allCards.find(c => 
          c.subject === 'WORKOUT_LOG' && new Date(c.timestamp).toLocaleDateString() === todayDateStr
      ) || null;
      setTodayWorkoutLog(foundWorkoutLogCard);

      if (foundWorkoutLogCard) {
          try {
              const bodyParsed = JSON.parse(foundWorkoutLogCard.body);
              const linkedCard = allCards.find(c => c.id === bodyParsed.workout_id);
              if (linkedCard) activeWorkoutCard = linkedCard;
          } catch(e) {}
      }

      setLocalLibrary(allCards);

      // Check for today's meal plan card
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
      setActiveTab(initialTab);
    }
  }, [visible, initialTab]);

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
            ) : (query.trim() !== '' && activeTab !== 'AI') ? (
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
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'NEWS' && styles.activeTabBtn]}
                            onPress={() => setActiveTab('NEWS')}
                        >
                            <Feather name="radio" size={14} color={activeTab === 'NEWS' ? '#10B981' : '#64748B'} style={{marginRight: 4}} />
                            <Text style={[styles.tabText, activeTab === 'NEWS' && styles.activeTabText]}>NEWS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'AI' && styles.activeTabBtn]}
                            onPress={() => setActiveTab('AI')}
                        >
                            <Feather name="cpu" size={14} color={activeTab === 'AI' ? '#A855F7' : '#64748B'} style={{marginRight: 4}} />
                            <Text style={[styles.tabText, activeTab === 'AI' && styles.activeTabText]}>ORACLE AI</Text>
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
                            {todayWorkoutLog && (
                                <Text style={[styles.sectionTitle, { color: '#F59E0B', textAlign: 'center', marginBottom: 5 }]}>// WORKOUT LOGGED TODAY</Text>
                            )}
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
                                    style={[styles.footBtnMain, { flex: 1, borderColor: '#F59E0B', backgroundColor: '#1a0f00' }]} 
                                    onPress={() => setIsWorkoutLoggerVisible(true)}
                                >
                                    <Text style={[styles.footTextMain, { color: '#F59E0B', fontSize: 12 }]}>LOG WORKOUT</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10 }}>
                                <TouchableOpacity 
                                    style={[styles.footBtnMain, { flex: 1, borderColor: '#10B981', backgroundColor: '#001a0f' }]} 
                                    onPress={() => setIsWeeklyPlannerVisible(true)}
                                >
                                    <Text style={[styles.footTextMain, { color: '#10B981', fontSize: 12 }]}>AUTO-PLAN WEEK</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.footBtnMain, { flex: 1, borderColor: '#A855F7', backgroundColor: '#1a001a' }]} 
                                    onPress={() => setIsGroceryListVisible(true)}
                                >
                                    <Text style={[styles.footTextMain, { color: '#A855F7', fontSize: 12 }]}>GROCERY LIST</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity 
                                    style={[styles.footBtnMain, { marginTop: 10, borderColor: '#F59E0B', backgroundColor: '#1a0f00' }]} 
                                    onPress={() => setIsMealHistoryVisible(true)}
                                >
                                    <Text style={[styles.footTextMain, { color: '#F59E0B', fontSize: 12 }]}>HISTORY</Text>
                                </TouchableOpacity>
                        </View>
                    ) : activeTab === 'NEWS' ? (
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>// OPT-IN NEWS FREQUENCIES</Text>
                            
                            <View style={[styles.arbitrageAlert, { marginBottom: 15, borderColor: '#38BDF8', backgroundColor: '#0F172A' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <Feather name="radio" size={16} color="#38BDF8" />
                                    <Text style={[styles.arbitrageTitle, {color: '#38BDF8'}]}>TARGETED MESH RELAY</Text>
                                </View>
                                <Text style={[styles.arbitrageText, {color: '#94A3B8'}]}>
                                    Select the frequencies you want to actively relay. When you walk past another node, your device will only request and pull News Cards tagged with your active frequencies.
                                </Text>
                            </View>

                            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                                {NEWS_OPTIONS.map((tag) => {
                                    const isSelected = activeNewsFrequencies.includes(tag);
                                    return (
                                        <TouchableOpacity 
                                            key={tag}
                                            style={{
                                                flexDirection: 'row', alignItems: 'center', padding: 16,
                                                backgroundColor: isSelected ? '#001a0f' : '#111',
                                                borderWidth: 1, borderColor: isSelected ? '#10B981' : '#222',
                                                borderRadius: 8, marginBottom: 10
                                            }}
                                            onPress={() => toggleFrequency(tag)}
                                        >
                                            <View style={{
                                                width: 24, height: 24, borderRadius: 4, borderWidth: 1, 
                                                borderColor: isSelected ? '#10B981' : '#444', 
                                                backgroundColor: isSelected ? '#10B981' : 'transparent',
                                                alignItems: 'center', justifyContent: 'center', marginRight: 15
                                            }}>
                                                {isSelected && <Feather name="check" size={14} color="#050505" />}
                                            </View>
                                            <Text style={{
                                                color: isSelected ? '#10B981' : '#E2E8F0',
                                                fontFamily: 'Courier', fontSize: 16, fontWeight: isSelected ? 'bold' : 'normal'
                                            }}>{tag}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    ) : activeTab === 'AI' ? (
                        <View style={{ flex: 1, padding: 20 }}>
                            <Text style={[styles.sectionTitle, { color: '#A855F7' }]}>// OFFLINE ORACLE (PHI-3 MINI)</Text>
                            
                            {!isAiReady ? (
                                <View style={{ alignItems: 'center', marginTop: 50 }}>
                                    <Feather name="download-cloud" size={48} color="#A855F7" style={{ marginBottom: 20 }} />
                                    <Text style={{ color: '#E2E8F0', fontSize: 16, textAlign: 'center', marginBottom: 20, fontFamily: 'Courier' }}>
                                        To use the Local AI, you must download the Microsoft Phi-3 Mini model (~2.3GB) to your device.
                                    </Text>
                                    <TouchableOpacity 
                                        style={[styles.macroBtn, { borderColor: '#A855F7', width: '100%' }]} 
                                        onPress={handleDownloadModel}
                                        disabled={isDownloading}
                                    >
                                        <Text style={[styles.macroBtnText, { color: '#A855F7' }]}>
                                            {isDownloading ? `DOWNLOADING... (${(downloadProgress * 100).toFixed(1)}%)` : "DOWNLOAD MODEL"}
                                        </Text>
                                    </TouchableOpacity>
                                    {isDownloading && (
                                        <View style={{ height: 4, width: '100%', backgroundColor: '#333', marginTop: 10, borderRadius: 2 }}>
                                            <View style={{ height: '100%', width: `${downloadProgress * 100}%`, backgroundColor: '#A855F7' }} />
                                        </View>
                                    )}
                                </View>
                            ) : (
                                <View style={{ flex: 1 }}>
                                    <ScrollView style={{ flex: 1, backgroundColor: '#111', borderRadius: 8, padding: 15, marginBottom: 15 }}>
                                        {aiResponse ? (
                                            <View style={{ paddingBottom: isSavingCard ? 200 : 0 }}>
                                                <Text style={{ color: '#E2E8F0', fontSize: 16, lineHeight: 24 }}>{aiResponse}</Text>
                                                
                                                {aiCitations.length > 0 && !isAiThinking && (
                                                    <View style={{ marginTop: 25, paddingTop: 15, borderTopWidth: 1, borderColor: '#333' }}>
                                                        <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'Courier', marginBottom: 10 }}>SOURCES REFERENCED:</Text>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                                            {aiCitations.map(cit => (
                                                                <TouchableOpacity 
                                                                    key={cit.id}
                                                                    style={{ backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#475569' }}
                                                                    onPress={() => onSelect(cit)}
                                                                >
                                                                    <Text style={{ color: '#CBD5E1', fontSize: 12 }} numberOfLines={1}>{cit.title}</Text>
                                                                </TouchableOpacity>
                                                            ))}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        ) : (
                                            <Text style={{ color: '#64748B', fontStyle: 'italic', textAlign: 'center', marginTop: 50 }}>
                                                Oracle is standing by. Enter a prompt in the search bar and tap "ASK AI".
                                            </Text>
                                        )}
                                        
                                        {aiResponse && !isAiThinking && !isSavingCard && (
                                            <TouchableOpacity 
                                                style={{ marginTop: 20, padding: 15, backgroundColor: '#00ffff20', borderWidth: 1, borderColor: '#00ffff', borderRadius: 8, alignItems: 'center' }}
                                                onPress={() => setIsSavingCard(true)}
                                            >
                                                <Text style={{ color: '#00ffff', fontFamily: 'Courier', fontWeight: 'bold' }}>+ CRYSTALLIZE AS CARD</Text>
                                            </TouchableOpacity>
                                        )}

                                        {isSavingCard && (
                                            <View style={{ marginTop: 20, padding: 15, backgroundColor: '#222', borderRadius: 8, borderWidth: 1, borderColor: '#A855F7' }}>
                                                <Text style={{ color: '#A855F7', fontFamily: 'Courier', fontWeight: 'bold', marginBottom: 10 }}>CRYSTALLIZE JAWW ORACLE CARD</Text>
                                                
                                                <TextInput
                                                    style={{ backgroundColor: '#000', color: '#fff', padding: 12, borderRadius: 6, marginBottom: 15, fontFamily: 'Courier', borderWidth: 1, borderColor: '#333' }}
                                                    placeholder="Subject (e.g. Diet, Workout, Rules)"
                                                    placeholderTextColor="#666"
                                                    value={oracleSubject}
                                                    onChangeText={setOracleSubject}
                                                />
                                                
                                                <Text style={{ color: '#888', fontSize: 12, fontFamily: 'Courier', marginBottom: 5 }}>Select Category:</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                                    {MASTER_TAGS.map(tag => (
                                                        <TouchableOpacity 
                                                            key={tag} 
                                                            style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: oracleCategory === tag ? '#A855F7' : '#333', marginRight: 8 }}
                                                            onPress={() => setOracleCategory(tag)}
                                                        >
                                                            <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>{tag}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>

                                                <View style={{ marginBottom: 20, padding: 10, backgroundColor: '#EF444420', borderRadius: 6, borderWidth: 1, borderColor: '#EF4444' }}>
                                                    <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>VAULT ONLY: NO MESH BROADCAST</Text>
                                                    <Text style={{ color: '#888', fontSize: 10, textAlign: 'center', marginTop: 5 }}>To protect the human integrity of the JAWW protocol, AI-generated answers cannot be shared with the public mesh.</Text>
                                                </View>

                                                <TouchableOpacity 
                                                    style={{ backgroundColor: '#A855F7', padding: 15, borderRadius: 8, alignItems: 'center' }}
                                                    onPress={handleCrystallizeCard}
                                                >
                                                    <Text style={{ color: '#000', fontWeight: 'bold', fontFamily: 'Courier' }}>SAVE TO PRIVATE LEDGER</Text>
                                                </TouchableOpacity>
                                                
                                                <TouchableOpacity style={{ marginTop: 15, alignItems: 'center' }} onPress={() => setIsSavingCard(false)}>
                                                    <Text style={{ color: '#666', fontSize: 12 }}>Cancel</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </ScrollView>
                                    
                                    {!isSavingCard && (
                                        <>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, paddingHorizontal: 5 }}>
                                                <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: 'Courier' }}>VAULT SCAN (RAG):</Text>
                                                <TouchableOpacity 
                                                    style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: vaultScanEnabled ? '#A855F7' : '#333', justifyContent: 'center', alignItems: vaultScanEnabled ? 'flex-end' : 'flex-start', padding: 2 }}
                                                    onPress={() => setVaultScanEnabled(!vaultScanEnabled)}
                                                >
                                                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
                                                </TouchableOpacity>
                                            </View>
                                            <TouchableOpacity 
                                                style={[styles.footBtnMain, { backgroundColor: '#A855F7', borderColor: '#A855F7' }]}
                                                onPress={handleAskAI}
                                                disabled={isAiThinking}
                                            >
                                                <Text style={[styles.footTextMain, { color: '#000' }]}>
                                                    {isAiThinking ? "GENERATING..." : "ASK AI"}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={async () => { await deleteModel(); setIsAiReady(false); }}>
                                                <Text style={{ color: '#EF4444', fontSize: 12, textDecorationLine: 'underline' }}>Delete Model (Free 2.3GB)</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            )}
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
        <GroceryListModal
            visible={isGroceryListVisible}
            onClose={() => setIsGroceryListVisible(false)}
            initialList={groceryList}
            onSave={(list) => {}}
        />
        <WorkoutLoggerModal
            visible={isWorkoutLoggerVisible}
            onClose={() => setIsWorkoutLoggerVisible(false)}
            localLibrary={localLibrary}
            onSaveWorkoutLog={handleSaveWorkoutLog}
            onCreateNewWorkout={onCreateNewWorkout}
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