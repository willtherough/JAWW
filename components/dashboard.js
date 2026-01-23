import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Dimensions } from 'react-native';

const CATEGORIES = [
  { id: 'LOGIC', icon: '⚡', label: 'LOGIC' },
  { id: 'HISTORY', icon: '🏛️', label: 'HISTORY' },
  { id: 'MATH', icon: '📐', label: 'MATH' },
  { id: 'SCIENCE', icon: '🧪', label: 'SCIENCE' },
  { id: 'WELLNESS', icon: '❤️', label: 'WELLNESS' },
  { id: 'STRATEGY', icon: '♟️', label: 'STRATEGY' },
  { id: 'GENERAL', icon: '📂', label: 'GENERAL' },
  { id: 'ALL', icon: '∞', label: 'ALL CARDS' }, // A way to see everything if needed
];

const numColumns = 2;

export default function Dashboard({ cards, onSelectCategory }) {
  
  // Calculate counts for badges
  const getCount = (catId) => {
    if (catId === 'ALL') return cards.length;
    // We rely on the App.js to pass categorized cards, or we filter here. 
    // For visual speed, we'll let the parent handle the sorting, 
    // but for the badge, let's just do a quick look-up if we have the categorization logic handy.
    // Ideally, App.js passes the counts.
    return null; 
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => onSelectCategory(item.id)}
    >
      <Text style={styles.icon}>{item.icon}</Text>
      <Text style={styles.label}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={CATEGORIES}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 20 },
  listContainer: { paddingBottom: 50 },
  card: {
    backgroundColor: '#1e1e1e',
    flex: 1,
    margin: 8,
    height: 120, // Nice square-ish shape
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    // Slight shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: { fontSize: 40, marginBottom: 10 },
  label: { 
    color: '#ccc', 
    fontFamily: 'Courier', 
    fontWeight: 'bold', 
    fontSize: 12,
    letterSpacing: 1
  }
});