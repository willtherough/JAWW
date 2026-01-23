import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity, StyleSheet, FlatList, Keyboard } from 'react-native';
import { expandQuery, calculateRelevance } from '../model/Brain'; // <--- The New Brain
import CardRenderer from './CardRenderer';

export default function OracleModal({ visible, onClose, library }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [concepts, setConcepts] = useState([]);

  // REAL-TIME SEARCH
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setConcepts([]);
      return;
    }

    // 1. EXPAND (Think)
    const expandedTerms = expandQuery(query);
    setConcepts(expandedTerms.filter(t => t !== query.toLowerCase())); // Show what we added

    // 2. SEARCH & RANK (Process)
    const ranked = library
      .map(card => {
        const score = calculateRelevance(card, expandedTerms);
        return { ...card, score };
      })
      .filter(card => card.score > 0) // Remove irrelevant
      .sort((a, b) => b.score - a.score); // Best match first

    setResults(ranked);
  }, [query, library]);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.title}>ORACLE ENGINE</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>SHUTDOWN</Text>
            </TouchableOpacity>
          </View>

          {/* INPUT */}
          <TextInput 
            style={styles.input}
            placeholder="Query the Archive..."
            placeholderTextColor="#666"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />

          {/* CONCEPTS (Showing the "Brain") */}
          {concepts.length > 0 && (
            <View style={styles.conceptRow}>
              <Text style={styles.conceptLabel}>ASSOCIATED:</Text>
              {concepts.slice(0, 4).map((c, i) => (
                <View key={i} style={styles.conceptTag}>
                  <Text style={styles.conceptText}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          {/* RESULTS */}
          <FlatList 
            data={results}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.resultItem}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.matchScore}>{item.score}% REL</Text>
                </View>
                {/* Preview first 100 chars */}
                <Text style={styles.preview}>
                  {typeof item.body_json === 'string' 
                    ? item.body_json.substring(0, 80).replace(/\n/g, ' ') + '...' 
                    : 'Structured Data'}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              query ? <Text style={styles.empty}>No correlations found in local vector space.</Text> : null
            }
          />

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', paddingTop: 50 },
  container: { flex: 1, backgroundColor: '#121212', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { color: '#00ffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  closeText: { color: '#666', fontWeight: 'bold' },
  
  input: { backgroundColor: '#222', color: '#fff', fontSize: 18, padding: 15, borderRadius: 8, marginBottom: 15, fontFamily: 'Courier', borderBottomWidth: 2, borderBottomColor: '#00ffff' },
  
  conceptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20, alignItems: 'center' },
  conceptLabel: { color: '#666', fontSize: 10, fontWeight: 'bold' },
  conceptTag: { backgroundColor: '#222', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: '#444' },
  conceptText: { color: '#aaa', fontSize: 10, fontFamily: 'Courier' },

  resultItem: { backgroundColor: '#1a1a1a', padding: 15, borderRadius: 8, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#00ffff' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  resultTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  matchScore: { color: '#00ffff', fontSize: 10, fontWeight: 'bold' },
  preview: { color: '#888', fontSize: 12, fontFamily: 'Courier' },
  
  empty: { color: '#444', textAlign: 'center', marginTop: 50, fontStyle: 'italic' }
});