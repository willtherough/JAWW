import TcpSocket from 'react-native-tcp-socket';
import { NetworkInfo } from 'react-native-network-info';
import { Buffer } from 'buffer';

const DEFAULT_PORT = 8080;

class WifiMeshService {
    constructor() {
        this.server = null;
        this.localIp = null;
    }

    /**
     * Finds the local Wi-Fi/Hotspot IP address of this device.
     */
    async getLocalIp() {
        try {
            const ip = await NetworkInfo.getIPV4Address();
            this.localIp = ip;
            return ip;
        } catch (e) {
            console.error(">> WIFI MESH: Could not retrieve local IP:", e);
            return null;
        }
    }

    /**
     * HOST MODE: Spins up a TCP server to serve the payload to a requesting peer.
     * @param {string} payload - The large stringified JSON ledger or asset.
     * @returns {Promise<{ip: string, port: number}>} - The local routing coordinates.
     */
    async hostPayload(payload) {
        return new Promise(async (resolve, reject) => {
            const ip = await this.getLocalIp();
            if (!ip || ip === '0.0.0.0') {
                reject(new Error("Device is not connected to a local Hotspot or Wi-Fi network."));
                return;
            }

            // Close existing server if running
            if (this.server) {
                this.server.close();
            }

            this.server = TcpSocket.createServer((socket) => {
                console.log(`>> WIFI MESH: Client connected. Blasting payload (${payload.length} bytes)...`);
                
                // Blast the payload. We add an EOF marker so the client knows when it's done.
                socket.write(payload + '<EOF>');
                
                socket.on('data', (data) => {
                    if (data.toString().trim() === 'ACK') {
                        console.log(">> WIFI MESH: Client acknowledged receipt. Closing socket.");
                        socket.destroy();
                        this.server.close();
                        this.server = null;
                    }
                });

                socket.on('error', (error) => {
                    console.log('>> WIFI MESH SERVER ERROR:', error);
                });
            });

            this.server.listen({ port: DEFAULT_PORT, host: '0.0.0.0' }, () => {
                const address = this.server.address();
                console.log(`>> WIFI MESH: Server hosting on ${ip}:${address.port}`);
                resolve({ ip: ip, port: address.port });
            });

            this.server.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * CLIENT MODE: Connects to a Host's TCP port, downloads the payload, and closes.
     * @param {string} targetIp - The Host's local IP address.
     * @param {number} targetPort - The Host's exposed port.
     * @returns {Promise<string>} - The downloaded payload string.
     */
    async fetchPayload(targetIp, targetPort = DEFAULT_PORT) {
        return new Promise((resolve, reject) => {
            console.log(`>> WIFI MESH: Connecting to Host at ${targetIp}:${targetPort}...`);
            let receivedData = '';

            const client = TcpSocket.createConnection({
                port: targetPort,
                host: targetIp,
            }, () => {
                console.log('>> WIFI MESH: Connected! Receiving stream...');
            });

            client.on('data', (data) => {
                receivedData += data.toString();
                // Check if the stream has finished
                if (receivedData.endsWith('<EOF>')) {
                    console.log(">> WIFI MESH: EOF detected. Download complete.");
                    client.write('ACK'); // Acknowledge receipt
                    client.destroy(); // Close the client connection
                    
                    // Strip the EOF marker before resolving
                    const cleanPayload = receivedData.replace('<EOF>', '');
                    resolve(cleanPayload);
                }
            });

            client.on('error', (error) => {
                console.error(">> WIFI MESH CLIENT ERROR:", error);
                client.destroy();
                reject(error);
            });

            client.on('close', () => {
                // If the connection drops before receiving EOF
                if (!receivedData.endsWith('<EOF>')) {
                    reject(new Error("Connection dropped before payload transfer finished."));
                }
            });
        });
    }
}

export default new WifiMeshService();
