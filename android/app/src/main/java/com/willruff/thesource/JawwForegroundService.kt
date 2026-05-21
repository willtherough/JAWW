package com.willruff.thesource

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import android.content.pm.ServiceInfo

class JawwForegroundService : Service() {

    private val CHANNEL_ID = "JawwBleChannel"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("JAWW Mesh Active")
            .setContentText("Secure vault is running in the background.")
            .setSmallIcon(android.R.drawable.stat_sys_data_bluetooth) // Fallback icon
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            try {
                // For API 34+ we must explicitly state the service type
                startForeground(
                    1001,
                    notification,
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE
                    } else {
                        0
                    }
                )
            } catch (e: Exception) {
                e.printStackTrace()
            }
        } else {
            startForeground(1001, notification)
        }

        // Keep the service running
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "JAWW Background Mesh",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the JAWW GATT Server alive when the screen is off."
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(serviceChannel)
        }
    }
}
