import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Vibration, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import BluetoothService from '../services/BluetoothService';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { parseReceiptData } from '../utils/ReceiptParser';

export default function RosettaScannerModal({ visible, onClose, onScanComplete }) {
    const [permission, requestPermission] = useCameraPermissions();
    const isProcessingRef = useRef(false);

    useEffect(() => {
        if (visible && !permission?.granted) {
            requestPermission();
        }
    }, [visible, permission]);

    // Yield System implementation
    useEffect(() => {
        if (visible) {
            isProcessingRef.current = false;
            // 1. Force the Bluetooth background hunt to yield CPU cycles to the camera
            BluetoothService.pauseAutomatedHunt();
        } else {
            // 2. Resume the mesh when the camera closes
            BluetoothService.resumeAutomatedHunt();
        }
    }, [visible]);

    const cameraRef = useRef(null);
    const [isCapturing, setIsCapturing] = useState(false);

    const handleCaptureReceipt = async () => {
        if (!cameraRef.current || isCapturing) return;

        setIsCapturing(true);
        Vibration.vibrate([0, 50, 50, 50]); 

        try {
            console.log(`>> ROSETTA: Capturing high-res image for NLP...`);
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                skipProcessing: true
            });

            console.log(`>> ROSETTA: Processing OCR...`);
            const result = await TextRecognition.recognize(photo.uri);
            
            console.log(`>> ROSETTA: Parsing Receipt Payload...`);
            // The result.text is a single string containing all recognized text separated by newlines
            const parsedReceipt = parseReceiptData(result.text);

            if (parsedReceipt && parsedReceipt.items.length > 0) {
                Vibration.vibrate([0, 100, 100, 100]); // Success pattern
                onScanComplete(parsedReceipt);
            } else {
                Alert.alert("OCR Failed", "Could not parse any line items or prices from the receipt. Please try again with better lighting.");
            }
        } catch (error) {
            console.error(">> ROSETTA OCR ERROR:", error);
            Alert.alert("OCR Error", "Failed to process the receipt image.");
        } finally {
            setIsCapturing(false);
        }
    };

    if (!permission) return <View />;
    
    if (!permission.granted) {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.overlay}>
                    <Text style={{color: '#ff0000', fontFamily: 'Courier'}}>Camera access required for Rosetta Scanner.</Text>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Text style={styles.headerTitle}>ROSETTA RECEIPT OCR</Text>
                <Text style={styles.subTitle}>Align Receipt in Target Window...</Text>
                
                <View style={styles.cameraContainer}>
                    <CameraView 
                        style={StyleSheet.absoluteFillObject} 
                        ref={cameraRef}
                        facing="back"
                    />
                    
                    {/* OCR Targeting Reticle */}
                    <View style={styles.targetOverlay}>
                        <View style={styles.scanWindow} />
                    </View>
                </View>

                {/* REAL OCR BUTTON */}
                <TouchableOpacity onPress={handleCaptureReceipt} style={[styles.closeButton, { borderColor: '#10B981', marginTop: 20, backgroundColor: 'rgba(16, 185, 129, 0.1)' }]} disabled={isCapturing}>
                    {isCapturing ? (
                        <ActivityIndicator color="#10B981" />
                    ) : (
                        <Text style={[styles.closeButtonText, { color: '#10B981' }]}>[ CAPTURE RECEIPT ]</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>ABORT SCAN</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#10B981', fontFamily: 'Courier', fontSize: 20, fontWeight: 'bold', marginBottom: 10, letterSpacing: 2 },
    subTitle: { color: '#94A3B8', fontFamily: 'Courier', fontSize: 12, marginBottom: 30 },
    cameraContainer: {
        width: '90%', 
        height: 200, 
        backgroundColor: '#000', 
        borderRadius: 10, 
        overflow: 'hidden', 
        borderWidth: 2, 
        borderColor: '#10B981',
    },
    targetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    scanWindow: { 
        width: '90%', 
        height: '60%', 
        borderWidth: 1, 
        borderColor: 'rgba(16, 185, 129, 0.4)', // Faded green
        borderRadius: 5 
    },
    closeButton: { marginTop: 40, paddingHorizontal: 30, paddingVertical: 12, borderWidth: 1, borderColor: '#64748B', borderRadius: 8 },
    closeButtonText: { color: '#94A3B8', fontFamily: 'Courier', fontWeight: 'bold' }
});
