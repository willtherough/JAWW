import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform, SafeAreaView, StatusBar, KeyboardAvoidingView } from 'react-native';

export default function ProfileModal({ visible, onClose, currentProfile, onSave }) {
  // Local state for the form
  const [formData, setFormData] = useState({
    handle: '',
    role: '', 
    interests: '', // NEW: For Radar Boosting
    age: '',
    height: '',
    weight: '',
    diet: '',
    expertise: '',
    hobbies: '',
    housing: 'RENT'
  });

  // Load existing data when modal opens
  useEffect(() => {
    if (visible && currentProfile) {
      setFormData({
        handle: currentProfile.handle || '',
        role: currentProfile.role || '',
        // Join array back to string for editing
        interests: currentProfile.interests ? currentProfile.interests.join(', ') : '',
        age: currentProfile.age ? String(currentProfile.age) : '',
        height: currentProfile.height || '',
        weight: currentProfile.weight || '',
        diet: currentProfile.diet || '',
        expertise: currentProfile.expertise || '',
        hobbies: currentProfile.hobbies || '',
        housing: currentProfile.housing || 'RENT'
      });
    }
  }, [visible, currentProfile]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.handle) {
      alert("Operator Handle is required.");
      return;
    }

    // Convert "NFL, Cooking, History" -> ["nfl", "cooking", "history"]
    const interestArray = formData.interests
      .split(',')
      .map(i => i.trim().toLowerCase())
      .filter(i => i !== "");

    const cleanProfile = {
      ...currentProfile,
      handle: formData.handle,
      role: formData.role,
      interests: interestArray, // Saving as clean array
      age: formData.age,
      height: formData.height,
      weight: formData.weight,
      diet: formData.diet,
      expertise: formData.expertise,
      hobbies: formData.hobbies,
      housing: formData.housing,
      is_onboarded: true
    };

    onSave(cleanProfile);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>OPERATOR BIO-DATA</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 10 }}>
              <Text style={styles.closeLink}>CANCEL</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView style={styles.form}>
              
              <Text style={styles.sectionHeader}>// IDENTITY</Text>
              
              <Text style={styles.label}>OPERATOR HANDLE (Required)</Text>
              <TextInput 
                style={styles.input} 
                value={formData.handle} 
                onChangeText={t => handleChange('handle', t)}
                placeholder="e.g. Will_History" 
                placeholderTextColor="#555"
              />

              <Text style={styles.label}>PRIMARY ARCHETYPE / ROLE</Text>
              <TextInput 
                style={styles.input} 
                value={formData.role} 
                onChangeText={t => handleChange('role', t)}
                placeholder="e.g. The NFL Guy, Medic, Mechanic" 
                placeholderTextColor="#555"
              />

              {/* NEW SECTION: RADAR PREFERENCES */}
              <Text style={styles.sectionHeader}>// RADAR PREFERENCES</Text>
              <Text style={styles.label}>INTERESTS (Comma separated - e.g. nfl, history, cooking)</Text>
              <TextInput 
                style={[styles.input, { borderColor: '#00ff00', borderWidth: 1 }]} 
                value={formData.interests} 
                onChangeText={t => handleChange('interests', t)}
                placeholder="Keywords to boost on your Radar" 
                placeholderTextColor="#555"
              />

              <Text style={styles.sectionHeader}>// PHYSIOLOGICAL DATA</Text>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>AGE</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="40" placeholderTextColor="#555"
                    value={formData.age} onChangeText={t => handleChange('age', t)} />
                </View>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.label}>HEIGHT</Text>
                  <TextInput style={styles.input} placeholder="5'6" placeholderTextColor="#555"
                    value={formData.height} onChangeText={t => handleChange('height', t)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>WEIGHT (lbs)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="168" placeholderTextColor="#555"
                    value={formData.weight} onChangeText={t => handleChange('weight', t)} />
                </View>
              </View>

              <Text style={styles.sectionHeader}>// EXPERTISE & CONTEXT</Text>
              <Text style={styles.label}>SPECIALIZATIONS (Degrees, Skills)</Text>
              <TextInput 
                style={styles.input} 
                value={formData.expertise} 
                onChangeText={t => handleChange('expertise', t)}
                placeholder="e.g. History Degree, React Native" 
                placeholderTextColor="#555"
              />
              <Text style={styles.label}>LIMITATIONS / DIET</Text>
              <TextInput 
                style={styles.input} 
                value={formData.diet} 
                onChangeText={t => handleChange('diet', t)}
                placeholder="e.g. Gluten Free, Keto" 
                placeholderTextColor="#555"
              />

              <View style={{ height: 40 }} />

              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>UPDATE BIO-DATA</Text>
              </TouchableOpacity>
              
              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#333' },
  headerTitle: { color: '#fff', fontSize: 18, fontFamily: 'Courier', fontWeight: 'bold' },
  closeLink: { color: '#f59e0b', fontSize: 14, fontFamily: 'Courier' },
  form: { padding: 20 },
  sectionHeader: { color: '#00ff00', fontFamily: 'Courier', fontSize: 14, marginTop: 25, marginBottom: 10, fontWeight: 'bold' },
  label: { color: '#888', fontSize: 10, fontFamily: 'Courier', marginBottom: 5, marginTop: 10 },
  input: { backgroundColor: '#252525', color: '#fff', padding: 15, borderRadius: 5, fontSize: 16, borderWidth: 1, borderColor: '#333', fontFamily: 'Courier' },
  row: { flexDirection: 'row' },
  saveButton: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: '#000', fontWeight: 'bold', fontFamily: 'Courier' }
});