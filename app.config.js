const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_MILITARY = process.env.APP_VARIANT === 'military';
const IS_EDU = process.env.APP_VARIANT === 'education';

export default ({ config }) => {
  // Base configuration shared across all builds
  const baseConfig = { ...config };

  // --- SAFETY FIX: Initialize platforms if they don't exist ---
  baseConfig.ios = baseConfig.ios || {};
  baseConfig.android = baseConfig.android || {};

  // DYNAMIC APP METADATA
  if (IS_MILITARY) {
    baseConfig.name = 'JAWW MIL';
    baseConfig.ios.bundleIdentifier = 'com.jaww.military';
    baseConfig.android.package = 'com.jaww.military';
    baseConfig.icon = './assets/icon-military.png'; // Tactical Dark icon (Placeholder until you drop one in)
  } else if (IS_EDU) {
    baseConfig.name = 'JAWW EDU';
    baseConfig.ios.bundleIdentifier = 'com.jaww.edu';
    baseConfig.android.package = 'com.jaww.edu';
  } else {
    // Standard Civilian Fallback
    baseConfig.name = 'JAWW';
    baseConfig.ios.bundleIdentifier = 'com.willruff.thesource';
    baseConfig.android.package = 'com.willruff.thesource';
    baseConfig.icon = './assets/icon.png';
  }

  // PRESERVE CORE SETTINGS FROM EXISTING app.json
  return {
    ...baseConfig,
    slug: 'jaww',
    version: '1.0.0',
    runtimeVersion: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      ...baseConfig.ios,
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription: 'Required to visually scan air-gap Intel.',
        NSBluetoothAlwaysUsageDescription: 'Required to detect nearby Source nodes.',
        NSBluetoothPeripheralUsageDescription: 'Required to exchange data with nearby nodes.',
        UIBackgroundModes: ['bluetooth-central', 'bluetooth-peripheral'],
      },
    },
    android: {
      ...baseConfig.android,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      edgeToEdgeEnabled: true,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.BLUETOOTH',
        'android.permission.BLUETOOTH_ADMIN',
        'android.permission.BLUETOOTH_CONNECT',
        'android.permission.BLUETOOTH_SCAN',
        'android.permission.BLUETOOTH_ADVERTISE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.RECORD_AUDIO',
      ],
    },
    plugins: [
      'expo-sqlite',
      ['expo-camera', { cameraPermission: 'Allow JAWW to scan visual intelligence.' }],
      [
        'expo-build-properties',
        {
          android: { compileSdkVersion: 35, targetSdkVersion: 35, minSdkVersion: 24 },
          ios: { deploymentTarget: '15.1' },
        },
      ],
      [
        'react-native-ble-plx',
        {
          isBackgroundEnabled: true,
          modes: ['central', 'peripheral'],
          bluetoothAlwaysPermission: 'Allow JAWW to detect nearby tactical nodes.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '1782b43c-1505-427b-af12-1f16687221d5',
      },
    },
  };
};
