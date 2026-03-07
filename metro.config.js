const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// We add 'mjs' support which is often required by modern 
// Bluetooth and networking libraries in the Expo 54 environment.
config.resolver.sourceExts.push('mjs');

module.exports = config;