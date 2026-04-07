import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Keyboard, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';

const FlareBeacon = ({ onFireFlare, isBroadcasting }) => {
  const [flareText, setFlareText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isModalVisible) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isModalVisible]);

  const handleFire = () => {
    if (flareText.trim().length > 0) {
      onFireFlare(flareText.trim());
      setFlareText('');
      Keyboard.dismiss();
      setIsModalVisible(false);
    }
  };

  const handleOpenModal = () => {
    if (!isBroadcasting) {
      setIsModalVisible(true);
    }
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    setIsModalVisible(false);
    setFlareText('');
  }

  return (
    <>
      {/* This is the tappable bar at the bottom */}
      <TouchableOpacity style={styles.container} onPress={handleOpenModal} disabled={isBroadcasting}>
        <View style={styles.header}>
          <Feather name="radio" size={12} color="#F59E0B" />
          <Text style={styles.headerText}>TACTICAL FLARE</Text>
        </View>
        <View style={styles.inputRow}>
          <Text style={styles.staticInput} numberOfLines={1}>
            {isBroadcasting ? 'FLARE IS LIVE...' : 'Broadcast a question to the mesh...'}
          </Text>
          <View style={[styles.fireBtn, isBroadcasting && styles.fireBtnActive]}>
            <Feather name="send" size={16} color="#0F172A" />
            <Text style={styles.fireBtnText}>FIRE</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* This is the modal that appears at the top */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalContainer}>
          {/* Background overlay that can be tapped to close */}
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleCancel} />
          
          {/* The actual content box */}
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Feather name="radio" size={12} color="#F59E0B" />
              <Text style={styles.headerText}>BROADCAST FLARE</Text>
            </View>
            <TextInput
              ref={inputRef}
              style={styles.modalInput}
              placeholder="What is your question for the mesh?"
              placeholderTextColor="#94A3B8"
              value={flareText}
              onChangeText={setFlareText}
              multiline={true}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalFireBtn}
                onPress={handleFire}
              >
                <Feather name="send" size={16} color="#0F172A" />
                <Text style={styles.fireBtnText}>FIRE FLARE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Tappable bar at the bottom
  container: {
    backgroundColor: '#1E293B',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    marginHorizontal: 10,
    marginBottom: Platform.OS === 'ios' ? 20 : 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerText: {
    color: '#F59E0B',
    fontFamily: 'Courier',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  staticInput: {
    flex: 1,
    color: '#94A3B8',
    fontFamily: 'Courier',
    fontSize: 12,
  },
  fireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    gap: 6,
    justifyContent: 'center',
  },
  fireBtnActive: {
    backgroundColor: '#334155',
  },
  fireBtnText: {
    color: '#0F172A',
    fontFamily: 'Courier',
    fontWeight: 'bold',
    fontSize: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-start', // Position content at the top
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingTop: 100, // Offset to appear below the radar header
    paddingHorizontal: 10,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  modalInput: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    color: '#F8FAFC',
    fontFamily: 'Courier',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 140,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#94A3B8',
    fontFamily: 'Courier',
    fontWeight: 'bold',
    fontSize: 12,
  },
  modalFireBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    borderRadius: 4,
    gap: 8,
    justifyContent: 'center',
  }
});

export default FlareBeacon;
