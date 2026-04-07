import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Clipboard } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { saveProfile } from '../model/Storage';
import { createIdentityCard } from '../model/Schema';
import { getOperatorStats } from '../model/database';

export default function IdentityModal({ 
  visible, onClose, profile, onReset, onClearLibrary, onStartNewEvent
}) {
  const [mode, setMode] = useState('view');
  const [isEditing, setIsEditing] = useState(false);
  const [handle, setHandle] = useState('');
  const [rankTier, setRankTier] = useState('');
  const [genesisDate, setGenesisDate] = useState('');
  const [backgroundPro, setBackgroundPro] = useState('');
  const [backgroundHobby, setBackgroundHobby] = useState('');
  const [backgroundFit, setBackgroundFit] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
        if (visible && profile?.handle) {
            const operatorStats = await getOperatorStats(profile.handle);
            setStats(operatorStats);
        }
    };

    if (visible) {
      setHandle(profile.handle || 'UNKNOWN');
      setRankTier(profile.rank_tier || 'ROOKIE');
      setGenesisDate(profile.genesis_date || new Date().toISOString());
      setBackgroundPro(profile.background_pro || '');
      setBackgroundHobby(profile.background_hobby || '');
      setBackgroundFit(profile.background_fit || '');
      setMode('view');
      setIsEditing(false);
      fetchStats();
    }
  }, [visible, profile]);

  const handleSave = async () => {
    const updatedProfile = {
      ...profile,
      handle,
      background_pro: backgroundPro,
      background_hobby: backgroundHobby,
      background_fit: backgroundFit,
    };
    try {
      await saveProfile(updatedProfile);
      Alert.alert("Dossier Updated", "Your operator records have been patched.");
      setIsEditing(false);
    } catch (error) {
      Alert.alert("Save Failed", "Could not update your dossier.");
      console.error("Profile save error:", error);
    }
  };

  const copyPublicKey = () => {
    if (profile.publicKey) {
      Clipboard.setString(profile.publicKey);
      Alert.alert("Public Key Copied", "Your public key has been copied to the clipboard.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "UNKNOWN";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };
  
  if (!visible) return null;

  const qrCodePayload = createIdentityCard(
    { 
      handle, 
      rank_tier: rankTier, 
      genesis_date: genesisDate,
      background_pro: backgroundPro,
      background_hobby: backgroundHobby,
      background_fit: backgroundFit
    }, 
    profile.publicKey
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <SafeAreaView style={{flex: 1}}>
          <View style={styles.header}>
            <Text style={styles.title}>TACTICAL OPERATOR DOSSIER</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>CLOSE</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
            
            <View style={styles.idCard}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>[ {rankTier} ]</Text>
              </View>
              <View style={{alignItems: 'center'}}>
                <Text style={styles.handle}>{handle.toUpperCase()}</Text>
                <TouchableOpacity onPress={copyPublicKey}>
                    <Text style={styles.key}>Public Key: {profile.publicKey ? profile.publicKey : 'NO KEY'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* --- SCOREBOARD UI --- */}
            {stats && (
              <View style={styles.scoreboard}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Authored Intel</Text>
                  <Text style={styles.statValue}>{stats.authoredCount}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Network Reach</Text>
                  <Text style={styles.statValue}>{stats.networkReach}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Vault Size</Text>
                  <Text style={styles.statValue}>{stats.totalVaultSize}</Text>
                </View>
                <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.statLabel}>Class/Dominance</Text>
                  <Text style={styles.statValue}>{stats.domainDominance.toUpperCase()}</Text>
                </View>
              </View>
            )}
            
            {mode === 'view' ? (
              <>
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>// INTEL ANALYSIS</Text>
                    <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                      <Text style={styles.editText}>{isEditing ? 'CANCEL' : 'EDIT DOSSIER'}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {isEditing ? (
                    <View style={styles.form}>
                      <Text style={styles.label}>PROFESSIONAL ASSETS</Text>
                      <TextInput style={styles.input} value={backgroundPro} onChangeText={setBackgroundPro} multiline placeholder="Enter professional background..." placeholderTextColor="#005500"/>
                      
                      <Text style={styles.label}>LOGISTICS & SKILLS</Text>
                      <TextInput style={styles.input} value={backgroundHobby} onChangeText={setBackgroundHobby} multiline placeholder="Enter hobbies, skills, logistics..." placeholderTextColor="#005500"/>
                      
                      <Text style={styles.label}>PHYSICAL CAPABILITY</Text>
                      <TextInput style={styles.input} value={backgroundFit} onChangeText={setBackgroundFit} multiline placeholder="Enter fitness regime, capabilities..." placeholderTextColor="#005500"/>

                      <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                        <Text style={styles.saveText}>PATCH RECORDS</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.intelBlocks}>
                      <View style={styles.intelBlock}>
                        <Text style={styles.intelHeader}>// PROFESSIONAL ASSETS</Text>
                        <Text style={styles.intelContent}>{backgroundPro || "CLASSIFIED"}</Text>
                      </View>
                      <View style={styles.intelBlock}>
                        <Text style={styles.intelHeader}>// LOGISTICS & SKILLS</Text>
                        <Text style={styles.intelContent}>{backgroundHobby || "CLASSIFIED"}</Text>
                      </View>
                      <View style={styles.intelBlock}>
                        <Text style={styles.intelHeader}>// PHYSICAL CAPABILITY</Text>
                        <Text style={styles.intelContent}>{backgroundFit || "CLASSIFIED"}</Text>
                      </View>
                    </View>
                  )}
                </View>

                <TouchableOpacity onPress={() => setMode('broadcast')} style={styles.broadcastBtn}>
                  <Text style={styles.broadcastText}>📡 BROADCAST IDENTITY (QR)</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onStartNewEvent} style={styles.umpireButton}>
                  <Text style={styles.umpireButtonText}>START NEW EVENT</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={onClearLibrary} style={styles.debugBtn}>
                  <Text style={styles.debugText}>DEBUG: CLEAR LIBRARY</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onReset} style={styles.resetBtn}>
                  <Text style={styles.resetText}>⚠ FACTORY RESET IDENTITY</Text>
                </TouchableOpacity>
              </>
            ) : (
              // BROADCAST MODE
              <View style={styles.broadcastView}>
                <View style={styles.qrContainer}>
                  <QRCode 
                    value={JSON.stringify(qrCodePayload)} 
                    size={250}
                    backgroundColor="#050505"
                    color="#00FF00"
                  />
                </View>
                <Text style={styles.broadcastActiveText}>IDENTITY BEACON ACTIVE</Text>
                <Text style={styles.broadcastInstructions}>
                  Authorized operators can scan this beacon to verify your dossier.
                </Text>
                <TouchableOpacity onPress={() => setMode('view')} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>STOP BROADCAST</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
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
  title: { color: '#00FF00', fontWeight: 'bold', fontSize: 16, fontFamily: 'Courier New', letterSpacing: 1 },
  closeText: { color: '#888', fontWeight:'bold', padding: 10 },
  idCard: { 
    flexDirection: 'column',
    backgroundColor: '#111', 
    padding: 20, 
    borderRadius: 10, 
    marginBottom: 5,
    alignItems: 'center', 
    borderLeftWidth: 4, 
    borderColor: '#f59e0b',
    gap: 15,
  },
  handle: { color: '#FFF', fontSize: 24, fontWeight: 'bold' },
  key: { color: '#888', fontSize: 10, fontFamily: 'Courier New', marginVertical: 4, letterSpacing: 1 },
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
    textShadowColor: 'rgba(245, 158, 11, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10
  },
  scoreboard: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#222',
  },
  statLabel: {
      color: '#888',
      fontFamily: 'Courier New',
      fontSize: 12,
  },
  statValue: {
      color: '#00ff00',
      fontFamily: 'Courier New',
      fontSize: 14,
      fontWeight: 'bold',
  },
  genesisText: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'Courier New',
    textAlign: 'center',
    marginBottom: 20,
  },
  section: { marginTop: 10 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: { color: '#888', fontSize: 12, fontWeight:'bold', fontFamily: 'Courier New' },
  editText: { color: '#f59e0b', fontWeight: 'bold', fontFamily: 'Courier New' },
  intelBlocks: { gap: 15 },
  intelBlock: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 5,
    borderLeftWidth: 2,
    borderColor: '#00FF00',
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
  form: { backgroundColor: '#111', padding: 15, borderRadius: 5, gap: 15 },
  label: { color: '#00FF00', fontSize: 10, fontFamily: 'Courier New' },
  input: { 
    backgroundColor: '#000', 
    color: '#00FF00', 
    padding: 12, 
    borderRadius: 5, 
    borderWidth: 1, 
    borderColor: '#003300', 
    fontWeight:'bold',
    fontFamily: 'Courier New',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  saveBtn: { 
    backgroundColor: '#f59e0b', 
    padding: 15, 
    borderRadius: 5, 
    marginTop: 10, 
    alignItems: 'center' 
  },
  saveText: { color: '#000', fontWeight: 'bold', fontFamily: 'Courier New' },
  broadcastBtn: { 
    marginTop: 30, 
    backgroundColor: '#003300', 
    padding: 20, 
    borderRadius: 10, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#00FF00' 
  },
  broadcastText: { color: '#00FF00', fontWeight: 'bold', letterSpacing: 1, fontFamily: 'Courier New' },
  umpireButton: {
    marginTop: 20,
    backgroundColor: '#003300',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00ff00'
  },
  umpireButtonText: {
      color: '#00ff00',
      fontWeight: 'bold',
      fontFamily: 'Courier New',
  },
  secondaryBtn: { 
    marginTop: 20, 
    backgroundColor: '#222', 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center',
    width: '100%',
  },
  secondaryText: { color: '#ccc', fontWeight: 'bold', fontFamily: 'Courier New' },
  debugBtn: { 
    marginTop: 10, 
    padding: 10, 
    alignItems:'center', 
    backgroundColor: '#220000', 
    borderRadius: 5 
  },
  debugText: { color:'#ff6666', fontSize: 10, fontWeight:'bold', fontFamily: 'Courier New' },
  resetBtn: { marginTop: 10, padding: 15, alignItems:'center' },
  resetText: { color:'#330000', fontSize: 10, fontWeight:'bold', fontFamily: 'Courier New' },
  broadcastView: { alignItems: 'center', marginTop: 20 },
  qrContainer: { 
    backgroundColor: '#050505', 
    padding: 15, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: '#00FF00' 
  },
  broadcastActiveText: { 
    color: '#00ff00', 
    marginTop: 20, 
    fontWeight: 'bold', 
    fontFamily: 'Courier New',
    fontSize: 16 
  },
  broadcastInstructions: { 
    color: '#888', 
    textAlign:'center', 
    marginTop: 10, 
    marginBottom: 10, 
    paddingHorizontal: 20,
    fontFamily: 'Courier New'
  },
  umpireContainer: {
    width: '100%',
    alignItems: 'center',
  },
  umpireView: { alignItems: 'center', marginTop: 20, width: '100%' },
  gameHeader: {
    color: '#00ff00',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
    marginBottom: 20,
  },
  gameStat: {
    color: '#00ff00',
    fontSize: 16,
    fontFamily: 'Courier New',
    marginBottom: 20,
  },
  leaderboardContainer: {
    width: '100%',
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#222',
    marginBottom: 20,
  },
});
