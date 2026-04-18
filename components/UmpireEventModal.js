import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView, FlatList, TextInput, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import UmpireDashboardService from '../services/UmpireDashboardService';

export default function UmpireEventModal({ visible, onClose, event, onBegin, onEnd, leaderboard }) {
  const [eventPhase, setEventPhase] = useState('begin'); // 'begin' or 'last_call'
  const [subject, setSubject] = useState('');

  if (!visible || !event) {
    return null;
  }

  // Assuming 'profile' and 'startTime' are passed within the 'event' object
  const { id: eventId, name: eventName, profile, startTime } = event;

  const handleBegin = (passedSubject) => {
    // 1. Catch the subject from the button and pass it UP to App.js
    onBegin(passedSubject);
    
    // 2. Continue with your normal UI phase shift
    setEventPhase('last_call');
  };

  const handleEnd = () => {
    onEnd();
    UmpireDashboardService.stopServer();
    setWebUrl(null);
    setEventPhase('begin'); // Reset for next time
  };
  
  const renderParticipant = ({ item }) => (
    <View style={styles.participantContainer}>
      <Text style={styles.participantHandle}>{item.handle}</Text>
      <Text style={styles.participantStats}>
        Cards: {item.authoredCount} | Score: {item.expertiseScore}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={styles.title}>{eventName}</Text>

          {eventPhase === 'begin' ? (
            <>
              <Text style={styles.label}>Event Subject / Mission Focus:</Text>
              <TextInput
                  style={styles.input}
                  placeholder="e.g., HIIT Workouts, Best BBQ..."
                  placeholderTextColor="#64748B"
                  value={subject}
                  onChangeText={setSubject}
              />
              <View style={styles.qrContainer}>
                <QRCode 
                  value={`JAWW-UMPIRE:${event?.id?.split(':')[1] || 'UNKNOWN'}:${subject || 'General'}:${event?.id?.split(':')[2] || '0'}:${profile?.publicKey || 'UnknownKey'}`} 
                  size={200} 
                  color="#F8FAFC" 
                  backgroundColor="#0F172A" 
                />
              </View>
              <Text style={styles.instructions}>
                Participants can scan this QR code to join the event.
              </Text>
              <TouchableOpacity onPress={() => handleBegin(subject || 'General')} style={styles.beginButton}>
                <Text style={styles.beginButtonText}>Begin Event & Broadcast</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.lastCallText}>Last call for cards!</Text>
              
              <FlatList
                data={leaderboard}
                renderItem={renderParticipant}
                keyExtractor={(item) => item.handle}
                style={styles.leaderboard}
                ListHeaderComponent={<Text style={styles.leaderboardHeader}>Leaderboard</Text>}
              />

              <TouchableOpacity onPress={handleEnd} style={styles.endButton}>
                <Text style={styles.endButtonText}>End Event</Text>
              </TouchableOpacity>
            </>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#00FF00',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00FF00',
    marginBottom: 20,
  },
  instructions: {
    color: '#888',
    fontFamily: 'Courier New',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 30,
  },
  beginButton: {
    backgroundColor: '#003300',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00FF00',
    marginBottom: 10,
  },
  beginButtonText: {
    color: '#00FF00',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  webButton: {
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginBottom: 20,
  },
  webButtonText: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  urlBox: {
    backgroundColor: '#020617',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginBottom: 20,
    alignItems: 'center',
  },
  urlLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'Courier New',
    marginBottom: 5,
  },
  urlText: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  closeButton: {
    padding: 10,
  },
  closeButtonText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Courier New',
  },
  lastCallText: {
    color: '#00FF00',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
    marginBottom: 20,
    textAlign: 'center',
  },
  leaderboard: {
    width: '80%',
    maxHeight: '50%',
    backgroundColor: '#111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00FF00',
    marginBottom: 20,
  },
  leaderboardHeader: {
    color: '#00FF00',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
    textAlign: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderColor: '#00FF00',
  },
  participantContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  participantHandle: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'Courier New',
  },
  participantStats: {
    color: '#00FF00',
    fontSize: 16,
    fontFamily: 'Courier New',
  },
  endButton: {
    backgroundColor: '#550000',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF0000',
    marginBottom: 10,
  },
  endButtonText: {
    color: '#FF0000',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Courier New',
  },
  label: {
    color: '#94A3B8',
    fontSize: 14,
    fontFamily: 'Courier New',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
    width: '80%',
    marginBottom: 20,
    fontSize: 16,
    fontFamily: 'Courier New',
  },
});
