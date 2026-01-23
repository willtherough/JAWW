import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform, SafeAreaView, StatusBar, KeyboardAvoidingView } from 'react-native';

export default function ProfileModal({ visible, onClose, currentProfile, onSave }) {
  // Local state for the form
  const [formData, setFormData] = useState({
    handle: '',
    age: '',
    height: '',
    weight: '',
    diet: '',
    expertise: '',
    hobbies: '',
    housing: 'RENT' // Default
  });

  // Load existing data when modal opens
  useEffect(() => {
    if (visible && currentProfile) {
      setFormData({
        handle: currentProfile.handle || '',
        age: currentProfile.age ? String(currentProfile.age) : '',
        height: currentProfile.height || '',
        weight: currentProfile.weight ? String(currentProfile.weight) : '',
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
    // Basic validation
    if (!formData.handle) {
      alert("Operator Handle is required.");
      return;
    }

    // Prepare clean object for storage
    const cleanProfile = {
      ...currentProfile, // keep ID
      handle: formData.handle,
      age: formData.age,
      height: formData.height,
      weight: formData.weight,
      diet: formData.diet,
      expertise: formData.expertise,
      hobbies: formData.hobbies,
      housing: formData.housing,
      is_onboarded: true // Mark as setup complete
    };

    onSave(cleanProfile);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>OPERATOR BIO-DATA</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 10 }}>
              <Text style={styles.closeLink}>CANCEL</Text>
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView style={styles.form}>
              
              {/* SECTION 1: IDENTITY */}
              <Text style={styles.sectionHeader}>// IDENTITY</Text>
              <Text style={styles.label}>OPERATOR HANDLE (Required)</Text>
              <TextInput 
                style={styles.input} 
                value={formData.handle} 
                onChangeText={t => handleChange('handle', t)}
                placeholder="e.g. Will_History" 
                placeholderTextColor="#555"
              />

              {/* SECTION 2: PHYSIOLOGICAL */}
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

              {/* SECTION 3: DIETARY NEEDS */}
              <Text style={styles.sectionHeader}>// DIETARY PROTOCOLS</Text>
              <Text style={styles.label}>LIMITATIONS / CHOICES</Text>
              <TextInput 
                style={styles.input} 
                value={formData.diet} 
                onChangeText={t => handleChange('diet', t)}
                placeholder="e.g. Gluten Free, Keto, Diabetic..." 
                placeholderTextColor="#555"
              />

              {/* SECTION 4: EXPERTISE */}
              <Text style={styles.sectionHeader}>// EXPERTISE & HOBBIES</Text>
              <Text style={styles.label}>SPECIALIZATIONS (Work, Degree, Skills)</Text>
              <TextInput 
                style={styles.input} 
                value={formData.expertise} 
                onChangeText={t => handleChange('expertise', t)}
                placeholder="e.g. History Degree, React Native, Carpentry" 
                placeholderTextColor="#555"
              />
              <Text style={styles.label}>HOBBIES / INTERESTS</Text>
              <TextInput 
                style={styles.input} 
                value={formData.hobbies} 
                onChangeText={t => handleChange('hobbies', t)}
                placeholder="e.g. Guitar, Cars, Writing" 
                placeholderTextColor="#555"
              />

              {/* SECTION 5: HOUSING */}
              <Text style={styles.sectionHeader}>// BASE OF OPERATIONS</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                <TouchableOpacity 
                  onPress={() => handleChange('housing', 'OWN')}
                  style={[styles.radioBtn, formData.housing === 'OWN' && styles.radioBtnActive]}
                >
                  <Text style={[styles.radioText, formData.housing === 'OWN' && {color: '#000'}]}>HOMEOWNER</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleChange('housing', 'RENT')}
                  style={[styles.radioBtn, formData.housing === 'RENT' && styles.radioBtnActive]}
                >
                  <Text style={[styles.radioText, formData.housing === 'RENT' && {color: '#000'}]}>RENTER</Text>
                </TouchableOpacity>
              </View>

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
  
  radioBtn: { padding: 10, borderWidth: 1, borderColor: '#666', borderRadius: 5, flex: 1, alignItems: 'center' },
  radioBtnActive: { backgroundColor: '#00ff00', borderColor: '#00ff00' },
  radioText: { color: '#666', fontFamily: 'Courier', fontWeight: 'bold' },

  saveButton: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 30 },
  saveButtonText: { color: '#000', fontWeight: 'bold', fontFamily: 'Courier' }
});