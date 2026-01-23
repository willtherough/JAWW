import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TOPICS } from '../model/Definitions';

export default function CardRenderer({ card }) {
  if (!card || !card.body_json) return null;

  let data = null;
  let isPlainString = false;

  try {
    data = typeof card.body_json === 'string' ? JSON.parse(card.body_json) : card.body_json;
  } catch (e) {
    data = { content: card.body_json }; 
    isPlainString = true;
  }

  // --- MODE A: PROFILE BEACON (The "Business Card") ---
  if (card.type === 'profile_beacon') {
    return (
      <View style={styles.profileContainer}>
        {/* RANKING HEADER */}
        <View style={styles.rankRow}>
          <Text style={styles.rankLabel}>AUTHORITY TIER:</Text>
          <Text style={styles.rankValue}>{data.rank ? data.rank.toUpperCase() : 'STANDARD'}</Text>
        </View>

        {/* ROLES */}
        <View style={styles.section}>
          <Text style={styles.label}>EXPERTISE / BACKGROUND</Text>
          <View style={styles.tagRow}>
            {data.roles ? data.roles.split(',').map((r, i) => (
              <View key={i} style={styles.pill}>
                <Text style={styles.pillText}>{r.trim()}</Text>
              </View>
            )) : <Text style={styles.bodyText}>--</Text>}
          </View>
        </View>

        {/* INTERESTS */}
        <View style={styles.section}>
          <Text style={styles.label}>SEEKING KNOWLEDGE IN</Text>
          <View style={styles.tagRow}>
            {data.interests && data.interests.map((id) => {
              const t = TOPICS.find(x => x.id === id);
              return (
                <View key={id} style={styles.iconPill}>
                  <Text>{t ? t.icon : '•'}</Text>
                  <Text style={styles.iconPillText}>{t ? t.label : id}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  // --- MODE B: STRUCTURED LIST ---
  if (data && data.type === 'structured_list') {
    return (
      <View style={styles.container}>
        {data.items.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        ))}
      </View>
    );
  }

  // --- MODE C: NARRATIVE (Standard Text) ---
  const contentText = data.content || (isPlainString ? card.body_json : JSON.stringify(data));
  
  return (
    <View style={styles.container}>
      <Text style={styles.bodyText}>{contentText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 10 },
  
  // PROFILE STYLES
  profileContainer: { marginTop: 5, backgroundColor: '#222', padding: 10, borderRadius: 8 },
  rankRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderColor: '#444', paddingBottom: 5 },
  rankLabel: { color: '#666', fontSize: 10, fontFamily: 'Courier', fontWeight: 'bold' },
  rankValue: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold' },
  
  section: { marginBottom: 15 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  pill: { backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  pillText: { color: '#fff', fontSize: 12 },
  iconPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 15, gap: 5 },
  iconPillText: { color: '#ccc', fontSize: 10, fontWeight: 'bold' },

  // STANDARD STYLES
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#333', paddingBottom: 4 },
  label: { color: '#666', fontSize: 10, fontFamily: 'Courier', fontWeight: 'bold' },
  value: { color: '#00ff00', fontSize: 14, fontWeight: 'bold', fontFamily: 'Courier' },
  bodyText: { color: '#ddd', fontSize: 14, lineHeight: 22, fontFamily: 'Courier' }
});