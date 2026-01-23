import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SectionList, TextInput } from 'react-native';
import { CODEX } from '../model/CodexData';

export default function CodexModal({ visible, onClose }) {
  const [searchText, setSearchText] = useState('');

  // 1. Filter Data based on Search
  const filteredData = CODEX.filter(item => {
    const query = searchText.toLowerCase();
    return item.title.toLowerCase().includes(query) || 
           item.body.toLowerCase().includes(query) ||
           item.category.toLowerCase().includes(query);
  });

  // 2. Group Data by Category for the SectionList
  const groupedData = filteredData.reduce((acc, item) => {
    const existingSection = acc.find(section => section.title === item.category);
    if (existingSection) {
      existingSection.data.push(item);
    } else {
      acc.push({ title: item.category, data: [item] });
    }
    return acc;
  }, []);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.title}>THE CODEX</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>CLOSE</Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <TextInput 
            style={styles.searchInput}
            placeholder="Search the Library..."
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* THE LIBRARY LIST */}
        <SectionList
          sections={groupedData}
          keyExtractor={(item) => item.id}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemBody}>{item.body}</Text>
              <View style={styles.tagContainer}>
                {item.tags.slice(0, 4).map(tag => (
                  <Text key={tag} style={styles.tag}>#{tag}</Text>
                ))}
              </View>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={<Text style={{color:'#666', textAlign:'center', marginTop:20}}>No results found.</Text>}
        />

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#333' },
  title: { color: '#00ffff', fontWeight: 'bold', fontSize: 18, fontFamily: 'Courier', letterSpacing: 2 },
  close: { color: '#fff', fontWeight: 'bold' },
  searchContainer: { padding: 15 },
  searchInput: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 8, fontFamily: 'Courier' },
  sectionHeader: { backgroundColor: '#1a1a1a', paddingVertical: 10, paddingHorizontal: 20, marginTop: 10 },
  sectionTitle: { color: '#f59e0b', fontWeight: 'bold', fontSize: 12, letterSpacing: 1 },
  itemContainer: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#222' },
  itemTitle: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  itemBody: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  tagContainer: { flexDirection: 'row', gap: 10, marginTop: 10 },
  tag: { color: '#666', fontSize: 10, fontFamily: 'Courier' }
});