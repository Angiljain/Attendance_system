# Decentralized Proof of Presence Attendance System

This project is a decentralized attendance system that verifies physical attendance using Dynamic QR codes and GPS geofencing.

## Tech Stack
- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js, Socket.IO, Prisma (SQLite configured for local)
- **Optional**: Polygon Blockchain for on-chain verifiable proof

## Features
- **Dynamic QR Codes**: Auto-refresh every 20 seconds using HMAC-SHA256 signatures.
- **Geofencing**: Requires students to be within a 70-meter radius of the session location using Haversine algorithm.
- **Duplicate Prevention**: Replay attack prevention via checking if a specific QR payload was used.
- **Real-Time Feed**: WebSockets (Socket.IO) to display live attendance updates on the admin dashboard.
- **Role-Based Auth**: Distinct `ADMIN` and `STUDENT` flows.

## Getting Started

### 1. Prerequisites
- Node.js > 18.x

### 2. Environment Variables
Local `.env` files are already configured for immediate local testing with a SQLite database.
- `backend/.env`
- `frontend/.env.local`

### 3. Running the App
To run the app locally, start both the frontend and backend servers:

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 4. How to use (Testing Flow)
1. Navigate to **[http://localhost:3000](http://localhost:3000)**.
2. **Register an Admin**: Register an account and select the **Admin** role.
3. Once logged in as admin, click **Start Session**. Enter a title and select "Use My Current Location". 
4. A QR Code will appear which refreshes every 20 seconds.
5. **Register a Student**: Open an incognito window or another browser, navigate to the same URL, and register as a **Student**.
6. Scan the QR code. You can use a mobile phone connecting to your local network, or you can use a webcam on your computer if one is attached. Ensure you grant GPS & Camera permissions.
7. The student history and the admin dashboard should update in real-time.

*Note: For mobile testing, ensure you connect using your machine's local IP (e.g., `http://192.168.x.x:3000`) and configure the backend `.env` CORS accordingly.*
