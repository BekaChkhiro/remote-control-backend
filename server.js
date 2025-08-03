import { WebSocketServer } from 'ws';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import os from 'os';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// RobotJS - Optional dependency for mouse control
let robot = null;
try {
  robot = (await import('robotjs')).default;
  console.log('✅ RobotJS loaded - remote control enabled');
} catch (error) {
  console.log('⚠️ RobotJS not available - remote control disabled (server mode)');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 9090;
const app = express();

// Parse frontend origins from environment
const getFrontendOrigins = () => {
  const origins = [
    'http://localhost:5173',
    'http://localhost:5174'
  ];
  
  if (process.env.FRONTEND_ORIGINS) {
    const envOrigins = process.env.FRONTEND_ORIGINS.split(',').map(origin => origin.trim());
    origins.push(...envOrigins);
  }
  
  // Add common deployment patterns
  origins.push(
    /https:\/\/.*\.render\.com$/,
    /https:\/\/.*\.vercel\.app$/,
    /https:\/\/.*\.netlify\.app$/
  );
  
  return origins;
};

// CORS configuration for cross-origin requests
app.use(cors({
  origin: getFrontendOrigins(),
  credentials: true
}));

app.use(express.json());

// Get network IP address
function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const networkIP = getNetworkIP();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    robotjs: !!robot,
    networkIP: networkIP,
    timestamp: new Date().toISOString()
  });
});

// Get server info endpoint
app.get('/api/server-info', (req, res) => {
  res.json({
    networkIP: networkIP,
    port: PORT,
    robotjs: !!robot,
    screenSize: robot ? robot.getScreenSize() : null,
    activeSessions: sessions.size,
    totalConnections: connectedClients
  });
});

// Get active sessions endpoint
app.get('/api/sessions', (req, res) => {
  const sessionList = Array.from(sessions.values()).map(session => ({
    id: session.id,
    ip: session.ip,
    connectedAt: session.connectedAt,
    lastActivity: session.lastActivity,
    duration: Math.round((Date.now() - session.connectedAt) / 1000)
  }));
  
  res.json({
    totalSessions: sessions.size,
    sessions: sessionList
  });
});

// Serve the session page
app.get('/session.html', (req, res) => {
  res.sendFile(join(__dirname, 'session.html'));
});

