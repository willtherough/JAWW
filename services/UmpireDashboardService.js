import TcpSocket from 'react-native-tcp-socket';
import { NetworkInfo } from 'react-native-network-info';
import { DeviceEventEmitter } from 'react-native';

const DASHBOARD_PORT = 3000;

const DASHBOARD_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JAWW Umpire Console</title>
    <style>
        body { margin: 0; padding: 0; background-color: #0f172a; color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .container { max-width: 800px; margin: 40px auto; padding: 20px; }
        .header { border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
        .title { font-size: 24px; font-weight: bold; color: #38bdf8; letter-spacing: 2px; }
        .badge { background: #10b981; color: #064e3b; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; }
        .input-group { margin-bottom: 24px; }
        label { display: block; margin-bottom: 8px; font-size: 14px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
        input[type="text"], select, textarea { width: 100%; padding: 16px; background-color: #1e293b; border: 1px solid #334155; border-radius: 8px; color: #f8fafc; font-size: 16px; transition: border-color 0.2s; box-sizing: border-box; }
        input[type="text"]:focus, select:focus, textarea:focus { outline: none; border-color: #38bdf8; }
        textarea { height: 250px; resize: vertical; line-height: 1.5; }
        .btn-blast { display: block; width: 100%; padding: 18px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; color: white; font-size: 16px; font-weight: bold; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; transition: opacity 0.2s; }
        .btn-blast:hover { opacity: 0.9; }
        .btn-blast:active { opacity: 0.7; }
        .status-msg { margin-top: 16px; text-align: center; font-size: 14px; font-weight: bold; height: 20px; }
        .success { color: #10b981; }
        .error { color: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">NEW DATA ENTRY</div>
            <div class="badge">SECURE MESH LINK ACTIVE</div>
        </div>
        
        <div class="input-group">
            <label>Title / Headline</label>
            <input type="text" id="intTitle" placeholder="e.g., Smoked Brisket Technique">
        </div>

        <div class="input-group">
            <label>Classification Sector</label>
            <select id="intTopic">
                <option value="general">General</option>
                <option value="food">Food</option>
                <option value="education">Education</option>
                <option value="fitness">Fitness</option>
                <option value="professional">Professional</option>
                <option value="fun">Fun</option>
            </select>
        </div>

        <div class="input-group">
            <label>Subject</label>
            <input type="text" id="intSubject" placeholder="Specific Subject (e.g., History, Recipes, Networking)">
        </div>

        <div class="input-group">
            <label>Data Payload</label>
            <textarea id="intBody" placeholder="Enter knowledge content..."></textarea>
        </div>

        <button class="btn-blast" onclick="blastCard()">ENCRYPT & SAVE</button>
        <div class="status-msg" id="statusBox"></div>
    </div>

    <script>
        async function blastCard() {
            const title = document.getElementById('intTitle').value;
            const topic = document.getElementById('intTopic').value;
            const subject = document.getElementById('intSubject').value;
            const body = document.getElementById('intBody').value;
            const statusBox = document.getElementById('statusBox');

            if (!title || !body) {
                statusBox.className = 'status-msg error';
                statusBox.innerText = 'Title and Payload are radically required.';
                return;
            }

            // EXACT MATCH TO APP.JS EXPECTATIONS
            const payload = {
                title: title,
                topic: topic,
                subject: subject,
                body: body,
                timestamp: Date.now()
            };

            try {
                const response = await fetch('/api/sendCard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    statusBox.className = 'status-msg success';
                    statusBox.innerText = 'PAYLOAD SECURED AND ROUTED TO MESH.';
                    document.getElementById('intTitle').value = '';
                    document.getElementById('intSubject').value = '';
                    document.getElementById('intBody').value = '';
                    
                    setTimeout(() => { statusBox.innerText = ''; }, 3000);
                } else {
                    throw new Error('Mesh Link Failed');
                }
            } catch (err) {
                statusBox.className = 'status-msg error';
                statusBox.innerText = 'CRITICAL FAILURE: Cannot reach mobile host.';
            }
        }
    </script>
</body>
</html>
`;

class UmpireDashboardService {
    constructor() {
        this.server = null;
        this.localIp = null;
    }

    /**
     * Starts the lightweight HTTP Web Server on port 3000.
     */
    async startServer() {
        return new Promise(async (resolve, reject) => {
            const ip = await NetworkInfo.getIPV4Address();
            if (!ip || ip === '0.0.0.0') {
                reject(new Error("Device is not connected to a local Hotspot or Wi-Fi network."));
                return;
            }
            this.localIp = ip;

            if (this.server) {
                this.server.close();
            }

            this.server = TcpSocket.createServer((socket) => {
                let requestData = '';

                socket.on('data', (data) => {
                    requestData += data.toString();
                    
                    // Simple HTTP Parsing
                    if (requestData.includes('\r\n\r\n')) {
                        const headersPart = requestData.split('\r\n\r\n')[0];
                        const lines = headersPart.split('\r\n');
                        const requestLine = lines[0] || '';
                        
                        // Handle GET Homepage
                        if (requestLine.startsWith('GET / ')) {
                            const response = `HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: ${Buffer.byteLength(DASHBOARD_HTML, 'utf8')}\r\nConnection: close\r\n\r\n${DASHBOARD_HTML}`;
                            socket.write(response);
                            socket.destroy();
                        }
                        // Handle POST API Payload
                        else if (requestLine.startsWith('POST /api/sendCard')) {
                            try {
                                const bodyPart = requestData.split('\r\n\r\n')[1];
                                // We might need to wait for full body if Content-Length isn't fully received, 
                                // but for raw TCP on local network, it usually arrives in one chunk for small text.
                                const payload = JSON.parse(bodyPart.replace(/\\0/g, '').trim());
                                
                                console.log(">> UMPIRE DASHBOARD: Received payload from browser!", payload.title);
                                
                                // Plumb this straight into the App.js interface
                                DeviceEventEmitter.emit('umpireWebCardReceived', payload);

                                const response = 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{"status":"success"}';
                                socket.write(response);
                                socket.destroy();
                            } catch (e) {
                                const response = 'HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n';
                                socket.write(response);
                                socket.destroy();
                            }
                        } else {
                            // 404
                            const response = 'HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n';
                            socket.write(response);
                            socket.destroy();
                        }
                    }
                });

                socket.on('error', (err) => console.log('HTTP Server Error:', err));
            });

            this.server.listen({ port: DASHBOARD_PORT, host: '0.0.0.0' }, () => {
                const address = this.server.address();
                console.log(`>> UMPIRE WEB SERVER CONNECTED! Running at http://${ip}:${address.port}`);
                resolve(`http://${ip}:${address.port}`);
            });

            this.server.on('error', (error) => {
                reject(error);
            });
        });
    }

    stopServer() {
        if (this.server) {
            this.server.close();
            this.server = null;
            console.log(">> UMPIRE WEB SERVER SHUT DOWN.");
        }
    }
}

export default new UmpireDashboardService();
