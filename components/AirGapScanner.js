import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function AirGapScanner({ visible, onClose, onTransferComplete }) {
    const [permission, requestPermission] = useCameraPermissions();
    const isProcessingRef = useRef(false);

    useEffect(() => {
        if (visible && !permission?.granted) {
            requestPermission();
        }
    }, [visible, permission]);

    useEffect(() => {
        if (visible) {
            isProcessingRef.current = false;
        }
    }, [visible]);

    const handleFrameScanned = ({ data }) => {
        if (isProcessingRef.current) return;
        
        if (data && data.startsWith('JAWW-QR-BLE:')) {
            isProcessingRef.current = true;
            const parts = data.split(':');
            if (parts.length >= 3) {
                const targetHandle = parts[1];
                const targetCardId = parts[2];

                Vibration.vibrate([0, 100, 50, 100]); // Success pattern
                
                // Pass the BLE pointer back to App.js to initiate GATT connection
                onTransferComplete({ isBlePointer: true, handle: targetHandle, cardId: targetCardId });
            }
            onClose();
        }
    };

    if (!permission) return <View />;
    
    if (!permission.granted) {
        return (
            <Modal visible={visible} transparent animationType="fade">
                <View style={styles.overlay}>
                    <Text style={{color: '#ff0000'}}>Camera access required for Tactical Intel.</Text>
                </View>
            </Modal>
        );
    }

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <Text style={styles.headerTitle}>SCANNING MESH POINTER</Text>
                
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        onBarcodeScanned={isProcessingRef.current ? undefined : handleFrameScanned}
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                    />
                    
                    <View style={styles.targetOverlay}>
                        <View style={styles.crosshair} />
                    </View>
                </View>

                <Text style={styles.awaitingText}>AWAITING QR SIGNAL...</Text>

                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>ABORT</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#10B981', fontFamily: 'Courier', fontSize: 18, fontWeight: 'bold', marginBottom: 30, letterSpacing: 2 },
    cameraContainer: {
        width: '85%', aspectRatio: 1, backgroundColor: '#000', borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: '#10B981',
    },
    targetOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    crosshair: { width: 100, height: 100, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.4)', borderRadius: 50 },
    awaitingText: { color: '#64748B', fontFamily: 'Courier', fontSize: 12, marginTop: 30 },
    closeButton: { marginTop: 40, paddingHorizontal: 30, paddingVertical: 12, borderWidth: 1, borderColor: '#64748B', borderRadius: 8 },
    closeButtonText: { color: '#94A3B8', fontFamily: 'Courier', fontWeight: 'bold' }
});
