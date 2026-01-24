import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Assuming standard icons

// The Internal Logic (The Sausage Making)
// We keep the "King of Bots" variable in code because it reminds us of the enemy,
// but we NEVER show it to the user.
const STATUS = {
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  KING_OF_BOTS: 'KING_OF_BOTS' 
};

export const KnowledgeCard = ({ card }) => {
  const { content, author_pubkey, timestamp } = card.payload;
  const { origin_status } = card.header;

  // State to handle "Click to Reveal" for flagged content
  const [isFlaggedRevealed, setFlaggedRevealed] = useState(false);

  // --- RENDER LOGIC ---

  // Case 1: The TRUSTED Source (The Green Lane)
  if (origin_status === STATUS.VERIFIED) {
    return (
      <View style={[styles.card, styles.cardTrusted]}>
        <View style={styles.header}>
          <Icon name="shield-check" size={20} color="#4CAF50" />
          <Text style={styles.trustedLabel}>Trusted Source</Text>
          <Text style={styles.timestamp}>{new Date(timestamp).toLocaleTimeString()}</Text>
        </View>
        <Text style={styles.content}>{content}</Text>
        <Text style={styles.author}>ID: {author_pubkey.slice(0, 8)}...</Text>
      </View>
    );
  }

  // Case 2: The FLAGGED Content (The Vaccine Filter)
  // We don't say "King of Bots." We say "Suspicious Content."
  if (origin_status === STATUS.KING_OF_BOTS) {
    return (
      <View style={[styles.card, styles.cardFlagged]}>
        <View style={styles.header}>
          <Icon name="alert-octagon" size={20} color="#D32F2F" />
          <Text style={styles.flaggedLabel}>Flagged as Inauthentic</Text>
        </View>
        
        {isFlaggedRevealed ? (
          <View>
            <Text style={styles.contentFlagged}>{content}</Text>
            <TouchableOpacity onPress={() => setFlaggedRevealed(false)}>
              <Text style={styles.revealButton}>Hide Content</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.warningText}>
              This content matches a known signature for high-volume automated traffic. 
              It has been hidden to preserve signal integrity.
            </Text>
            <TouchableOpacity onPress={() => setFlaggedRevealed(true)}>
              <Text style={styles.revealButton}>View Anyway (Not Recommended)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // Case 3: The UNKNOWN (Standard Town Square)
  // No badges. Just raw text. Freedom of Speech default.
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.timestamp}>{new Date(timestamp).toLocaleTimeString()}</Text>
      </View>
      <Text style={styles.content}>{content}</Text>
      <Text style={styles.authorMetdata}>Source: {author_pubkey.slice(0, 8)}...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTrusted: {
    borderColor: '#4CAF50', // Subtle Green Border
    backgroundColor: '#F9FFF9', // Very faint green tint
  },
  cardFlagged: {
    borderColor: '#FFCDD2', // Red border
    backgroundColor: '#FFEBEE', // Faint red tint
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustedLabel: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 6,
    marginRight: 'auto',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  flaggedLabel: {
    color: '#D32F2F',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  content: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },
  contentFlagged: {
    fontSize: 16,
    color: '#777', // Greyed out text
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: 14,
    color: '#D32F2F',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  revealButton: {
    color: '#1976D2',
    fontWeight: '600',
    marginTop: 8,
  },
  author: {
    fontSize: 12,
    color: '#888',
    marginTop: 12,
  },
  authorMetdata: {
    fontSize: 12,
    color: '#999',
    marginTop: 12,
    fontFamily: 'Courier', // Monospace for keys looks cooler
  },
  timestamp: {
    fontSize: 12,
    color: '#BBB',
    marginLeft: 'auto',
  },
});

export default KnowledgeCard;