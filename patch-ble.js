const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules', 'react-native-ble-plx', 'android', 'src', 'main', 'java', 'com', 'bleplx', 'BlePlxModule.java');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Replaces the illegal 'null' error code with a valid string
  content = content.replace(/safePromise\.reject\(null,/g, 'safePromise.reject("BLE_ERROR",');
  fs.writeFileSync(filePath, content);
  console.log('✅ Successfully patched BlePlxModule.java');
} else {
  console.log('❌ BlePlxModule.java not found');
}

// --- PATCH BLE ADVERTISER SDK VERSIONS ---
const advertiserPath = path.join(__dirname, 'node_modules', 'react-native-ble-advertiser', 'android', 'build.gradle');

if (fs.existsSync(advertiserPath)) {
  let content = fs.readFileSync(advertiserPath, 'utf8');
  content = content.replace(/compileSdkVersion \d+/g, 'compileSdkVersion 35');
  content = content.replace(/targetSdkVersion \d+/g, 'targetSdkVersion 35');
  content = content.replace(/buildToolsVersion ["']\d+\.\d+\.\d+["']/g, '// buildToolsVersion');
  fs.writeFileSync(advertiserPath, content);
  console.log('✅ Successfully patched ble-advertiser build.gradle');
} else {
  console.log('❌ ble-advertiser build.gradle not found');
}