// Serve the mobile control interface
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
        <title>📱 Phone Mouse Control</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                height: 100vh;
                overflow: hidden;
                touch-action: none;
            }

            .container {
                height: 100vh;
                display: flex;
                flex-direction: column;
            }

            .header {
                padding: 20px;
                text-align: center;
                background: rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(10px);
            }

            .header h1 {
                font-size: 24px;
                margin-bottom: 8px;
            }

            .connection-status {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                font-size: 14px;
            }

            .status-dot {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #f44336;
                transition: background-color 0.3s ease;
            }

            .status-dot.connected {
                background: #4CAF50;
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }

            .trackpad {
                flex: 1;
                background: rgba(255, 255, 255, 0.1);
                margin: 20px;
                border-radius: 20px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.2);
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                font-weight: 500;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }

            .trackpad.active {
                background: rgba(255, 255, 255, 0.2);
                border-color: rgba(255, 255, 255, 0.4);
            }

            .controls {
                padding: 20px;
                display: flex;
                gap: 15px;
                justify-content: center;
                background: rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(10px);
            }

            .control-button {
                flex: 1;
                max-width: 120px;
                padding: 15px;
                border: none;
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.1);
            }

            .control-button:active {
                background: rgba(255, 255, 255, 0.4);
                transform: scale(0.95);
            }

            .instructions {
                padding: 15px 20px;
                background: rgba(0, 0, 0, 0.3);
                font-size: 14px;
                text-align: center;
                backdrop-filter: blur(10px);
            }

            .error-message {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(244, 67, 54, 0.9);
                color: white;
                padding: 20px;
                border-radius: 12px;
                text-align: center;
                max-width: 300px;
                backdrop-filter: blur(10px);
                display: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📱 Mouse Control</h1>
                <div class="connection-status">
                    <div class="status-dot" id="statusDot"></div>
                    <span id="statusText">Connecting...</span>
                </div>
                <div class="session-info" id="sessionInfo" style="font-size: 12px; opacity: 0.7; margin-top: 5px;">
                    Session: Initializing...
                </div>
            </div>

            <div class="instructions">
                Move finger to control cursor • Tap to click • Long press for right click
            </div>

            <div class="trackpad" id="trackpad">
                <div>Trackpad Area</div>
            </div>

            <div class="controls">
                <button class="control-button" id="leftClick">Left Click</button>
                <button class="control-button" id="rightClick">Right Click</button>
            </div>
        </div>

        <div class="error-message" id="errorMessage">
            <h3>Connection Error</h3>
            <p>Could not connect to server. Make sure the remote control server is running.</p>
        </div>

        <script>
            class PhoneMouseControl {
                constructor() {
                    this.ws = null;
                    this.isConnected = false;
                    this.lastTouch = { x: 0, y: 0 };
                    this.longPressTimer = null;
                    this.longPressDelay = 500;
                    
                    this.init();
                }

                init() {
                    this.setupElements();
                    this.setupEventListeners();
                    this.connect();
                }

                setupElements() {
                    this.trackpad = document.getElementById('trackpad');
                    this.statusDot = document.getElementById('statusDot');
                    this.statusText = document.getElementById('statusText');
                    this.sessionInfo = document.getElementById('sessionInfo');
                    this.errorMessage = document.getElementById('errorMessage');
                    this.leftClickBtn = document.getElementById('leftClick');
                    this.rightClickBtn = document.getElementById('rightClick');
                    this.sessionId = null;
                }

                setupEventListeners() {
                    // Button events
                    this.leftClickBtn.addEventListener('click', () => this.sendMessage({ type: 'click' }));
                    this.rightClickBtn.addEventListener('click', () => this.sendMessage({ type: 'rightClick' }));

                    // Trackpad touch events
                    this.trackpad.addEventListener('touchstart', this.handleTouchStart.bind(this));
                    this.trackpad.addEventListener('touchmove', this.handleTouchMove.bind(this));
                    this.trackpad.addEventListener('touchend', this.handleTouchEnd.bind(this));

                    // Prevent default touch behaviors only on trackpad
                    this.trackpad.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
                }

                handleTouchMove(e) {
                    e.preventDefault();
                    if (!this.isConnected) return;

                    const touch = e.touches[0];
                    const deltaX = (touch.clientX - this.lastTouch.x) * 2;
                    const deltaY = (touch.clientY - this.lastTouch.y) * 2;

                    // Clear long press timer on move
                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                        this.longPressTimer = null;
                    }

                    this.sendMessage({
                        type: 'move',
                        deltaX: deltaX,
                        deltaY: deltaY
                    });

                    this.lastTouch = {
                        x: touch.clientX,
                        y: touch.clientY
                    };
                }

                connect() {
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    const wsUrl = \`\${protocol}//\${window.location.host}/ws\`;
                    
                    this.ws = new WebSocket(wsUrl);

                    this.ws.onopen = () => {
                        this.isConnected = true;
                        this.updateConnectionStatus('Connected', true);
                        this.generateSessionId();
                    };

                    this.ws.onclose = () => {
                        this.isConnected = false;
                        this.updateConnectionStatus('Disconnected', false);
                        this.sessionInfo.textContent = 'Session: Disconnected';
                        setTimeout(() => this.connect(), 3000);
                    };

                    this.ws.onerror = () => {
                        this.showError();
                    };
                }

                generateSessionId() {
                    // Generate a simple client-side session identifier
                    this.sessionId = 'client_' + Math.random().toString(36).substr(2, 9);
                    this.sessionInfo.textContent = \`Session: \${this.sessionId}\`;
                }

                updateConnectionStatus(text, connected) {
                    this.statusText.textContent = text;
                    if (connected) {
                        this.statusDot.classList.add('connected');
                    } else {
                        this.statusDot.classList.remove('connected');
                    }
                }

                showError() {
                    this.errorMessage.style.display = 'block';
                    setTimeout(() => {
                        this.errorMessage.style.display = 'none';
                    }, 3000);
                }

                handleTouchStart(e) {
                    e.preventDefault();
                    this.trackpad.classList.add('active');

                    // Initialize touch position for touch control
                    const touch = e.touches[0];
                    this.lastTouch = {
                        x: touch.clientX,
                        y: touch.clientY
                    };

                    // Start long press timer for right click
                    this.longPressTimer = setTimeout(() => {
                        this.sendMessage({ type: 'rightClick' });
                        navigator.vibrate && navigator.vibrate(50);
                    }, this.longPressDelay);
                }

                handleTouchEnd(e) {
                    e.preventDefault();
                    this.trackpad.classList.remove('active');

                    // Clear long press timer
                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                        this.longPressTimer = null;

                        // If it was a short tap, send click
                        this.sendMessage({ type: 'click' });
                        navigator.vibrate && navigator.vibrate(30);
                    }
                }

                sendMessage(data) {
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify(data));
                    }
                }
            }

            // Initialize when page loads
            document.addEventListener('DOMContentLoaded', () => {
                new PhoneMouseControl();
            });

            // Prevent zoom and other touch behaviors
            document.addEventListener('gesturestart', e => e.preventDefault());
            document.addEventListener('gesturechange', e => e.preventDefault());
            document.addEventListener('gestureend', e => e.preventDefault());
        </script>
    </body>
    </html>
  `);
});

