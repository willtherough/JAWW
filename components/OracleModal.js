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
import SearchBar from './SearchBar';
import { getAllEvents, getCardsByEvent, deleteEvent } from '../model/database';

export default function OracleModal({ visible, onClose, masterLibrary = [], funLibrary = [], onSelect, onNavigate, onEndEvent, refreshTrigger }) {
  const [query, setQuery] = useState('');
  
  // --- NEW: EVENT STATE ---
    const [activeTab, setActiveTab] = useState('TOPICS'); // 'TOPICS' or 'ASSEMBLY'
  const [events, setEvents] = useState([]);
  const [activeEventCards, setActiveEventCards] = useState(null); // Null = not looking at an event
  const [activeEventId, setActiveEventId] = useState(null); // Keep track of the active event ID
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const MASTER_TAGS = [
    'MEDICAL', 'SURVIVAL', 'TECH', 'PHYSIOLOGY', 
    'OUTDOORS', 'TRADES', 'DOMESTIC', 'FINANCE', 
    'BUSINESS', 'SCIENCE', 'CIVICS', 'LOGIC'
  ];

  const FUN_TAGS = [
    'SPORTS', 'NFL', 'SUPER BOWL', 'NCAA', 
    'NBA', 'MLB', 'NHL', 'UFC', 'RACING', 'NASCAR', 'LE MANS'
  ];

  const library = [...masterLibrary, ...funLibrary];

  // --- NEW: FETCH EVENTS ON MOUNT ---
  useEffect(() => {
    if (visible) {
      loadEvents();
    } else {
      // Reset when closed
      setActiveEventCards(null);
      setActiveEventId(null); // Reset active event ID
      setQuery('');
      setActiveTab('TOPICS');
    }
  }, [visible]);

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
        ? masterLibrary 
        : FUN_TAGS.map(t => t.toLowerCase()).includes(q)
            ? funLibrary
            : library;

    return source.filter(card => 
        card.title.toLowerCase().includes(q) || 
        (card.category && card.category.toLowerCase().includes(q)) ||
        (card.tags && card.tags.some(t => t.toLowerCase().includes(q))) ||
        (card.keywords && card.keywords.some(k => k.toLowerCase().includes(q)))
    );
  }, [library, query, masterLibrary, funLibrary, activeEventCards]);


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
                            style={[styles.tabBtn, activeTab === 'TOPICS' && styles.activeTabBtn]}
                            onPress={() => setActiveTab('TOPICS')}
                        >
                            <Text style={[styles.tabText, activeTab === 'TOPICS' && styles.activeTabText]}>GLOBAL TOPICS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'ASSEMBLY' && styles.activeTabBtn]}
                            onPress={() => setActiveTab('ASSEMBLY')}
                        >
                            <Text style={[styles.tabText, activeTab === 'ASSEMBLY' && styles.activeTabText]}>ASSEMBLY</Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'TOPICS' ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.sectionTitle}>// CORE KNOWLEDGE</Text>
                            <View style={styles.tagCloud}>
                                {MASTER_TAGS.map(tag => (
                                    <TouchableOpacity 
                                        key={tag} 
                                        style={styles.tagPill}
                                        onPress={() => setQuery(tag)}
                                    >
                                        <Text style={styles.tagText}>{tag}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={{ height: 24 }} />

                            <Text style={styles.sectionTitle}>// RECREATIONAL & SPECIAL INTEREST</Text>
                            <View style={styles.tagCloud}>
                                {FUN_TAGS.map(tag => (
                                    <TouchableOpacity 
                                        key={tag} 
                                        style={[styles.tagPill, { borderColor: '#33ff00' }]}
                                        onPress={() => setQuery(tag)} 
                                    >
                                        <Text style={[styles.tagText, { color: '#33ff00' }]}>{tag}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.statsText}>
                                CORE NODES: {masterLibrary.length} | FUN NODES: {funLibrary.length}
                            </Text>
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
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
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
  footTextMain: { 
    color: '#00ff00', 
    fontWeight: 'bold', 
    fontSize: 12, 
    fontFamily: 'Courier' 
  },
});