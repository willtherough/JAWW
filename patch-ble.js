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