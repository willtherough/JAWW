package com.willruff.thesource

import android.bluetooth.*
import android.content.Context
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.UUID

class SourceGattModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var gattServer: BluetoothGattServer? = null
    private var connectedDevice: BluetoothDevice? = null
    private var transferCharacteristic: BluetoothGattCharacteristic? = null
    private var startPromise: Promise? = null

    // --- TRACK KNOCKS FOR SECURITY
    private val requestTimestamps = mutableMapOf<String, Long>()

    private val TRANSFER_SERVICE_UUID = UUID.fromString("baba0001-1234-5678-9abc-def012345678")
    private val TRANSFER_CHAR_UUID = UUID.fromString("baba0002-1234-5678-9abc-def012345678")
    
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
                this.startPromise?.reject("SERVER_ERROR", "Unable to open GATT server")
                this.startPromise = null
                return
            }

            val service = BluetoothGattService(TRANSFER_SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
            
            transferCharacteristic = BluetoothGattCharacteristic(
                TRANSFER_CHAR_UUID,
                BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
                BluetoothGattCharacteristic.PERMISSION_READ or BluetoothGattCharacteristic.PERMISSION_WRITE
            )

            // --- THE FIX: Create the Descriptor and attach it to the Characteristic ---
            val descriptor = BluetoothGattDescriptor(
                CCCD_UUID,
                BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE
            )
            transferCharacteristic?.addDescriptor(descriptor)
            // -------------------------------------------------------------------------

            service.addCharacteristic(transferCharacteristic)
            gattServer?.addService(service)

        } catch (e: SecurityException) {
            this.startPromise?.reject("PERMISSION_DENIED", "Missing Bluetooth Permissions")
            this.startPromise = null
        } catch (e: Exception) {
            this.startPromise?.reject("ERROR", e.message)
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
    fun stopServer(promise: Promise) {
        try {
            gattServer?.close()
            gattServer = null
            connectedDevice = null
            promise.resolve("GATT Server Stopped")
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}