package com.willruff.thesource

import android.bluetooth.*
import android.content.Context
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID
import android.bluetooth.le.AdvertisingSet
import android.bluetooth.le.AdvertisingSetCallback
import android.bluetooth.le.AdvertisingSetParameters
import android.bluetooth.le.AdvertiseData
import android.content.Intent

class SourceGattModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var gattServer: BluetoothGattServer? = null
    private var connectedDevice: BluetoothDevice? = null
    private var transferCharacteristic: BluetoothGattCharacteristic? = null
    private var handshakeCharacteristic: BluetoothGattCharacteristic? = null
    private var startPromise: Promise? = null

    // --- EXTENDED ADVERTISING STATE ---
    private var currentAdvertisingSet: AdvertisingSet? = null
    private var isExtendedAdvertising = false

    private val advertiseCallback = object : AdvertisingSetCallback() {
        override fun onAdvertisingSetStarted(advertisingSet: AdvertisingSet?, txPower: Int, status: Int) {
            Log.d("SourceGattModule", ">> EXTENDED ADV: Started. Status: $status")
            if (status == AdvertisingSetCallback.ADVERTISE_SUCCESS) {
                currentAdvertisingSet = advertisingSet
            }
        }
        override fun onAdvertisingDataSet(advertisingSet: AdvertisingSet?, status: Int) {
            Log.d("SourceGattModule", ">> EXTENDED ADV: Data Set. Status: $status")
        }
        override fun onAdvertisingSetStopped(advertisingSet: AdvertisingSet?) {
            Log.d("SourceGattModule", ">> EXTENDED ADV: Stopped.")
        }
    }

    // --- TRACK KNOCKS FOR SECURITY
    private val requestTimestamps = mutableMapOf<String, Long>()

    private val TRANSFER_SERVICE_UUID = UUID.fromString("baba0099-1234-5678-9abc-def012345678")
    private val TRANSFER_CHAR_UUID = UUID.fromString("baba0098-1234-5678-9abc-def012345678")
    private val HANDSHAKE_CHAR_UUID = UUID.fromString("baba0097-1234-5678-9abc-def012345678")
    
    // --- THE FIX: The mandatory Descriptor UUID for notifications ---
    private val CCCD_UUID = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    override fun getName(): String {
        return "SourceGattModule"
    }

    private fun sendEvent(eventName: String, params: String) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    @ReactMethod
    fun startServer(promise: Promise) {
        this.startPromise = promise
        val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val bluetoothAdapter = bluetoothManager.adapter

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled) {
            this.startPromise?.reject("BLUETOOTH_OFF", "Bluetooth is not enabled")
            this.startPromise = null
            return
        }

        try {
            // VECTOR 1 FIX: Start the Foreground Service before opening the GATT Server
            val serviceIntent = Intent(reactApplicationContext, JawwForegroundService::class.java)
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(serviceIntent)
            } else {
                reactApplicationContext.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e("SourceGattModule", ">> FOREGROUND SERVICE START ERROR: ${e.message}")
        }

        try {
            // FATAL THREADING FIX: openGattServer MUST be called on the Main UI Thread on many Android devices
            android.os.Handler(android.os.Looper.getMainLooper()).post {
                try {
                    gattServer = bluetoothManager.openGattServer(reactApplicationContext, object : BluetoothGattServerCallback() {
                        
                        override fun onServiceAdded(status: Int, service: BluetoothGattService) {
                            if (service.uuid == TRANSFER_SERVICE_UUID) {
                                if (status == BluetoothGatt.GATT_SUCCESS) {
                                    this@SourceGattModule.startPromise?.resolve("GATT Server Started Successfully")
                                } else {
                                    this@SourceGattModule.startPromise?.reject("SERVICE_ADD_FAIL", "Failed to add GATT service, status: $status")
                                }
                                this@SourceGattModule.startPromise = null
                            }
                        }

                        override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) {
                            super.onConnectionStateChange(device, status, newState)
                            if (newState == BluetoothProfile.STATE_CONNECTED) {
                                connectedDevice = device
                                Log.d("SourceGattModule", ">> SERVER: Device connected: ${device.address}")
                            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                                connectedDevice = null
                                Log.d("SourceGattModule", ">> SERVER: Device disconnected: ${device.address}")
                            }
                        }

                        override fun onCharacteristicWriteRequest(
                            device: BluetoothDevice,
                            requestId: Int,
                            characteristic: BluetoothGattCharacteristic,
                            preparedWrite: Boolean,
                            responseNeeded: Boolean,
                            offset: Int,
                            value: ByteArray
                        ) {
                            super.onCharacteristicWriteRequest(device, requestId, characteristic, preparedWrite, responseNeeded, offset, value)
                            
                            if (responseNeeded) {
                                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                            }

                            if (characteristic.uuid == TRANSFER_CHAR_UUID) {
                                val currentTime = System.currentTimeMillis()
                                val lastRequestTime = requestTimestamps[device.address] ?: 0L

                                // ANTI-FUZZING: Only allow 1 knock every 500 milliseconds per device
                                if (currentTime - lastRequestTime > 500) {
                                    requestTimestamps[device.address] = currentTime
                    
                                    val requestString = String(value, Charsets.UTF_8)
                                    Log.d("SourceGattModule", ">> SERVER: Received Request: $requestString")
                                    sendEvent("onDeviceRequest", requestString)
                                } else {
                                    Log.w("SourceGattModule", ">> SECURITY: Dropped rapid-fire request from ${device.address}")
                                }
                            }

                            if (characteristic.uuid == HANDSHAKE_CHAR_UUID) {
                                val requestString = String(value, Charsets.UTF_8)
                                Log.d("SourceGattModule", ">> SERVER: Received ECDH Handshake: $requestString")
                                sendEvent("onDeviceHandshake", requestString)
                            }
                        }
                        
                        // --- THE FIX: Allow the client to successfully write to the descriptor ---
                        override fun onDescriptorWriteRequest(
                            device: BluetoothDevice,
                            requestId: Int,
                            descriptor: BluetoothGattDescriptor,
                            preparedWrite: Boolean,
                            responseNeeded: Boolean,
                            offset: Int,
                            value: ByteArray
                        ) {
                            super.onDescriptorWriteRequest(device, requestId, descriptor, preparedWrite, responseNeeded, offset, value)
                            if (responseNeeded) {
                                gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                            }
                        }
                    })

                    if (gattServer == null) {
                        this@SourceGattModule.startPromise?.reject("SERVER_ERROR", "Unable to open GATT server")
                        this@SourceGattModule.startPromise = null
                        return@post
                    }

                    val service = BluetoothGattService(TRANSFER_SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
                    
                    transferCharacteristic = BluetoothGattCharacteristic(
                        TRANSFER_CHAR_UUID,
                        BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                        BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
                    )

                    handshakeCharacteristic = BluetoothGattCharacteristic(
                        HANDSHAKE_CHAR_UUID,
                        BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                        BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
                    )

                    // --- THE FIX: Create the Descriptor and attach it to the Characteristic ---
                    val descriptor = BluetoothGattDescriptor(
                        CCCD_UUID,
                        BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE
                    )
                    transferCharacteristic?.addDescriptor(descriptor)
                    
                    val handshakeDescriptor = BluetoothGattDescriptor(
                        CCCD_UUID,
                        BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE
                    )
                    handshakeCharacteristic?.addDescriptor(handshakeDescriptor)
                    // -------------------------------------------------------------------------

                    service.addCharacteristic(transferCharacteristic)
                    service.addCharacteristic(handshakeCharacteristic)
                    
                    // Fix Race Condition: Wait 200ms before adding service to allow server to initialize
                    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                        try {
                            val success = gattServer?.addService(service)
                            if (success == false) {
                                this@SourceGattModule.startPromise?.reject("ADD_FAILED", "gattServer.addService returned false")
                                this@SourceGattModule.startPromise = null
                            }
                        } catch (e: Exception) {
                            this@SourceGattModule.startPromise?.reject("ADD_ERROR", e.message)
                            this@SourceGattModule.startPromise = null
                        }
                    }, 200)

                } catch (e: SecurityException) {
                    this@SourceGattModule.startPromise?.reject("PERMISSION_DENIED", "Missing Bluetooth Permissions")
                    this@SourceGattModule.startPromise = null
                } catch (e: Exception) {
                    this@SourceGattModule.startPromise?.reject("ERROR", e.message)
                    this@SourceGattModule.startPromise = null
                }
            }
        } catch (e: Exception) {
            this.startPromise?.reject("FATAL_ERROR", e.message)
            this.startPromise = null
        }
    }

    @ReactMethod
    fun sendData(data: String, promise: Promise) {
        if (connectedDevice == null || transferCharacteristic == null || gattServer == null) {
            promise.reject("NO_CONNECTION", "No device connected or server not ready")
            return
        }
        try {
            transferCharacteristic?.value = data.toByteArray(Charsets.UTF_8)
            gattServer?.notifyCharacteristicChanged(connectedDevice, transferCharacteristic, false)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SEND_ERROR", e.message)
        }
    }

    @ReactMethod
    fun sendHandshakeResponse(data: String, promise: Promise) {
        if (connectedDevice == null || handshakeCharacteristic == null || gattServer == null) {
            promise.reject("NO_CONNECTION", "No device connected or server not ready")
            return
        }
        try {
            handshakeCharacteristic?.value = data.toByteArray(Charsets.UTF_8)
            gattServer?.notifyCharacteristicChanged(connectedDevice, handshakeCharacteristic, false)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("HANDSHAKE_ERROR", e.message)
        }
    }

    @ReactMethod
    fun forceConnectLE(macAddress: String, promise: Promise) {
        try {
            val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter
            val device = bluetoothAdapter?.getRemoteDevice(macAddress)
            
            if (device == null) {
                promise.reject("INVALID_MAC", "Could not find device for MAC address")
                return
            }

            Log.d("SourceGattModule", ">> FORCING TRANSPORT_LE FOR MAC: $macAddress")
            
            // By explicitly forcing TRANSPORT_LE, we forbid the Android kernel from guessing
            // and connecting over Classic Bluetooth, which hides the LE GATT services.
            device.connectGatt(reactApplicationContext, false, object : BluetoothGattCallback() {
                override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
                    if (newState == BluetoothProfile.STATE_CONNECTED) {
                        Log.d("SourceGattModule", ">> TRANSPORT_LE Bridge Connected successfully")
                        // We intentionally leave this open so react-native-ble-plx can piggyback on it
                    } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                        Log.d("SourceGattModule", ">> TRANSPORT_LE Bridge Disconnected")
                        gatt.close()
                    }
                }
            }, BluetoothDevice.TRANSPORT_LE)
            
            promise.resolve(true)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", "Missing Bluetooth Permissions")
        } catch (e: Exception) {
            promise.reject("TRANSPORT_LE_FAIL", e.message)
        }
    }

    @ReactMethod
    fun stopServer(promise: Promise) {
        try {
            // VECTOR 1 FIX: Stop the Foreground Service
            try {
                val serviceIntent = Intent(reactApplicationContext, JawwForegroundService::class.java)
                reactApplicationContext.stopService(serviceIntent)
            } catch (e: Exception) {
                Log.e("SourceGattModule", ">> FOREGROUND SERVICE STOP ERROR: ${e.message}")
            }

            gattServer?.close()
            gattServer = null
            connectedDevice = null
            promise.resolve("GATT Server Stopped")
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun startExtendedAdvertising(payloadBase64: String, promise: Promise) {
        val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val adapter = bluetoothManager.adapter

        if (adapter == null || !adapter.isEnabled) {
            promise.reject("BLUETOOTH_OFF", "Bluetooth is off")
            return
        }

        // --- HARDWARE CHECK ---
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O || !adapter.isLeExtendedAdvertisingSupported) {
            promise.reject("UNSUPPORTED", "Device does not support BLE 5.0 Extended Advertising")
            return
        }

        val advertiser = adapter.bluetoothLeAdvertiser
        if (advertiser == null) {
            promise.reject("NO_ADVERTISER", "BluetoothLeAdvertiser not available")
            return
        }

        try {
            val parameters = AdvertisingSetParameters.Builder()
                .setLegacyMode(false)
                .setConnectable(true)
                .setInterval(AdvertisingSetParameters.INTERVAL_LOW)
                .setTxPowerLevel(AdvertisingSetParameters.TX_POWER_HIGH)
                .setPrimaryPhy(BluetoothDevice.PHY_LE_1M)
                .setSecondaryPhy(BluetoothDevice.PHY_LE_2M)
                .build()

            val payloadBytes = android.util.Base64.decode(payloadBase64, android.util.Base64.DEFAULT)

            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .addServiceData(android.os.ParcelUuid(TRANSFER_SERVICE_UUID), payloadBytes)
                .build()

            advertiser.startAdvertisingSet(parameters, data, null, null, null, advertiseCallback)
            isExtendedAdvertising = true
            promise.resolve(true)
        } catch (e: SecurityException) {
            promise.reject("PERMISSION_DENIED", "Missing Bluetooth Permissions")
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopExtendedAdvertising(promise: Promise) {
        if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) {
            promise.resolve(true)
            return
        }
        val bluetoothManager = reactApplicationContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        val advertiser = bluetoothManager.adapter?.bluetoothLeAdvertiser
        
        try {
            if (currentAdvertisingSet != null) {
                advertiser?.stopAdvertisingSet(advertiseCallback)
                currentAdvertisingSet = null
            }
            isExtendedAdvertising = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}