import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ScrollView } from 'react-native';

const CATEGORIES = [
  { id: 'ALL', icon: '∞', label: 'ALL INTEL' },
  { id: 'LOGIC', icon: '⚡', label: 'LOGIC' },
  { id: 'HISTORY', icon: '🏛️', label: 'HISTORY' },
  { id: 'MATH', icon: '📐', label: 'MATH' },
  { id: 'SCIENCE', icon: '🧪', label: 'SCIENCE' },
  { id: 'WELLNESS', icon: '❤️', label: 'WELLNESS' },
  { id: 'STRATEGY', icon: '♟️', label: 'STRATEGY' },
  { id: 'GENERAL', icon: '📂', label: 'GENERAL' },
];

export default function Dashboard({ cards, onSelectCategory }) {
  const [activeCategory, setActiveCategory] = useState('ALL');

  const handleSelect = (id) => {
    setActiveCategory(id);
    onSelectCategory(id);
  };

  return (
    <View style={styles.container}>
      {/* Tactical Horizontal Segmented Control */}
      <View style={styles.navWrapper}>
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContainer}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => handleSelect(cat.id)}
              >
                <Text style={[styles.navIcon, isActive && styles.textActive]}>{cat.icon}</Text>
                <Text style={[styles.navLabel, isActive && styles.textActive]}>{cat.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* This is a placeholder for where App.js will inject the FlatList of CardItems.
        The Dashboard component no longer needs to render the grid of massive buttons!
      */}
      <View style={styles.feedPlaceholder}>
          <Text style={styles.placeholderText}>[ INTEL FEED INJECTED HERE BY APP.JS ]</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
      flex: 1, 
      backgroundColor: '#000000' // True Black
  },
  navWrapper: {
      borderBottomWidth: 1,
      borderBottomColor: '#334155',
      backgroundColor: '#0F172A',
  },
  scrollContainer: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      gap: 8,
  },
  navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1E293B',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#334155',
      gap: 8,
  },
  navItemActive: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: '#10B981',
  },
  navIcon: {
      fontSize: 14,
      opacity: 0.6,
  },
  navLabel: {
      color: '#94A3B8',
      fontFamily: 'Courier',
      fontWeight: 'bold',
      fontSize: 12,
      letterSpacing: 1,
  },
  textActive: {
      color: '#10B981',
      opacity: 1,
  },
  feedPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      opacity: 0.2
  },
  placeholderText: {
      color: '#10B981',
      fontFamily: 'Courier',
      fontSize: 12,
  }
});