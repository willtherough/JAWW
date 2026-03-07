// components/SearchBar.js
import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';

export default function SearchBar({ value, onChangeText, onClear }) {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          style={styles.input}
          placeholder="SEARCH INTEL..."
          placeholderTextColor="#666"
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {value?.length > 0 && (
          <TouchableOpacity onPress={onClear}>
            <Text style={styles.clearBtn}>X</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 10,
    // No background color here so it blends with the main app background
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111', // Very dark grey
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#333', // Subtle border
  },
  icon: {
    marginRight: 8,
    fontSize: 14,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#00ff00', // Hacker Green
    fontFamily: 'Courier', 
  },
  clearBtn: {
    color: '#666',
    fontSize: 14,
    fontWeight: 'bold',
    padding: 4,
  }
});