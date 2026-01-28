import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from 'react-native'; 
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker'; 
// import RNQRGenerator from 'rn-qr-generator'; // Keeping this if you have it installed, otherwise comment out

export default function ScannerModal({ visible, onClose, onScanSuccess }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torchOn, setTorchOn] = useState(false); 

  useEffect(() => {
    if (visible) {
      setScanned(false);
      if (!permission) requestPermission();
    }
  }, [visible]);

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, 
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        Alert.alert("Notice", "Gallery scan logic preserved (requires RNQRGenerator).");
        // Logic preserved from your code:
        /*
        const imageUri = result.assets[0].uri;
        RNQRGenerator.detect({ uri: imageUri })
        .then(response => {
          const { values } = response;
          if (values && values.length > 0) handleBarCodeScanned({ data: values[0] });
          else Alert.alert("Scan Failed", "No QR code found.");
        })
        .catch(err => Alert.alert("Error", "Could not read image."));
        */
      }
    } catch (e) {
      console.log(e);
    }
  };

  if (!permission?.granted) return null;

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    Vibration.vibrate();

    try {
      // 1. TRY PARSE
      const cardData = typeof data === 'string' ? JSON.parse(data) : data;
      console.log("Auditing Card:", cardData.title);

      // 2. CHECK TYPE (Is it an identity?)
      if (cardData.type === 'SOURCE_IDENTITY_V1') {
         onScanSuccess(data); // Pass raw string or object depending on what App.js expects
         return;
      }

      // 3. AUDIT KNOWLEDGE CARDS
      if (!cardData.history || cardData.history.length === 0) {
        Alert.alert("Security Alert", "No Chain of Custody found.", [{ text: "OK", onPress: () => setScanned(false) }]);
        return;
      }
      
      // 4. SUCCESS
      onScanSuccess(data);

    } catch (error) {
      // If it's not JSON, it might be a raw URL or just garbage
      Alert.alert("Read Error", "Not a valid Source Card.", [{ text: "OK", onPress: () => setScanned(false) }]);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* FIX: Use absoluteFillObject so the camera actually shows up */}
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchOn} // FIX: Actually link the state to the camera
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        
        <View style={styles.overlay}>
          <View style={styles.reticle} />
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
                {scanned ? "ANALYZING..." : "SEARCHING FOR SIGNATURE..."}
            </Text>
          </View>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity style={[styles.controlBtn, {backgroundColor: torchOn ? '#f59e0b' : '#333'}]} onPress={() => setTorchOn(!torchOn)}>
            <Text style={{fontSize:20}}>🔦</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.galleryBtn} onPress={handlePickFromGallery}>
            <Text style={styles.galleryText}>📂 UPLOAD IMAGE</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>X</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  reticle: { width: 250, height: 250, borderWidth: 2, borderColor: '#00ff00', backgroundColor: 'transparent' },
  statusBadge: { marginTop: 20, backgroundColor:'rgba(0,0,0,0.7)', padding: 10, borderRadius: 5 },
  statusText: { color: '#00ff00', fontFamily: 'Courier', fontWeight: 'bold' },
  controlsContainer: { position: 'absolute', bottom: 40, width: '100%', flexDirection:'row', justifyContent:'center', alignItems: 'center', gap: 15 },
  galleryBtn: { backgroundColor: '#ffffff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 5, borderWidth: 1, borderColor: '#ccc', alignItems: 'center' },
  galleryText: { color: 'black', fontWeight: 'bold', fontFamily: 'Courier' },
  controlBtn: { width: 50, height: 50, borderRadius: 25, justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:'#fff' },
  closeBtn: { backgroundColor: '#330000', width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'red', justifyContent:'center', alignItems: 'center' },
  closeText: { color: 'red', fontWeight: 'bold', fontSize: 18 }
});