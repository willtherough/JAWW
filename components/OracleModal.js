import React, { useState, useMemo } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView, 
  StatusBar,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import SearchBar from './SearchBar'; // Ensure SearchBar.js is in /components

// UPDATED: Added 'onNavigate' to props
export default function OracleModal({ visible, onClose, masterLibrary = [], funLibrary = [], onSelect, onNavigate }) {
  const [query, setQuery] = useState('');

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

  // --- INTERNAL FILTER LOGIC (UPGRADED) ---
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return []; // Nothing to show if query is empty

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
  }, [library, query, masterLibrary, funLibrary]);
  // --- RENDER ITEM ---
  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => onSelect(item)} // Trigger selection
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{item.title}</Text>
        <Text style={styles.resultCategory}>{item.category || 'INTEL'}</Text>
      </View>
      <Text numberOfLines={2} style={styles.resultPreview}>
        {item.body}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ORACLE ENGINE</Text>
          <Text style={styles.headerStatus}>// ONLINE</Text>
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
            {query.trim() === '' ? (
                // --- EMPTY STATE: BASIC EDUCATION SUBJECTS ---
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
                // --- SEARCH RESULTS ---
                <FlatList 
                    data={results}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    keyboardShouldPersistTaps="handled"
                />
            )}
        </View>

        {/* --- FOOTER NAVIGATION (NEW) --- */}
        <View style={styles.footer}>
            {/* 1. DASHBOARD (Exit) */}
            <TouchableOpacity onPress={onClose} style={styles.footBtn}>
                <Text style={styles.footText}>DASHBOARD</Text>
            </TouchableOpacity>

            {/* 2. SCAN QR */}
            <TouchableOpacity onPress={() => onNavigate('scan')} style={styles.footBtn}>
                <Text style={styles.footText}>SCAN QR</Text>
            </TouchableOpacity>

            {/* 3. CREATE */}
            <TouchableOpacity onPress={() => onNavigate('create')} style={styles.footBtnMain}>
                <Text style={styles.footTextMain}>+ CREATE</Text>
            </TouchableOpacity>

            {/* 4. RADAR */}
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
    backgroundColor: '#050505', // Deep Black
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
    color: '#00ffff', // Cyan for Oracle
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
  closeText: {
    color: '#666',
    fontFamily: 'Courier',
    fontSize: 14,
  },
  searchContainer: {
    paddingVertical: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  // --- EMPTY STATE ---
  emptyState: {
    marginTop: 40,
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