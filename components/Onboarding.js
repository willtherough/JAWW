import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { TOPICS, CREDENTIALS } from '../model/Definitions'; 

export default function Onboarding({ visible, onComplete, initialData }) {
  const [mode, setMode] = useState('wizard'); // 'wizard' (new) or 'menu' (edit)
  const [step, setStep] = useState(0); 
  
  // FORM STATE
  const [handle, setHandle] = useState('');
  const [roles, setRoles] = useState('');
  const [bgPro, setBgPro] = useState('');
  const [bgHobby, setBgHobby] = useState('');
  const [bgFit, setBgFit] = useState('');
  const [interests, setInterests] = useState([]); 

  // INITIALIZATION & RESTORE
  useEffect(() => {
    if (visible) {
      if (initialData) {
        // EDIT MODE: Load Data & Show Menu
        setMode('menu');
        setHandle(initialData.handle || '');
        setRoles(initialData.roles || '');
        setBgPro(initialData.background_pro || '');
        setBgHobby(initialData.background_hobby || '');
        setBgFit(initialData.background_fit || '');
        setInterests(Array.isArray(initialData.interests) ? initialData.interests : []);
      } else {
        // NEW USER: Start at Mission Screen
        setMode('wizard');
        setStep(0); 
        resetForm();
      }
    }
  }, [visible, initialData]);

  const resetForm = () => {
    setHandle(''); setRoles(''); setBgPro(''); setBgHobby(''); setBgFit(''); setInterests([]);
  };

  const toggleInterest = (id) => {
    if (interests.includes(id)) setInterests(interests.filter(i => i !== id));
    else setInterests([...interests, id]);
  };

  // --- LOGIC: CALCULATE RANK (RESTORED) ---
  const calculateRank = () => {
    // If editing, preserve old rank unless we want to recalc (usually we preserve)
    if (initialData && initialData.rank_tier) return initialData.rank_tier;

    const combinedText = (bgPro + " " + bgFit + " " + bgHobby).toLowerCase();
    
    // Check CREDENTIALS definitions if they exist
    if (CREDENTIALS && CREDENTIALS.expert && CREDENTIALS.expert.some(k => combinedText.includes(k))) return 'expert';
    if (CREDENTIALS && CREDENTIALS.advanced && CREDENTIALS.advanced.some(k => combinedText.includes(k))) return 'advanced';
    
    return 'standard';
  };

  const handleFinish = () => {
    if (!handle.trim()) {
      Alert.alert("Missing Data", "Operator Handle is required.");
      return;
    }

    const finalRank = calculateRank();
    
    const profileData = {
      handle: handle.trim(),
      roles: roles || [bgPro, bgFit].filter(Boolean).join(', '), // Fallback to backgrounds if roles empty
      background_pro: bgPro,
      background_hobby: bgHobby,
      background_fit: bgFit,
      interests: interests,
      rank_tier: finalRank,
      genesis_date: initialData ? initialData.genesis_date : new Date().toISOString()
    };
    onComplete(profileData);
  };

  // --- RENDER 1: EDIT MENU (Existing Users) ---
  if (mode === 'menu') {
      return (
        <Modal visible={visible} animationType="slide">
            <View style={styles.container}>
                <Text style={styles.header}>DOSSIER SETTINGS</Text>
                <Text style={styles.subHeader}>SELECT SECTOR TO MODIFY</Text>

                <ScrollView style={{width: '100%'}}>
                    <TouchableOpacity onPress={() => { setStep(1); setMode('edit_single'); }} style={styles.menuItem}>
                        <Text style={styles.menuLabel}>IDENTITY / HANDLE</Text>
                        <Text style={styles.menuValue}>{handle}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => { setStep(2); setMode('edit_single'); }} style={styles.menuItem}>
                        <Text style={styles.menuLabel}>ROLES / BADGES</Text>
                        <Text style={styles.menuValue}>{roles || 'None'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => { setStep(3); setMode('edit_single'); }} style={styles.menuItem}>
                        <Text style={styles.menuLabel}>BACKGROUND</Text>
                        <Text style={styles.menuValue}>{bgPro || '-'} / {bgHobby || '-'} / {bgFit || '-'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => { setStep(4); setMode('edit_single'); }} style={styles.menuItem}>
                        <Text style={styles.menuLabel}>INTERESTS</Text>
                        <Text style={styles.menuValue}>{interests.length > 0 ? `${interests.length} Topics` : 'None'}</Text>
                    </TouchableOpacity>
                </ScrollView>

                <TouchableOpacity onPress={handleFinish} style={styles.btnFinish}>
                    <Text style={styles.btnTextBlack}>💾 SAVE & COMMIT CHANGES</Text>
                </TouchableOpacity>
            </View>
        </Modal>
      );
  }

  // --- RENDER 2: WIZARD FLOW (New Users) ---
  return (
    <Modal visible={visible} animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        
        {/* STEP 0: MISSION STATEMENT (RESTORED) */}
        {step === 0 && (
          <View style={styles.stepBox}>
            <Text style={styles.logo}>THE SOURCE</Text>
            <Text style={styles.missionTitle}>CONTEXT FOR INFORMATION</Text>
            <View style={styles.missionBox}>
                <Text style={styles.missionText}>"The Internet is full of useful information, but so is the world around you."</Text>
                <Text style={styles.missionText}>The Source allows you to find information from experts in the real world, without access to the web.</Text>
            </View>
          </View>
        )}

        {/* STEP 1: IDENTITY */}
        {step === 1 && (
          <View style={styles.stepBox}>
            <Text style={styles.label}>OPERATOR HANDLE</Text>
            <TextInput style={styles.input} value={handle} onChangeText={setHandle} placeholder="e.g. NEO_1" placeholderTextColor="#555" />
            <Text style={styles.helper}>This creates your Cryptographic Key.</Text>
          </View>
        )}

        {/* STEP 2: ROLES */}
        {step === 2 && (
          <View style={styles.stepBox}>
            <Text style={styles.label}>PRIMARY ROLES</Text>
            <TextInput style={styles.input} value={roles} onChangeText={setRoles} placeholder="e.g. Intel, Logistics" placeholderTextColor="#555" />
            <Text style={styles.helper}>Comma separated tags visible on your ID.</Text>
          </View>
        )}

        {/* STEP 3: BACKGROUND (SMART DETECTION RESTORED) */}
        {step === 3 && (
          <View style={styles.stepBox}>
            <Text style={styles.label}>PROFESSIONAL</Text>
            <TextInput style={styles.input} value={bgPro} onChangeText={setBgPro} placeholder="Occupation / Degree" placeholderTextColor="#555" />
            
            <Text style={[styles.label, {marginTop: 20}]}>HOBBY / SKILL</Text>
            <TextInput style={styles.input} value={bgHobby} onChangeText={setBgHobby} placeholder="Passion" placeholderTextColor="#555" />

            <Text style={[styles.label, {marginTop: 20}]}>PHYSICAL FIT</Text>
            <TextInput style={styles.input} value={bgFit} onChangeText={setBgFit} placeholder="Athletics" placeholderTextColor="#555" />
            
            {/* SMART FEEDBACK */}
            {(bgPro + bgFit).toLowerCase().includes('phd') && <Text style={styles.detected}>✨ DETECTED: EXPERT TIER (PhD)</Text>}
            {(bgPro + bgFit).toLowerCase().includes('varsity') && <Text style={styles.detected}>✨ DETECTED: ATHLETIC BACKGROUND</Text>}
          </View>
        )}

        {/* STEP 4: INTERESTS */}
        {step === 4 && (
          <View style={styles.stepBox}>
            <Text style={styles.label}>TOPICS OF INTEREST</Text>
            <ScrollView style={{ maxHeight: 400, marginTop: 10 }}>
                <View style={styles.grid}>
                    {TOPICS.map((t) => (
                        <TouchableOpacity key={t.id} onPress={() => toggleInterest(t.id)} style={[styles.topicBox, interests.includes(t.id) && styles.topicBoxActive]}>
                            <Text style={styles.topicIcon}>{t.icon}</Text>
                            <Text style={[styles.topicText, interests.includes(t.id) && {color: '#000'}]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
          </View>
        )}

        {/* NAVIGATION */}
        <View style={styles.navBar}>
            {mode === 'edit_single' ? (
                <TouchableOpacity onPress={() => setMode('menu')} style={styles.btnBack}><Text style={styles.btnTextWhite}>DONE</Text></TouchableOpacity>
            ) : (
                <>
                   {/* Only show NEXT on Step 0, or if fields are filled */}
                   {step === 0 ? (
                       <TouchableOpacity onPress={() => setStep(1)} style={styles.btnFinish}><Text style={styles.btnTextBlack}>BEGIN MISSION</Text></TouchableOpacity>
                   ) : (
                       <>
                        <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.btnBack}><Text style={styles.btnTextWhite}>BACK</Text></TouchableOpacity>
                        {step < 4 ? (
                            <TouchableOpacity onPress={() => setStep(step + 1)} style={styles.btnNext}><Text style={styles.btnTextBlack}>NEXT</Text></TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleFinish} style={styles.btnFinish}><Text style={styles.btnTextBlack}>INITIALIZE</Text></TouchableOpacity>
                        )}
                       </>
                   )}
                </>
            )}
        </View>

      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', padding: 30, justifyContent: 'center', alignItems: 'center' },
  header: { color: '#00ff00', fontSize: 24, fontWeight: 'bold', marginBottom: 5, letterSpacing: 2 },
  subHeader: { color: '#666', fontSize: 12, marginBottom: 30, letterSpacing: 1 },
  
  // MISSION STYLES (RESTORED)
  logo: { color: '#00ff00', fontSize: 40, fontWeight: '900', textAlign: 'center', marginBottom: 10, letterSpacing: 2 },
  missionTitle: { color: '#fff', fontSize: 14, textAlign: 'center', marginBottom: 40, fontFamily: 'Courier', letterSpacing: 1 },
  missionBox: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 10, marginBottom: 40, borderLeftWidth: 4, borderLeftColor: '#00ff00' },
  missionText: { color: '#ddd', fontSize: 16, lineHeight: 24, marginBottom: 15, fontFamily: 'Courier' },

  menuItem: { width: '100%', backgroundColor: '#222', padding: 20, marginBottom: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  menuLabel: { color: '#888', fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  menuValue: { color: '#fff', fontSize: 16 },

  stepBox: { width: '100%', flex: 1, justifyContent: 'center' },
  label: { color: '#00ff00', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 5, fontSize: 18, borderWidth: 1, borderColor: '#333' },
  helper: { color: '#666', fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  detected: { color: '#f59e0b', fontSize: 12, fontWeight: 'bold', marginTop: 5, marginBottom: 5 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  topicBox: { width: '48%', backgroundColor: '#333', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  topicBoxActive: { backgroundColor: '#00ff00' },
  topicIcon: { fontSize: 24, marginBottom: 5 },
  topicText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  navBar: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  btnBack: { padding: 15 },
  btnNext: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, minWidth: 100, alignItems: 'center' },
  btnFinish: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, width: '100%', alignItems: 'center', marginTop: 10 },
  
  btnTextBlack: { color: '#000', fontWeight: 'bold' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
});