import React from 'react';
import { View, StyleSheet } from 'react-native';

const StatusOrb = ({ status }) => {
  const getOrbStyle = () => {
    switch (status) {
      case 'BROADCASTING':
        return styles.broadcasting;
      case 'CONNECTED':
        return styles.connected;
      default:
        return null;
    }
  };

  const style = getOrbStyle();
  if (!style) return null;

  return <View style={[styles.orb, style]} />;
};

const styles = StyleSheet.create({
  orb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  broadcasting: {
    backgroundColor: '#00ff00', // Green
    shadowColor: '#00ff00',
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },
  connected: {
    backgroundColor: '#0077ff', // Blue
    shadowColor: '#0077ff',
    shadowRadius: 5,
    shadowOpacity: 0.8,
  },
});

export default StatusOrb;
