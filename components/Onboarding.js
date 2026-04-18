import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { generateMnemonicWordList, deriveKeysFromMnemonic } from '../model/Security';

export default function Onboarding({ visible, onComplete }) {
  const [carouselStep, setCarouselStep] = useState(0); 
  // 0-3: Intro Carousel
  // 4: Crypto Generation (Generate or Recover)
  // 5: Show Words
  // 6: Recover Input
  // 7: Profile Dossier (Handle, Hobbies)
  
  // CRYPTO STATE
  const [mnemonic, setMnemonic] = useState(null);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // FORM STATE
  const [handle, setHandle] = useState('');
  const [background_pro, setBackgroundPro] = useState('');
  const [background_hobby, setBackgroundHobby] = useState('');
  const [background_fit, setBackgroundFit] = useState('');

  useEffect(() => {
    if (visible) {
      setCarouselStep(0);
      setMnemonic(null);
      setRecoveryInput('');
      resetForm();
    }
  }, [visible]);

  // Activate screen capture prevention when on the 'Show Words' screen
  useEffect(() => {
    let active = false;
    if (carouselStep === 5) {
      ScreenCapture.preventScreenCaptureAsync().catch(console.warn);
      active = true;
    } else {
      ScreenCapture.allowScreenCaptureAsync().catch(console.warn);
    }
    return () => {
      if (active) ScreenCapture.allowScreenCaptureAsync().catch(console.warn);
    };
  }, [carouselStep]);

  const resetForm = () => {
    setHandle('');
    setBackgroundPro('');
    setBackgroundHobby('');
    setBackgroundFit('');
  };

  const handleGenerateIdentity = () => {
    setIsGenerating(true);
    // Yield to the React Native render thread so the UI actually updates
    setTimeout(() => {
        try {
            const words = generateMnemonicWordList();
            setMnemonic(words);
            setIsGenerating(false);
            setCarouselStep(5); // Show words
        } catch (error) {
            console.error("IDENTITY GENERATION ERROR:", error);
            Alert.alert("Crypto Error", error.message || "Failed to generate entropy pool.");
            setIsGenerating(false);
        }
    }, 100);
  };

  const verifyAndSaveIdentity = async () => {
    if (!mnemonic) return;
    setIsGenerating(true);
    const keys = await deriveKeysFromMnemonic(mnemonic);
    setIsGenerating(false);
    if (keys) {
      setCarouselStep(7); // Move to Dossier
    } else {
      Alert.alert("Error", "Failed to secure identity.");
    }
  };

  const handleRecoverySubmit = async () => {
    if (!recoveryInput || recoveryInput.trim().split(/\s+/).length < 12) {
      Alert.alert("Invalid Phrase", "Please enter a valid 12-word phrase.");
      return;
    }
    setIsGenerating(true);
    const keys = await deriveKeysFromMnemonic(recoveryInput);
    setIsGenerating(false);
    
    if (keys) {
      setCarouselStep(7); // Move to Dossier
    } else {
      Alert.alert("Recovery Failed", "The phrase was invalid or could not generate the keys.");
    }
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

  const renderProgressBar = () => {
    // Only show up to step 4 for the carousel
    if (carouselStep > 4) return null;
    return (
      <View style={styles.progressContainer}>
        {[0, 1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressDot, carouselStep >= s ? styles.progressDotActive : null]} />
        ))}
      </View>
    );
  };

  const carousels = [
    { title: "WELCOME TO JAWW", msg: "JAWW doesn't want your email, and it doesn't use the internet. It works in a cave, on the Artemis, or at a crowded baseball game." },
    { title: "CONTEXT & CREDIT", msg: "Share a BBQ recipe in the room. The original author always gets the credit on the ledger. Become the highest-ranked expert in Virginia Beach based on actual physical mesh shares, not SEO bots." },
    { title: "NO PASSWORDS", msg: "No cloud means no password resets. Your identity is a 12-word cryptographic key. If you lose the words, you lose the account. Write them down." },
    { title: "THE MAGIC TRICK", msg: "If you lose your phone but have your words, you recover your identity. When you walk back into a room with friends who hold the data you previously shared, the mesh automatically syncs and rebuilds your history locally." }
  ];

  return (
    <Modal visible={visible} animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
        
        {renderProgressBar()}

        {/* CAROUSEL SCREENS (0 to 3) */}
        {carouselStep < 4 && (
          <View style={styles.stepBox}>
            <Text style={styles.header}>{carousels[carouselStep].title}</Text>
            <Text style={styles.subHeader}>{carousels[carouselStep].msg}</Text>
          </View>
        )}

        {/* SCREEN 4: CRYPTO FORK (Generate vs Recover) */}
        {carouselStep === 4 && (
          <View style={styles.stepBox}>
            <Text style={styles.header}>SECURE YOUR IDENTITY</Text>
            <Text style={styles.subHeader}>Generate a new sovereign identity, or recover an existing one.</Text>
            
            <TouchableOpacity style={styles.btnFinish} onPress={handleGenerateIdentity} disabled={isGenerating}>
              <Text style={styles.btnTextBlack}>{isGenerating ? "GENERATING..." : "GENERATE NEW IDENTITY"}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.btnFinish, {backgroundColor: '#222', borderColor: '#00ff00', borderWidth: 1}]} onPress={() => setCarouselStep(6)}>
              <Text style={styles.btnTextWhite}>RECOVER EXISTING</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SCREEN 5: SHOW WORDS */}
        {carouselStep === 5 && (
          <View style={styles.stepBox}>
            <Text style={styles.header}>YOUR IDENTITY SEED</Text>
            <Text style={[styles.subHeader, {color: '#ff0000', fontWeight: 'bold'}]}>Screenshots are blocked. Write these down. Do not lose them.</Text>
            
            <View style={styles.wordGrid}>
              {mnemonic?.split(' ').map((word, index) => (
                <View key={index} style={styles.wordBox}>
                  <Text style={styles.wordNumber}>{index + 1}.</Text>
                  <Text style={styles.wordText}>{word}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.btnFinish} onPress={verifyAndSaveIdentity} disabled={isGenerating}>
              <Text style={styles.btnTextBlack}>{isGenerating ? "SAVING..." : "I HAVE WRITTEN THEM DOWN"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SCREEN 6: RECOVER INPUT */}
        {carouselStep === 6 && (
          <View style={styles.stepBox}>
            <Text style={styles.header}>RECOVER IDENTITY</Text>
            <Text style={styles.subHeader}>Enter your 12-word phrase separated by spaces.</Text>
            
            <TextInput 
              style={[styles.input, {height: 120, textAlignVertical: 'top'}]} 
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              value={recoveryInput} 
              onChangeText={setRecoveryInput} 
              placeholder="word1 word2 word3..." 
              placeholderTextColor="#555" 
            />

            <TouchableOpacity style={styles.btnFinish} onPress={handleRecoverySubmit} disabled={isGenerating}>
              <Text style={styles.btnTextBlack}>{isGenerating ? "RECOVERING..." : "RECOVER WALLET"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnBack, {marginTop: 10, alignSelf:'center'}]} onPress={() => setCarouselStep(4)}>
              <Text style={styles.btnTextWhite}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SCREEN 7: DOSSIER (Original Step 1/2) */}
        {carouselStep === 7 && (
          <View style={styles.stepBox}>
            <Text style={styles.header}>TACTICAL OPERATOR DOSSIER</Text>
            
            <Text style={styles.label}>Handle (Codename)</Text>
            <TextInput style={styles.input} value={handle} onChangeText={setHandle} placeholder="e.g. GHOST_7" placeholderTextColor="#555" />
            <Text style={styles.helper}>Your unique identifier on the network.</Text>

            <Text style={[styles.label, {marginTop: 20}]}>Professional Background</Text>
            <TextInput style={styles.input} value={background_pro} onChangeText={setBackgroundPro} placeholder="e.g. Software Engineer, Medic" placeholderTextColor="#555" />
            
            <Text style={[styles.label, {marginTop: 20}]}>Hobbies & Skills</Text>
            <TextInput style={styles.input} value={background_hobby} onChangeText={setBackgroundHobby} placeholder="e.g. Amateur Radio, Lockpicking" placeholderTextColor="#555" />

            <Text style={[styles.label, {marginTop: 20}]}>Physical Activity</Text>
            <TextInput style={styles.input} value={background_fit} onChangeText={setBackgroundFit} placeholder="e.g. Marathon Runner, Rock Climber" placeholderTextColor="#555" />
          </View>
        )}

        {/* NAVIGATION BAR (For Carousel and Dossier only) */}
        {(carouselStep < 5 || carouselStep === 7) && (
          <View style={styles.navBar}>
              {carouselStep === 0 ? (
                  <TouchableOpacity onPress={() => setCarouselStep(1)} style={styles.btnFinish}><Text style={styles.btnTextBlack}>GET STARTED</Text></TouchableOpacity>
              ) : carouselStep < 4 ? (
                  <>
                    <TouchableOpacity onPress={() => setCarouselStep(carouselStep - 1)} style={styles.btnBack}><Text style={styles.btnTextWhite}>BACK</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setCarouselStep(carouselStep + 1)} style={styles.btnNext}><Text style={styles.btnTextBlack}>NEXT</Text></TouchableOpacity>
                  </>
              ) : carouselStep === 7 ? (
                  <TouchableOpacity onPress={handleFinish} style={styles.btnFinish}><Text style={styles.btnTextBlack}>FINISH SETUP</Text></TouchableOpacity>
              ) : null}
          </View>
        )}

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
  progressContainer: { flexDirection: 'row', width: '100%', justifyContent: 'center', marginBottom: 20 },
  progressDot: { height: 4, width: 30, backgroundColor: '#333', marginHorizontal: 5, borderRadius: 2 },
  progressDotActive: { backgroundColor: '#00ff00' },
  header: { color: '#00ff00', fontSize: 24, fontWeight: 'bold', marginBottom: 20, letterSpacing: 2, textAlign: 'center' },
  subHeader: { color: '#ccc', fontSize: 16, marginBottom: 30, lineHeight: 24, textAlign: 'center' },
  stepBox: { width: '100%', flex: 1, justifyContent: 'center' },
  label: { color: '#00ff00', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
  input: { backgroundColor: '#222', color: '#fff', padding: 15, borderRadius: 5, fontSize: 18, borderWidth: 1, borderColor: '#333' },
  helper: { color: '#666', fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 30 },
  wordBox: { width: '48%', backgroundColor: '#222', padding: 10, borderRadius: 5, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  wordNumber: { color: '#666', marginRight: 10, width: 20 },
  wordText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 20 },
  btnBack: { padding: 15 },
  btnNext: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, minWidth: 100, alignItems: 'center' },
  btnFinish: { backgroundColor: '#00ff00', padding: 15, borderRadius: 5, width: '100%', alignItems: 'center', marginTop: 10 },
  btnTextBlack: { color: '#000', fontWeight: 'bold' },
  btnTextWhite: { color: '#fff', fontWeight: 'bold' },
});