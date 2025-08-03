# 📱 Remote Control Backend

Separate backend application for remote mouse control functionality.

## 🚀 Features

- **WebSocket Server** - Real-time communication
- **Mouse Control** - RobotJS integration
- **Mobile Interface** - Built-in web interface
- **CORS Support** - Cross-origin requests
- **Health Check** - Server status endpoint
- **Auto-restart** - PM2 process management

## 🛠️ Installation

```bash
# Clone or copy this backend folder
cd remote-control-backend

# Install dependencies
npm install

# Development
npm run dev

# Production
npm start

# PM2 (recommended for production)
npm run pm2
```

## 🌐 API Endpoints

### Health Check
```
GET /health
```
Returns server status and capabilities.

### Server Info
```
GET /api/server-info
```
Returns network IP, port, and screen info.

### Mobile Interface
```
GET /
```
Mobile-optimized control interface.

### WebSocket
```
WS /ws
```
WebSocket endpoint for real-time mouse control.

## 🔧 Environment Variables

```bash
PORT=8080                    # Server port
NODE_ENV=production         # Environment
FRONTEND_ORIGINS=https://... # Allowed origins (optional)
```

## 📱 Usage

1. **Start Backend**: `npm start`
2. **Connect Frontend**: Update frontend to use this backend URL
3. **Mobile Control**: Access server URL directly on mobile
4. **QR Integration**: Update QR codes to point to this backend

## 🔒 Security

- **CORS** configured for common frontend domains
- **Origin validation** for WebSocket connections
- **Input validation** for mouse commands
- **Error handling** and logging

## 🚢 Deployment

### VPS Deployment
```bash
# On your VPS
git clone <your-repo>
cd remote-control-backend
npm install
npm install -g pm2
pm2 start server.js --name remote-control
pm2 startup
pm2 save
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

## 🔗 Frontend Integration

Update your frontend to connect to this backend:

```typescript
// In your frontend RemoteControl component
const BACKEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-domain.com'  // Your backend URL
  : 'http://localhost:8080';           // Local development

const generateQRCode = (url: string): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(BACKEND_URL)}`;
};
```

## 🏠 Local Development

Both frontend and backend can run locally:

```bash
# Terminal 1: Frontend
cd your-frontend-project
npm run dev

# Terminal 2: Backend  
cd remote-control-backend
npm run dev
```

## 🌟 Production Setup

1. **Deploy backend** to VPS/cloud service
2. **Update frontend** with backend URL
3. **Configure CORS** for your domain
4. **Setup SSL** (recommended)
5. **Use PM2** for process management

## 🐛 Troubleshooting

- **RobotJS Issues**: Check Node.js version compatibility
- **CORS Errors**: Add your domain to CORS origins
- **Connection Failed**: Verify firewall and port settings
- **Mobile Issues**: Ensure HTTPS for production use