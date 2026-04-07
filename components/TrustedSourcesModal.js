import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet, ScrollView, SafeAreaView } from 'react-native';

export default function TrustedSourcesModal({ visible, onClose, sources, cards = [], onFilterBySource }) {
  const [selectedSource, setSelectedSource] = useState(null);

  // Step 5: The List View (renderSourceItem)
  const renderSourceItem = ({ item }) => {
    // Safely parse the JSON to get the rank for the list view
    const profileData = JSON.parse(item.profile_json || '{}');
    const handle = item.handle || 'Unknown Operator';
    const rankTier = profileData.rank_tier || 'ROOKIE';

    return (
      <TouchableOpacity onPress={() => setSelectedSource(item)} activeOpacity={0.7}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.handleText}>{handle.toUpperCase()}</Text>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>[ {rankTier} ]</Text>
            </View>
          </View>
          <Text style={styles.tapHint}>TAP TO VIEW INTEL BRIEF >></Text>
        </View>
      </TouchableOpacity>
    );
  };

  // --- RENDER: THE DETAIL VIEW (Intel Brief) ---
  const renderDetailView = () => {
    if (!selectedSource) return null;

    // Step 1: Parse the Blob
    const profileData = JSON.parse(selectedSource.profile_json || '{}');

    const formatDate = (dateString) => {
        if (!dateString) return "UNKNOWN";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase();
    };

    // Calculate Intel Stats
    const sourceCards = cards.filter(c => c.author_id === selectedSource.publicKey);
    const totalIntel = sourceCards.length;

    // Calculate Influence
    const networkInfluence = sourceCards.reduce((acc, card) => {
       const hopScore = card.hops || 0;
       return acc + hopScore;
    }, 0);

    // Calculate Top Categories
    const categoryCount = {};
    sourceCards.forEach(c => {
       const topic = c.topic ? c.topic.replace('human/', '').toUpperCase() : 'GENERAL';
       if (!categoryCount[topic]) categoryCount[topic] = 0;
       categoryCount[topic]++;
    });
    const sortedCategories = Object.keys(categoryCount).sort((a,b) => categoryCount[b] - categoryCount[a]);
    const topCategories = sortedCategories.slice(0, 2).join(' / ') || 'NONE DETECTED';

    return (
      <View style={{flex: 1}}>
        <View style={styles.detailHeader}>
           <TouchableOpacity onPress={() => setSelectedSource(null)}>
             <Text style={styles.backLink}>{"<< INTEL LIST"}</Text>
           </TouchableOpacity>
           <Text style={styles.detailTitle}>OPERATOR BRIEF</Text>
        </View>

        <ScrollView contentContainerStyle={{padding: 20}}>
          {/* Step 2: The Detail Header */}
          <View style={styles.briefHeader}>
             <Text style={styles.briefHandle}>{selectedSource.handle.toUpperCase()}</Text>
             <View style={styles.rankBadge}>
                <Text style={styles.rankText}>[ {profileData.rank_tier || 'ROOKIE'} ]</Text>
             </View>
          </View>
          <Text style={styles.vouchedText}>VOUCHED ON: {formatDate(selectedSource.timestamp)}</Text>

          {/* Step 3: The Loadout UI */}
          <View style={styles.intelBlocks}>
            <View style={styles.intelBlock}>
              <Text style={styles.intelHeader}>// PROFESSIONAL ASSETS</Text>
              <Text style={styles.intelContent}>{profileData.background_pro || "[ CLASSIFIED / NO DATA ]"}</Text>
            </View>
            <View style={styles.intelBlock}>
              <Text style={styles.intelHeader}>// LOGISTICS & SKILLS</Text>
              <Text style={styles.intelContent}>{profileData.background_hobby || "[ CLASSIFIED / NO DATA ]"}</Text>
            </View>
            <View style={styles.intelBlock}>
              <Text style={styles.intelHeader}>// PHYSICAL CAPABILITY</Text>
              <Text style={styles.intelContent}>{profileData.background_fit || "[ CLASSIFIED / NO DATA ]"}</Text>
            </View>
          </View>
          
          {/* Step 4: Influence Metrics */}
          <View style={styles.intelBlocks}>
            <View style={styles.intelBlock}>
              <Text style={styles.intelHeader}>// NETWORK INFLUENCE</Text>
              <Text style={styles.intelStat}>{networkInfluence} HOPS GENERATED</Text>
            </View>
            <View style={styles.intelBlock}>
              <Text style={styles.intelHeader}>// INTEL SECURED</Text>
              <Text style={styles.intelStat}>{totalIntel} CARDS</Text>
            </View>
            <View style={styles.intelBlock}>
              <Text style={styles.intelHeader}>// PRIMARY OPERATIONS</Text>
              <Text style={styles.intelStat}>{topCategories}</Text>
            </View>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => {
                if (onFilterBySource) onFilterBySource(selectedSource.publicKey);
              }}
            >
              <Text style={styles.actionButtonText}>[ VIEW CARDS IN BROWSER ]</Text>
            </TouchableOpacity>
          </View>

          {/* Step 6: Keep the History */}
          <Text style={styles.sectionTitle}>// CHAIN OF CUSTODY</Text>
          {(!selectedSource.history || selectedSource.history.length === 0) ? (
            <Text style={styles.emptyHistory}>No recorded history for this source.</Text>
          ) : (
            selectedSource.history.map((entry, index) => (
              <View key={index} style={styles.historyRow}>
                <View style={styles.timelineLine} />
                <View style={styles.historyDot} />
                <View style={{flex: 1}}>
                  <Text style={styles.historyAction}>{entry.action}</Text>
                  <Text style={styles.historyTime}>{new Date(entry.timestamp).toLocaleString()}</Text>
                  {entry.note && <Text style={styles.historyNote}>{entry.note}</Text>}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1 }}>
          {selectedSource ? (
            renderDetailView()
          ) : (
            <>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>TRUSTED INTEL SOURCES</Text>
                <TouchableOpacity onPress={onClose} style={{ padding: 10 }}>
                  <Text style={styles.closeLink}>CLOSE</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={sources}
                keyExtractor={item => item.uid}
                renderItem={renderSourceItem}
                contentContainerStyle={{ padding: 20 }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No trusted sources in your network.</Text>
                }
              />
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#050505',
    paddingTop: 60,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    borderBottomWidth: 1, 
    borderColor: '#222', 
    alignItems: 'center' 
  },
  headerTitle: { color: '#00FF00', fontSize: 18, fontFamily: 'Courier New', fontWeight: 'bold' },
  closeLink: { color: '#888', fontSize: 14, fontFamily: 'Courier New', padding: 10 },

  card: { 
    backgroundColor: '#1a1a1a', 
    padding: 15, 
    borderRadius: 8, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#333' 
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  handleText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, fontFamily: 'Courier New' },
  tapHint: { color: '#444', fontSize: 10, fontWeight: 'bold', textAlign: 'right', marginTop: 5 },
  emptyText: { color: '#666', fontFamily: 'Courier New', textAlign: 'center', marginTop: 50 },

  detailHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 20, 
    borderBottomWidth: 1, 
    borderColor: '#222' 
  },
  backLink: { color: '#f59e0b', fontWeight: 'bold', marginRight: 20, fontFamily: 'Courier New' },
  detailTitle: { color: '#00FF00', fontSize: 16, fontWeight: 'bold', letterSpacing: 1, fontFamily: 'Courier New' },
  
  briefHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#111',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderColor: '#f59e0b',
  },
  briefHandle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  rankBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  rankText: { 
    color: '#f59e0b', 
    fontSize: 14, 
    fontWeight: 'bold', 
    fontFamily: 'Courier New',
  },
  vouchedText: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'Courier New',
    textAlign: 'center',
    marginVertical: 10,
  },

  intelBlocks: { gap: 15, marginVertical: 10 },
  intelBlock: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 5,
    borderLeftWidth: 2,
    borderColor: '#00FF00',
    marginBottom: 10,
  },
  intelHeader: {
    color: '#00FF00',
    fontFamily: 'Courier New',
    fontSize: 10,
    marginBottom: 8,
  },
  intelContent: {
    color: '#DDD',
    fontSize: 14,
    fontFamily: 'Courier New',
    lineHeight: 20,
  },

  sectionTitle: { color: '#888', fontSize: 12, fontWeight:'bold', fontFamily: 'Courier New', marginTop: 20, marginBottom: 15, },
  historyRow: { flexDirection: 'row', marginBottom: 20, paddingLeft: 10 },
  timelineLine: { position: 'absolute', left: 13, top: 0, bottom: -20, width: 1, backgroundColor: '#222' },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00FF00', marginTop: 5, marginRight: 15 },
  historyAction: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  historyTime: { color: '#666', fontSize: 10, marginBottom: 2 },
  historyNote: { color: '#AAA', fontSize: 12, fontStyle: 'italic' },
  emptyHistory: { color: '#444', fontStyle: 'italic', fontFamily: 'Courier New' },
  intelStat: {
    color: '#00FF00',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  actionButton: {
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF00',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  actionButtonText: {
    color: '#00FF00',
    fontFamily: 'Courier New',
    fontWeight: 'bold',
    fontSize: 14,
  }
});