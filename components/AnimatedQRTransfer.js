import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function AnimatedQRTransfer({ payload, onClose }) {
    if (!payload || !payload.handle || !payload.cardId) return null;

    const qrString = `JAWW-QR-BLE:${payload.handle}:${payload.cardId}`;

    return (
        <View style={styles.container}>
            <Text style={styles.warningTitle}>SHARE</Text>
            <Text style={styles.instructionText}>
                Scan this card to request it securely via the mesh.
            </Text>

            <View style={styles.qrWrapper}>
                <QRCode
                    value={qrString}
                    size={280}
                    color="#F8FAFC"
                    backgroundColor="#000000"
                    ecl="L"
                />
            </View>

            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelText}>CLOSE</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    warningTitle: {
        color: '#10B981',
        fontFamily: 'Courier',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10,
        letterSpacing: 2,
    },
    instructionText: {
        color: '#94A3B8',
        fontFamily: 'Courier',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 18,
    },
    qrWrapper: {
        padding: 20,
        backgroundColor: '#000',
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#10B981',
        marginBottom: 30,
    },
    cancelButton: {
        borderWidth: 1,
        borderColor: '#64748B',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    cancelText: {
        color: '#94A3B8',
        fontFamily: 'Courier',
        fontWeight: 'bold',
    }
});
