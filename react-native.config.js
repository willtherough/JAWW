module.exports = {
  dependencies: {
    'react-native-peripheral': {
      platforms: {
        android: null, // This tells the autolinker: "I'll handle Android manually, don't touch it."
      },
    },
  },
};
