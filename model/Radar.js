import { BleManager, State, ScanMode } from 'react-native-ble-plx'; // Import ScanMode
import { PermissionsAndroid, Platform } from 'react-native';

// SINGLETON: We only want one Bluetooth Manager running
export const manager = new BleManager();

// 1. REQUEST PERMISSIONS
export const requestPermissions = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, 
      ]);
      return (
        result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } else {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  }
  return true; 
};

// 2. WAIT FOR RADIO TO POWER ON (CRITICAL STEP)
const waitForBluetooth = () => {
    return new Promise((resolve) => {
        const subscription = manager.onStateChange((state) => {
            console.log(">> BLUETOOTH STATE:", state); 
            if (state === State.PoweredOn) {
                subscription.remove();
                resolve(true);
            }
            if (state === State.PoweredOff) {
                console.log(">> PLEASE TURN ON BLUETOOTH!");
            }
        }, true);
    });
};

// 3. START SCANNING
export const startScanning = async (onDeviceFound) => {
    // A. Wait for the radio to warm up
    await waitForBluetooth();

    console.log(">> RADAR: State verified. Starting Scan...");
    
    // B. Start Scan with LOW LATENCY (High Performance)
    // This forces the radio to wake up immediately.
    manager.startDeviceScan(
        null, 
        { 
            allowDuplicates: true, 
            scanMode: ScanMode.LowLatency 
        }, 
        (error, device) => {
            if (error) {
                console.log(">> SCAN ERROR:", error.message);
                return;
            }

            // SUCCESS
            if (onDeviceFound) {
                 onDeviceFound({
                     id: device.id,
                     name: device.name,
                     rssi: device.rssi 
                 });
            }
        }
    );
};

// 4. STOP
export const stopRadar = () => {
    console.log(">> RADAR: Stopping.");
    manager.stopDeviceScan();
};