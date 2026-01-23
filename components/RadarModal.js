import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, SafeAreaView, Platform, StatusBar, FlatList, ActivityIndicator, Alert } from 'react-native';

// --- MOCK DATA: THE SCENARIOS ---
const MOCK_PEERS = [
  {
    id: 'peer_1',
    handle: 'Chef_Mike',
    bio: 'Executive Chef. 20 years exp.',
    // SCENARIO: THE EXPERT. 
    // High total volume across many dishes. Even his new stuff should rank high.
    broadcast: [
      { title: 'New Experimental Sauce', domain: 'COOKING', downloads: 2, tags: ['sauce', 'beta'] }, // Low views
      { title: 'Classic Beef Wellington', domain: 'COOKING', downloads: 850, tags: ['beef', 'dinner'] },
      { title: 'Perfect Sourdough', domain: 'COOKING', downloads: 1200, tags: ['bread', 'baking'] },
      { title: 'Summer Salad', domain: 'COOKING', downloads: 400, tags: ['salad', 'vegan'] }
    ]
  },
  {
    id: 'peer_2',
    handle: 'Tim_The_Novice',
    bio: 'I just like pasta.',
    // SCENARIO: THE ONE-HIT WONDER.
    // One massive hit, but the rest is trash/empty.
    broadcast: [
      { title: 'Grandma’s Viral Lasagna', domain: 'COOKING', downloads: 5000, tags: ['pasta', 'viral'] }, // Huge views
      { title: 'Burnt Toast', domain: 'COOKING', downloads: 0, tags: ['fail'] }
    ]
  },
  {
    id: 'peer_3',
    handle: 'Iron_Sally',
    bio: 'Crossfit Games 2024.',
    // SCENARIO: DIFFERENT DOMAIN.
    // Should rank low if I'm looking for food, but high if I switch to Fitness.
    broadcast: [
      { title: 'Murph Prep', domain: 'FITNESS', downloads: 2100, tags: ['cardio', 'strength'] },
      { title: 'Mobility Flow', domain: 'FITNESS', downloads: 1050, tags: ['recovery'] }
    ]
  }
];