// Create HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Remote Control Backend Server running on:');
  console.log(`   🖥️  Local: http://localhost:${PORT}`);
  console.log(`   📱 Network: http://${networkIP}:${PORT}`);
  console.log('');
  console.log('📱 Mobile interface available at server root URL');
  console.log('🖥️  Make sure frontend is configured to connect to this backend');
});

// Session management
const sessions = new Map();
let sessionIdCounter = 0;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function generateSessionId() {
  return `session_${++sessionIdCounter}_${Date.now()}`;
}

// Clean up inactive sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [sessionId, session] of sessions) {
    const inactiveTime = now - session.lastActivity.getTime();
    if (inactiveTime > SESSION_TIMEOUT) {
      console.log(`🧹 Cleaning up inactive session: ${sessionId} (inactive for ${Math.round(inactiveTime / 1000)}s)`);
      if (session.ws && session.ws.readyState === 1) {
        session.ws.close();
      }
      sessions.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} inactive sessions. Active sessions: ${sessions.size}`);
  }
}, 5 * 60 * 1000);

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/ws'
});

let connectedClients = 0;

wss.on('connection', (ws, req) => {
  connectedClients++;
  
  // Create new session for this client
  const sessionId = generateSessionId();
  const clientSession = {
    id: sessionId,
    ws: ws,
    ip: req.socket.remoteAddress,
    connectedAt: new Date(),
    lastActivity: new Date()
  };
  
  sessions.set(sessionId, clientSession);
  ws.sessionId = sessionId;
  
  console.log(`📱 New session started: ${sessionId}`);
  console.log(`   Client IP: ${req.socket.remoteAddress}`);
  console.log(`   Total sessions: ${sessions.size}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const session = sessions.get(ws.sessionId);
      
      if (session) {
        session.lastActivity = new Date();
        console.log(`[${session.id}] Received: ${data.type}`);
        
        if (!robot) {
          console.log('⚠️ Robot control not available');
          return;
        }

        // Process the command for this session
        switch (data.type) {
          case 'setSessionId':
            // Update session ID if provided from frontend
            if (data.sessionId && session) {
              const oldSessionId = session.id;
              session.id = data.sessionId;
              sessions.delete(ws.sessionId);
              sessions.set(data.sessionId, session);
              ws.sessionId = data.sessionId;
              console.log(`[${oldSessionId}] Session ID updated to: ${data.sessionId}`);
            }
            break;
            
          case 'move':
            // Use relative movement
            const screenSize = robot.getScreenSize();
            const currentPos = robot.getMousePos();
            
            // deltaX, deltaY are already in pixels from mobile
            const newX = Math.max(0, Math.min(screenSize.width - 1, currentPos.x + data.deltaX));
            const newY = Math.max(0, Math.min(screenSize.height - 1, currentPos.y + data.deltaY));
            
            robot.moveMouse(newX, newY);
            break;
            
          case 'click':
            robot.mouseClick();
            console.log(`[${session.id}] 🖱️ Left click`);
            break;
            
          case 'rightClick':
            robot.mouseClick('right');
            console.log(`[${session.id}] 🖱️ Right click`);
            break;
            
          case 'scroll':
            robot.scrollMouse(data.deltaX || 0, data.deltaY || 0);
            console.log(`[${session.id}] 🖱️ Scroll: ${data.deltaX}, ${data.deltaY}`);
            break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    connectedClients--;
    const session = sessions.get(ws.sessionId);
    if (session) {
      console.log(`📱 Session ended: ${session.id}`);
      console.log(`   Duration: ${Math.round((Date.now() - session.connectedAt) / 1000)}s`);
      sessions.delete(ws.sessionId);
    }
    console.log(`   Remaining sessions: ${sessions.size}`);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error [${ws.sessionId}]:`, error);
    // Clean up session on error
    if (ws.sessionId && sessions.has(ws.sessionId)) {
      sessions.delete(ws.sessionId);
    }
  });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Shutting down server...');
  wss.clients.forEach((client) => {
    client.close();
  });
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Log server info
console.log('📋 Remote Control Backend Configuration:');
console.log(`   Port: ${PORT}`);
console.log(`   Network IP: ${networkIP}`);
if (robot) {
  console.log(`   Screen Size: ${robot.getScreenSize().width}x${robot.getScreenSize().height}`);
  // Set mouse speed for smoother movement
  robot.setMouseDelay(2);
} else {
  console.log('   Screen Size: N/A (server mode)');
}