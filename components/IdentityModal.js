import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, SafeAreaView, Clipboard } from 'react-native';
import QRCode from 'react-native-qrcode-svg'; // KEEPING YOUR QR LIBRARY

export default function IdentityModal({ visible, onClose, profile, library, onReset }) {
  // SAFEGUARD: Ensure bio exists, even if profile is new
  const safeBio = profile.bio || {};
  
  const [mode, setMode] = useState('view'); // 'view' or 'broadcast'
  const [isEditing, setIsEditing] = useState(false);
  
  // FORM STATE
  const [handle, setHandle] = useState(profile.handle || '');
  const [role, setRole] = useState(safeBio.role || profile.role || '');
  const [expertise, setExpertise] = useState(safeBio.expertise || '');
  const [age, setAge] = useState(safeBio.age || '');
  const [height, setHeight] = useState(safeBio.height || '');
  const [weight, setWeight] = useState(safeBio.weight || '');

  // SYNC STATE ON OPEN
  useEffect(() => {
    if (visible) {
      setHandle(profile.handle || '');
      setRole(safeBio.role || profile.role || '');
      setExpertise(safeBio.expertise || '');
      setAge(safeBio.age || '');
      setHeight(safeBio.height || '');
      setWeight(safeBio.weight || '');
      setMode('view');
      setIsEditing(false);
    }
  }, [visible, profile]);

  const handleSave = () => {
    // 1. Update the profile object in memory (so QR code updates instantly)
    profile.handle = handle;
    profile.role = role;
    profile.bio = { role, expertise, age, height, weight };
    
    // 2. Notify User
    Alert.alert("Dossier Updated", "Identity records patched locally.");
    setIsEditing(false);
  };

  const copyPrivate = () => {
    if (profile.publicKey) {
      Clipboard.setString(profile.publicKey);
      Alert.alert("Copied", "Public Key copied to clipboard.");
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <SafeAreaView style={{flex: 1}}>
          
          <View style={styles.header}>
            <Text style={styles.title}>OPERATOR IDENTITY</Text>
            <TouchableOpacity onPress={onClose}><Text style={styles.closeText}>CLOSE</Text></TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{padding: 20}}>
            
            {/* ID CARD HEADER */}
            <View style={styles.idCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{handle.substring(0,2).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.handle}>{handle.toUpperCase()}</Text>
                <Text style={styles.key}>{profile.publicKey ? profile.publicKey.substring(0, 15) + '...' : 'NO KEY'}</Text>
                <Text style={styles.role}>{role ? role.toUpperCase() : 'OBSERVER CLASS'}</Text>
              </View>
            </View>

            {/* MODE SWITCHER */}
            {mode === 'view' ? (
              <>
                {/* DOSSIER SECTION */}
                <View style={styles.section}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                    <Text style={styles.sectionTitle}>// DOSSIER</Text>
                    <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
                      <Text style={{color:'#f59e0b', fontWeight:'bold'}}>{isEditing ? 'CANCEL EDIT' : 'EDIT RECORDS'}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {isEditing ? (
                    <View style={styles.form}>
                      <Text style={styles.label}>HANDLE (CODENAME)</Text>
                      <TextInput style={styles.input} value={handle} onChangeText={setHandle} placeholder="Codename" placeholderTextColor="#555"/>
                      
                      <Text style={styles.label}>PRIMARY ROLE</Text>
                      <TextInput style={styles.input} value={role} onChangeText={setRole} placeholder="e.g. SCOUT" placeholderTextColor="#555"/>
                      
                      <Text style={styles.label}>EXPERTISE</Text>
                      <TextInput style={styles.input} value={expertise} onChangeText={setExpertise} placeholder="e.g. MEDICAL, COMMS" placeholderTextColor="#555"/>
                      
                      <View style={{flexDirection:'row', gap: 10}}>
                        <View style={{flex:1}}>
                            <Text style={styles.label}>AGE</Text>
                            <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric"/>
                        </View>
                        <View style={{flex:1}}>
                            <Text style={styles.label}>HGT</Text>
                            <TextInput style={styles.input} value={height} onChangeText={setHeight} />
                        </View>
                        <View style={{flex:1}}>
                            <Text style={styles.label}>WGT</Text>
                            <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric"/>
                        </View>
                      </View>

                      <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                        <Text style={styles.saveText}>SAVE RECORDS</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.statsGrid}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>EXPERTISE</Text>
                        <Text style={styles.statVal}>{expertise || 'NONE LISTED'}</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>PHYSICAL</Text>
                        <Text style={styles.statVal}>
                          {age ? `${age}yrs` : '--'} / {height || '--'} / {weight ? `${weight}lbs` : '--'}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* ACTION BUTTONS */}
                <TouchableOpacity onPress={() => setMode('broadcast')} style={styles.broadcastBtn}>
                  <Text style={styles.broadcastText}>📡 BROADCAST IDENTITY (QR)</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={copyPrivate} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryText}>COPY PUBLIC KEY</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={onReset} style={{marginTop: 30, padding: 15, alignItems:'center'}}>
                  <Text style={{color:'#330000', fontSize: 10, fontWeight:'bold'}}>⚠ FACTORY RESET IDENTITY</Text>
                </TouchableOpacity>
              </>
            ) : (
              // BROADCAST MODE
              <View style={{alignItems:'center', marginTop: 20}}>
                <View style={{backgroundColor:'#fff', padding:15, borderRadius:10}}>
                  <QRCode 
                    value={JSON.stringify({
                      type: 'SOURCE_IDENTITY_V1',
                      id: profile.publicKey,
                      payload: {
                        handle: handle,
                        role: role,
                        bio: { age, expertise, height, weight, role } // <--- THE DATA YOU JUST EDITED
                      }
                    })} 
                    size={250}
                  />
                </View>
                <Text style={{color:'#00ff00', marginTop:20, fontWeight:'bold'}}>BEACON ACTIVE</Text>
                <Text style={{color:'#666', textAlign:'center', marginTop:10, marginBottom:30}}>
                  Scan this with another device to transfer your new Dossier.
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
    // --- THE FIX ---
    paddingTop: 60,            // Forces content down (internal spacing)
    paddingHorizontal: 0,      // Keep edges flush
    // ----------------
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20,     // Add side padding to header specifically
    paddingBottom: 20, 
    borderBottomWidth: 1, 
    borderColor: '#222',
    alignItems: 'center'
  },
  title: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  closeText: { color: '#666', fontWeight:'bold', padding: 10 }, // Larger touch target
  
  // ... rest of your styles (idCard, avatar, etc.) remain exactly the same ...
  idCard: { flexDirection: 'row', backgroundColor: '#111', padding: 20, borderRadius: 10, marginBottom: 20, marginHorizontal: 20, alignItems: 'center', borderLeftWidth:4, borderColor:'#00ff00' },
  avatar: { width: 60, height: 60, backgroundColor: '#222', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  handle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  key: { color: '#666', fontSize: 10, fontFamily: 'Courier', marginVertical: 2 },
  role: { color: '#00ff00', fontSize: 12, fontWeight: 'bold' },
  
  section: { marginTop: 10, paddingHorizontal: 20 },
  sectionTitle: { color: '#666', marginBottom: 15, fontSize: 12, fontWeight:'bold' },
  
  statsGrid: { gap: 10 },
  statBox: { backgroundColor: '#111', padding: 15, borderRadius: 5 },
  statLabel: { color: '#666', fontSize: 10, marginBottom: 5 },
  statVal: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  broadcastBtn: { marginTop: 30, marginHorizontal: 20, backgroundColor: '#003300', padding: 20, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#00ff00' },
  broadcastText: { color: '#00ff00', fontWeight: 'bold', letterSpacing: 1 },
  
  secondaryBtn: { marginTop: 10, marginHorizontal: 20, backgroundColor: '#222', padding: 15, borderRadius: 10, alignItems: 'center' },
  secondaryText: { color: '#ccc', fontWeight: 'bold' },

  form: { backgroundColor: '#111', padding: 15, borderRadius: 5 },
  label: { color: '#666', fontSize: 10, marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 5, borderWidth: 1, borderColor: '#333', fontWeight:'bold' },
  saveBtn: { backgroundColor: '#f59e0b', padding: 15, borderRadius: 5, marginTop: 20, alignItems: 'center' },
  saveText: { color: '#000', fontWeight: 'bold' }
});