export default function RadarModal({ visible, onClose, profile, onImport }) {
  const [scanning, setScanning] = useState(true);
  const [nearbyPeers, setNearbyPeers] = useState([]);
  const [selectedPeer, setSelectedPeer] = useState(null);

  // --- THE NEW "DEPTH OF EXPERTISE" ALGORITHM ---
  const rankPeers = (peers) => {
    // 1. Get User Context (What am I interested in?)
    const interestString = `${profile.hobbies} ${profile.expertise} ${profile.diet}`.toLowerCase();
    const myKeywords = interestString.split(/[\s,]+/).filter(w => w.length > 2);

    return peers.map(peer => {
      let score = 0;
      let relevantItemCount = 0;
      let domainTotalDownloads = 0;
      let highestSingleSpike = 0;

      // ANALYZE THE PEER'S INVENTORY
      peer.broadcast.forEach(item => {
        const itemText = `${item.title} ${item.domain} ${item.tags.join(' ')}`.toLowerCase();
        
        // A. RELEVANCE CHECK (Is this card in my interest zone?)
        const isRelevant = myKeywords.some(k => itemText.includes(k));
        
        if (isRelevant) {
          relevantItemCount++;
          score += 50; // Base points for having a relevant item
          
          // Accumulate "Depth" stats
          domainTotalDownloads += item.downloads; 
          if (item.downloads > highestSingleSpike) highestSingleSpike = item.downloads;
        }
      });

      // B. DEPTH SCORE (The "Chef" Factor)
      // We weight total category downloads heavily. 
      // This pushes the "Expert" up even if their new item has 0 views.
      score += (domainTotalDownloads * 0.5); 

      // C. SPIKE SCORE (The "One-Hit Wonder" Factor)
      // We add a bonus for their single best item, so viral hits still show up.
      score += (highestSingleSpike * 0.2);

      // D. EXPERTISE BADGE LOGIC
      // If they have > 1000 total downloads in this category, mark as Expert
      const isExpert = domainTotalDownloads > 1000;

      return { ...peer, score, isExpert, domainTotalDownloads };
    })
    .filter(p => p.score > 0) // Remove irrelevant people entirely
    .sort((a, b) => b.score - a.score); // Rank highest score first
  };

  useEffect(() => {
    if (visible) {
      setScanning(true);
      setNearbyPeers([]);
      setSelectedPeer(null);

      // Simulate Scan Delay
      setTimeout(() => {
        const ranked = rankPeers(MOCK_PEERS);
        setNearbyPeers(ranked);
        setScanning(false);
      }, 2000);
    }
  }, [visible, profile]);

  const handleImport = (item, author) => {
    const newCard = {
      id: Date.now().toString(),
      title: item.title,
      domain: item.domain,
      body_json: JSON.stringify({ type: 'structured_list', items: [{label: 'SOURCE', value: author}, {label: 'POPULARITY', value: `${item.downloads} downloads`}] }),
      author: author,
      is_verified: true
    };
    onImport(newCard);
    Alert.alert("Acquired", `Added "${item.title}" to library.`);
  };

  const renderPeer = ({ item }) => (
    <TouchableOpacity 
      style={[styles.peerCard, item.isExpert && styles.expertCard]} 
      onPress={() => setSelectedPeer(selectedPeer?.id === item.id ? null : item)}
    >
      <View style={styles.peerHeader}>
        <View style={{flex: 1}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <Text style={styles.peerHandle}>{item.handle}</Text>
            {item.isExpert && <View style={styles.badge}><Text style={styles.badgeText}>DOMAIN AUTHORITY</Text></View>}
          </View>
          <Text style={styles.peerBio}>{item.bio}</Text>
        </View>
        
        {/* SCORE READOUT */}
        <View style={styles.peerStats}>
          <Text style={styles.statLabel}>DEPTH SCORE</Text>
          <Text style={styles.statValue}>{Math.round(item.score)}</Text>
        </View>
      </View>

      {/* EXPANDED MENU */}
      {selectedPeer?.id === item.id && (
        <View style={styles.broadcastList}>
          <Text style={styles.sectionLabel}>INVENTORY ({item.broadcast.length} ITEMS):</Text>
          {item.broadcast.map((b, idx) => (
            <TouchableOpacity key={idx} style={styles.broadcastItem} onPress={() => handleImport(b, item.handle)}>
              <View style={{flex: 1}}>
                <Text style={styles.bTitle}>{b.title}</Text>
                <Text style={styles.bDomain}>{b.domain} • {b.downloads} DLs</Text>
              </View>
              {/* Highlight High Traffic items */}
              {b.downloads > 1000 && <Text style={{fontSize: 10, color: '#f59e0b', marginRight: 10}}>🔥 VIRAL</Text>}
              <Text style={styles.downloadBtn}>[ + SAVE ]</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="fade">
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>CONTEXT RADAR_</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 10 }}>
              <Text style={styles.closeLink}>CLOSE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.radarScreen}>
            {scanning ? (
              <View style={styles.centerMsg}>
                <ActivityIndicator size="large" color="#00ff00" />
                <Text style={styles.scanningText}>TRIANGULATING EXPERTISE...</Text>
                <Text style={styles.subText}>Calculating Depth & Authority</Text>
              </View>
            ) : nearbyPeers.length === 0 ? (
              <View style={styles.centerMsg}>
                <Text style={{fontSize: 50, marginBottom: 20}}>🦗</Text>
                <Text style={styles.quietTitle}>ALL QUIET</Text>
                <Text style={styles.quietSub}>No relevant experts detected nearby.</Text>
              </View>
            ) : (
              <FlatList
                data={nearbyPeers}
                keyExtractor={item => item.id}
                renderItem={renderPeer}
                contentContainerStyle={{ padding: 20 }}
                ListHeaderComponent={
                  <View style={{marginBottom: 15}}>
                    <Text style={styles.listHeader}>{nearbyPeers.length} SIGNALS RANKED BY EXPERTISE</Text>
                  </View>
                }
              />
            )}
          </View>

        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#111' },
  headerTitle: { color: '#00ff00', fontSize: 18, fontFamily: 'Courier', fontWeight: 'bold' },
  closeLink: { color: '#f59e0b', fontSize: 14, fontFamily: 'Courier' },

  radarScreen: { flex: 1 },
  centerMsg: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scanningText: { color: '#00ff00', marginTop: 20, fontFamily: 'Courier', letterSpacing: 2 },
  subText: { color: '#444', marginTop: 10, fontFamily: 'Courier', fontSize: 10 },
  quietTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily: 'Courier' },
  quietSub: { color: '#666', marginTop: 5, fontFamily: 'Courier' },

  listHeader: { color: '#666', fontSize: 10, fontFamily: 'Courier' },
  
  peerCard: { backgroundColor: '#111', borderRadius: 8, padding: 15, marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#444' },
  expertCard: { borderLeftColor: '#f59e0b', backgroundColor: '#1a1a10' }, // Gold tint for experts
  
  peerHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  peerHandle: { color: '#fff', fontSize: 16, fontWeight: 'bold', fontFamily: 'Courier' },
  peerBio: { color: '#888', fontSize: 12, marginTop: 4, maxWidth: 220 },
  
  badge: { backgroundColor: '#f59e0b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#000', fontSize: 8, fontWeight: 'bold' },

  peerStats: { alignItems: 'flex-end' },
  statLabel: { color: '#666', fontSize: 8, fontFamily: 'Courier' },
  statValue: { color: '#00ff00', fontSize: 14, fontFamily: 'Courier', fontWeight: 'bold' },

  broadcastList: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#222', paddingTop: 15 },
  sectionLabel: { color: '#444', fontSize: 10, marginBottom: 10 },
  broadcastItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  bDomain: { color: '#666', fontSize: 10 },
  downloadBtn: { color: '#00ff00', fontSize: 10, fontFamily: 'Courier' }
});