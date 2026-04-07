import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';

export default function Onboarding({ visible, onComplete }) {
  const [step, setStep] = useState(0); 
  
  // FORM STATE
  const [handle, setHandle] = useState('');
  const [background_pro, setBackgroundPro] = useState('');
  const [background_hobby, setBackgroundHobby] = useState('');
  const [background_fit, setBackgroundFit] = useState('');

  useEffect(() => {
    if (visible) {
      setStep(0);
      resetForm();
    }
  }, [visible]);

  const resetForm = () => {
    setHandle('');
    setBackgroundPro('');
    setBackgroundHobby('');
    setBackgroundFit('');
  };

  const handleFinish = () => {
    if (!handle.trim()) {
      Alert.alert("Missing Data", "Handle (Codename) is required.");
      return;
    }

    const rank_tier = (background_pro.trim() && background_hobby.trim() && background_fit.trim()) ? 'VETERAN' : 'SCOUT';
    
    const profileData = {
      handle: handle.trim(),
      background_pro: background_pro.trim(),
      background_hobby: background_hobby.trim(),
      background_fit: background_fit.trim(),
      rank_tier,
      genesis_date: new Date().toISOString()
    };
    onComplete(profileData);
  };

  return (
    <Modal visible={visible} animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        
        {step === 0 && (
          <View style={styles.stepBox}>
            <Text style={styles.header}>TACTICAL OPERATOR DOSSIER</Text>
            <Text style={styles.subHeader}>CREATE YOUR IDENTITY</Text>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepBox}>
            <Text style={styles.label}>Handle (Codename)</Text>
            <TextInput style={styles.input} value={handle} onChangeText={setHandle} placeholder="e.g. GHOST_7" placeholderTextColor="#555" />
            <Text style={styles.helper}>Your unique identifier on the network.</Text>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBox}>
            <Text style={styles.label}>Professional Background</Text>
            <TextInput style={styles.input} value={background_pro} onChangeText={setBackgroundPro} placeholder="e.g. Software Engineer, Medic" placeholderTextColor="#555" />
            
            <Text style={[styles.label, {marginTop: 20}]}>Hobbies & Skills</Text>
            <TextInput style={styles.input} value={background_hobby} onChangeText={setBackgroundHobby} placeholder="e.g. Amateur Radio, Lockpicking" placeholderTextColor="#555" />

            <Text style={[styles.label, {marginTop: 20}]}>Physical Activity</Text>
            <TextInput style={styles.input} value={background_fit} onChangeText={setBackgroundFit} placeholder="e.g. Marathon Runner, Rock Climber" placeholderTextColor="#555" />
          </View>
        )}

        <View style={styles.navBar}>
            {step === 0 ? (
                <TouchableOpacity onPress={() => setStep(1)} style={styles.btnFinish}><Text style={styles.btnTextBlack}>BEGIN</Text></TouchableOpacity>
            ) : (
                <>
                  <TouchableOpacity onPress={() => setStep(step - 1)} style={styles.btnBack}><Text style={styles.btnTextWhite}>BACK</Text></TouchableOpacity>
                  {step < 2 ? (
                      <TouchableOpacity onPress={() => setStep(step + 1)} style={styles.btnNext}><Text style={styles.btnTextBlack}>NEXT</Text></TouchableOpacity>
                  ) : (
                      <TouchableOpacity onPress={handleFinish} style={styles.btnFinish}><Text style={styles.btnTextBlack}>CREATE DOSSIER</Text></TouchableOpacity>
                  )}
                </>
            )}
        </View>

      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#111', 
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 30,
    justifyContent: 'center', 
    alignItems: 'center',
    ...Platform.select({
      android: {
        paddingTop: (StatusBar.currentHeight || 0) + 10,
        paddingBottom: 60,
      }
    })
  },
  header: { color: '#00ff00', fontSize: 24, fontWeight: 'bold', marginBottom: 5, letterSpacing: 2, textAlign: 'center' },
  subHeader: { color: '#666', fontSize: 12, marginBottom: 30, letterSpacing: 1, textAlign: 'center' },
  stepBox: { width: '100%', flex: 1, justifyContent: 'center' },
  label: { color: '#00ff00', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 5, fontSize: 18, borderWidth: 1, borderColor: '#333' },
  helper: { color: '#666', fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  btnBack: { padding: 15 },
  btnNext: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, minWidth: 100, alignItems: 'center' },
  btnFinish: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, width: '100%', alignItems: 'center', marginTop: 10 },
  btnTextBlack: { color: '#000', fontWeight: 'bold' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
});