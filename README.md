# Remote Desktop App

A personal **MEAN-style remote desktop application** for connecting to
and controlling computers over a network.

The application uses:

-   **Angular 22** for the frontend
-   **Node.js + Express + TypeScript** for the backend
-   **MongoDB** for remote-PC and session information
-   **WebSocket (`ws`)** as the browser-to-backend transport for VNC
-   **TCP sockets (`net`)** between the Node.js gateway and the VNC
    server
-   **noVNC (`@novnc/novnc`)** in Angular to display and control the
    remote desktop
-   **TightVNC Server** on the remote Windows PC
-   Optional **WebRTC video/audio calling** between connected
    users/devices
-   Authentication/authorization and session validation around remote
    connections

> This README describes the personal Remote Desktop application, not the
> company remote-PC project.

------------------------------------------------------------------------

## 1. Architecture

``` text
                           REMOTE DESKTOP FLOW

 Host PC / User Browser
 ┌──────────────────────────────┐
 │ Angular 22                   │
 │                              │
 │ Login                        │
 │ PC Dashboard                 │
 │ Remote Session               │
 │ noVNC / RFB                  │
 └──────────────┬───────────────┘
                │
                │ REST API
                │ WebSocket
                ▼
 ┌──────────────────────────────┐
 │ Node.js Backend              │
 │                              │
 │ Express REST API             │
 │ Authentication              │
 │ Authorization               │
 │ Session Management           │
 │ VNC WebSocket Gateway        │
 └───────┬──────────────┬───────┘
         │              │
         │              └──────────────► MongoDB
         │                               PCs / Users /
         │                               Sessions
         │
         │ TCP :5900
         ▼
 ┌──────────────────────────────┐
 │ Remote Windows PC            │
 │                              │
 │ TightVNC Server              │
 │ Port 5900                    │
 │ Password protected           │
 └──────────────────────────────┘
```

The browser does **not** connect directly to TCP port `5900`. Browsers
communicate through WebSockets, so the Node.js backend acts as a bridge:

``` text
Angular/noVNC
    │
    │ ws://<backend-host>:6080/vnc/<pcId>
    ▼
Node WebSocket Gateway
    │
    │ TCP
    ▼
<remote-pc-ip>:5900
    │
    ▼
TightVNC Server
```

------------------------------------------------------------------------

# 2. Prerequisites

## Host PC

Install:

-   Node.js 20+ recommended
-   npm
-   Angular CLI
-   Git
-   MongoDB or MongoDB Atlas access
-   Modern Chrome/Edge browser

Check:

``` bash
node -v
npm -v
ng version
git --version
```

Install Angular CLI if required:

``` bash
npm install -g @angular/cli
```

## Remote PC

The PC that will be controlled needs:

-   Windows
-   TightVNC Server
-   Network access from the backend/host PC
-   TCP port `5900` allowed through Windows Firewall
-   A configured VNC password
-   A fixed/reserved IP address is recommended

------------------------------------------------------------------------

# 3. Clone the Project

Example:

``` bash
git clone <repository-url>
cd remote-desktop-app
```

A typical repository can contain:

``` text
remote-desktop-app/
│
├── remote-desktop-api/
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── remote-desktop-ui/
│   ├── src/
│   ├── angular.json
│   ├── package.json
│   └── ...
│
└── README.md
```

If frontend and backend are separate repositories, clone both
individually.

------------------------------------------------------------------------

# 4. Remote PC --- Configure TightVNC

Install **TightVNC Server** on every Windows computer that should be
remotely controlled.

During installation, enable the server component.

After installation open:

``` text
TightVNC Server Configuration
```

Configure a password for remote access.

Example:

``` text
Primary password: ********
```

The default VNC port is:

``` text
5900
```

Make sure the TightVNC service is running.

You can verify it from:

``` text
services.msc
```

Look for the TightVNC server/service and confirm that its status is
**Running**.

------------------------------------------------------------------------

# 5. Remote PC --- Windows Firewall

The remote PC must accept incoming VNC traffic.

Allow TightVNC through Windows Defender Firewall or create an inbound
rule for:

``` text
Protocol: TCP
Port:     5900
Action:   Allow
```

Only expose VNC to trusted/private networks. Do not expose port `5900`
directly to the public Internet.

------------------------------------------------------------------------

# 6. Find the Remote PC IP Address

On the remote PC:

``` powershell
ipconfig
```

Find the IPv4 address of the active adapter.

Example:

``` text
IPv4 Address . . . . . . . . . : 192.168.1.25
```

The application will use this value as the PC `host`.

For a home LAN, reserve the address in your router or configure an
appropriate static IP so the address does not unexpectedly change.

------------------------------------------------------------------------

# 7. Test Connectivity Before Starting the App

From the host/backend PC:

``` powershell
ping 192.168.1.25
```

Ping may be blocked even when VNC works, so the more useful Windows test
is:

``` powershell
Test-NetConnection 192.168.1.25 -Port 5900
```

Expected:

``` text
TcpTestSucceeded : True
```

If this is `False`, check:

-   Both PCs are on reachable networks
-   TightVNC Server is running
-   Port `5900` is listening
-   Windows Firewall permits the connection
-   Antivirus/security software is not blocking it
-   The IP address is correct

------------------------------------------------------------------------

# 8. MongoDB Configuration

The backend stores registered remote PCs and can also store
users/session metadata.

Example remote-PC document:

``` json
{
  "id": "001",
  "name": "Personal PC",
  "host": "192.168.1.25",
  "port": 5900,
  "isActive": true
}
```

Start local MongoDB if you are using a local database, or create a
MongoDB Atlas database.

Example connection string:

``` text
mongodb://127.0.0.1:27017/remote-desktop
```

Do not commit database credentials to Git.

------------------------------------------------------------------------

# 9. Backend Setup

Move to the backend:

``` bash
cd remote-desktop-api
```

Install dependencies:

``` bash
npm install
```

Create a `.env` file.

Example:

``` env
NODE_ENV=development

PORT=3000
WS_PORT=6080

MONGODB_URI=mongodb://127.0.0.1:27017/remote-desktop

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h

FRONTEND_URL=http://localhost:4200
```

If video-call signaling is handled by the same backend, it can use the
existing HTTP/WebSocket server or a separately configured signaling
endpoint.

Never commit `.env`.

Add it to `.gitignore`:

``` gitignore
.env
node_modules/
dist/
```

------------------------------------------------------------------------

# 10. Backend Responsibilities

The backend has four major responsibilities.

### REST API

Used for operations such as:

``` text
POST   /api/auth/login
GET    /api/pcs
GET    /api/pcs/:id
POST   /api/pcs
PUT    /api/pcs/:id
DELETE /api/pcs/:id
POST   /api/sessions
DELETE /api/sessions/:id
```

Exact routes can differ depending on the repository implementation.

### Authentication

A typical login flow is:

``` text
User
 │
 │ username/password
 ▼
POST /api/auth/login
 │
 ▼
Backend validates credentials
 │
 ▼
JWT generated
 │
 ▼
Angular stores/uses token
 │
 ▼
Authorization: Bearer <token>
```

Passwords should be stored only as secure hashes, for example with
bcrypt.

### Authorization

Before creating a remote session, the backend should verify:

1.  The user is authenticated.
2.  The JWT is valid and not expired.
3.  The requested PC exists.
4.  The PC is active.
5.  The user has permission to connect to that PC.
6.  The session request is valid.

The WebSocket connection should also be authenticated. Do not assume
that authentication of a REST page automatically secures a separately
opened WebSocket.

### VNC Gateway

The gateway accepts browser WebSocket traffic and forwards it to the
remote VNC TCP socket.

Example endpoint:

``` text
ws://localhost:6080/vnc/001
```

Flow:

``` text
Browser WebSocket connected
        │
        ▼
Extract PC ID: 001
        │
        ▼
Find PC in MongoDB
        │
        ▼
192.168.1.25:5900
        │
        ▼
net.Socket connects to TightVNC
        │
        ▼
WS data ⇄ TCP data
```

------------------------------------------------------------------------

# 11. Start the Backend

Use the script defined by the backend `package.json`.

Common development command:

``` bash
npm run dev
```

or, depending on the project:

``` bash
npm start
```

Expected services:

``` text
REST API:
http://localhost:3000

VNC WebSocket Gateway:
ws://localhost:6080
```

Typical startup logs:

``` text
MongoDB connected
API server running on port 3000
VNC WebSocket gateway running on port 6080
```

------------------------------------------------------------------------

# 12. Frontend Setup

Open another terminal:

``` bash
cd remote-desktop-ui
```

Install packages:

``` bash
npm install
```

The application uses noVNC:

``` bash
npm install @novnc/novnc
```

The working import used by this project is:

``` typescript
import RFB from '@novnc/novnc';
```

Configure the frontend API and WebSocket URLs in the project's
environment/configuration files.

Example:

``` typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  vncWsUrl: 'ws://localhost:6080'
};
```

For another device to access the Angular app, replace `localhost` with
the host PC's reachable LAN IP where appropriate.

------------------------------------------------------------------------

# 13. Start the Frontend

Run:

``` bash
ng serve
```

or:

``` bash
npm start
```

Open:

``` text
http://localhost:4200
```

To expose Angular to other devices on your LAN during development:

``` bash
ng serve --host 0.0.0.0
```

Then another device can access:

``` text
http://<host-pc-ip>:4200
```

Only do this on a trusted network and ensure firewall rules are
appropriate.

------------------------------------------------------------------------

# 14. Add a Remote PC

From the dashboard choose **Add PC**.

Example:

``` text
ID:       001
Name:     Personal Desktop
Host:     192.168.1.25
Port:     5900
Active:   Yes
```

The backend saves the PC to MongoDB.

The dashboard loads PCs from the database rather than from a static
frontend list.

------------------------------------------------------------------------

# 15. Create a Remote Session

When the user clicks **Connect**, the application should create or
validate a remote session before opening the VNC stream.

Recommended flow:

``` text
User clicks Connect
        │
        ▼
Angular sends PC ID
        │
        ▼
POST /api/sessions
        │
        ▼
Backend validates JWT
        │
        ▼
Backend checks PC + authorization
        │
        ▼
Session created
        │
        ▼
sessionId / short-lived connection token
        │
        ▼
Navigate to Remote Session page
        │
        ▼
Open authenticated WebSocket
        │
        ▼
Node gateway connects to VNC :5900
```

Example session record:

``` json
{
  "sessionId": "generated-session-id",
  "userId": "user-id",
  "pcId": "001",
  "status": "ACTIVE",
  "startedAt": "2026-09-27T08:00:00.000Z"
}
```

When the user disconnects:

``` text
ACTIVE → DISCONNECTED
```

Store `endedAt` if session auditing is required.

------------------------------------------------------------------------

# 16. VNC Password Flow

When noVNC connects to TightVNC, the VNC server may request credentials.

noVNC triggers the credentials-required event.

Application flow:

``` text
Connect
   │
   ▼
WebSocket Gateway
   │
   ▼
TightVNC
   │
   ▼
Credentials Required
   │
   ▼
Angular opens password modal
   │
   ▼
User enters VNC password
   │
   ▼
rfb.sendCredentials(...)
   │
   ▼
Remote desktop displayed
```

Example:

``` typescript
rfb.sendCredentials({
  password: enteredPassword
});
```

Do not store the VNC password in plain text in MongoDB, source code,
Angular environment files, logs, or Git.

Prefer entering it at connection time or retrieving it from an
appropriate secrets mechanism if automated credential management is
later required.

------------------------------------------------------------------------

# 17. Remote Desktop Controls

Once connected, noVNC handles:

-   Remote screen rendering
-   Mouse movement
-   Mouse clicks
-   Keyboard input
-   VNC protocol communication
-   Scaling
-   Connection state

The remote-session page can provide:

``` text
Connecting
Connected
Disconnected
```

Controls:

``` text
Fullscreen
Disconnect
Back to PC List
```

The toolbar should remain accessible in normal and fullscreen modes.

------------------------------------------------------------------------

# 18. Disconnect Session

When the user clicks **Disconnect**:

``` typescript
rfb.disconnect();
```

The application should also:

1.  Close the browser WebSocket.
2.  Close the backend TCP socket.
3.  Mark the application session as disconnected.
4.  Record the end time if auditing is enabled.
5.  Clean up video/audio resources if a call is active.

Never leave abandoned TCP/WebSocket connections running unnecessarily.

------------------------------------------------------------------------

# 19. Video Call / Audio Architecture

VNC itself is for the remote desktop and does **not** provide a normal
browser video-call feature.

Use **WebRTC** for camera/microphone communication.

Recommended architecture:

``` text
User A Browser                         User B Browser
┌─────────────────┐                 ┌─────────────────┐
│ Angular         │                 │ Angular         │
│ getUserMedia()  │                 │ getUserMedia()  │
│ RTCPeerConnection│                │ RTCPeerConnection│
└────────┬────────┘                 └────────┬────────┘
         │                                   │
         │ SDP Offer / Answer / ICE          │
         └──────────────┬────────────────────┘
                        │
                        ▼
              Node Signaling Server
                        │
                        ▼
                 Session / Room ID

After negotiation:

Browser A  ◄════════ WebRTC Media ════════► Browser B
```

The Node.js backend is primarily used for **signaling**. Audio/video
normally flows peer-to-peer when network conditions allow.

A production Internet deployment may also require a **STUN/TURN**
service because direct peer-to-peer connectivity is not always possible
through NAT/firewalls.

------------------------------------------------------------------------

# 20. Video Call Session Flow

A practical flow is:

``` text
Remote session created
        │
        ▼
Create/join video room using sessionId
        │
        ▼
Request camera + microphone
        │
        ▼
getUserMedia()
        │
        ▼
Create RTCPeerConnection
        │
        ▼
Caller creates SDP offer
        │
        ▼
Offer sent through signaling server
        │
        ▼
Receiver creates SDP answer
        │
        ▼
Exchange ICE candidates
        │
        ▼
WebRTC connection established
        │
        ▼
Audio/video streams displayed
```

Example media request:

``` typescript
const stream = await navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
});
```

Production browsers generally require **HTTPS** for camera/microphone
access, except for special local-development contexts such as localhost.

------------------------------------------------------------------------

# 21. Video Call Authorization

Do not allow arbitrary users to join a video room simply by knowing its
ID.

Before joining:

``` text
JWT validation
      │
      ▼
Remote session validation
      │
      ▼
Check user belongs to session
      │
      ▼
Allow signaling room join
```

A video room can use the remote `sessionId` as its logical room
identifier, but the server must still authorize membership.

Recommended signaling events might include:

``` text
join-session
offer
answer
ice-candidate
leave-session
```

These names are examples; use the event names actually implemented in
the repository.

------------------------------------------------------------------------

# 22. Full Application Startup

Start components in this order.

### Step 1 --- Remote PC

Start/verify:

``` text
TightVNC Server
TCP port 5900
```

### Step 2 --- MongoDB

Start local MongoDB or verify Atlas connectivity.

### Step 3 --- Backend

``` bash
cd remote-desktop-api
npm install
npm run dev
```

Verify:

``` text
API      : http://localhost:3000
VNC WS   : ws://localhost:6080
MongoDB  : Connected
```

### Step 4 --- Frontend

``` bash
cd remote-desktop-ui
npm install
ng serve
```

Open:

``` text
http://localhost:4200
```

### Step 5 --- Login

Authenticate with a valid application user.

### Step 6 --- Register PC

Add:

``` text
Remote PC name
Remote PC IP
VNC port
```

### Step 7 --- Connect

Click:

``` text
Connect
```

Enter the TightVNC password when prompted.

The remote screen should become visible and mouse/keyboard control
should work.

------------------------------------------------------------------------

# 23. End-to-End Flow

``` text
1. User opens Angular app
             │
2. User logs in
             │
3. Backend returns JWT
             │
4. Angular requests PC list
             │
5. User selects PC
             │
6. Backend authorizes session
             │
7. Session created
             │
8. Angular opens VNC WebSocket
             │
9. Node finds PC in MongoDB
             │
10. Node opens TCP connection to <PC>:5900
             │
11. TightVNC requests credentials
             │
12. Angular shows password modal
             │
13. noVNC sends credentials
             │
14. VNC authentication succeeds
             │
15. Remote desktop appears
             │
16. Mouse/keyboard control enabled
             │
17. Optional WebRTC video room joined
             │
18. User disconnects
             │
19. WS/TCP/media connections closed
             │
20. Session marked DISCONNECTED
```

------------------------------------------------------------------------

# 24. Network Ports

  Service                        Default Port Purpose
  ----------------------- ------------------- -----------------------------------
  Angular                                4200 Frontend development server
  Node REST API                          3000 Backend API
  VNC WebSocket Gateway                  6080 Browser-to-Node VNC transport
  TightVNC                               5900 Node-to-remote-PC VNC
  MongoDB                               27017 Local MongoDB
  HTTPS                                   443 Recommended production web access
  TURN                      Depends on server WebRTC relay when required

Ports can be changed through project configuration.

------------------------------------------------------------------------

# 25. Security

This project gives users control of remote computers, so security is
critical.

For anything beyond a trusted local-network development environment:

-   Use **HTTPS**
-   Use **WSS** instead of plain WebSockets
-   Authenticate REST endpoints
-   Authenticate WebSocket connections
-   Use short-lived session/connection tokens
-   Enforce authorization per remote PC
-   Never expose VNC port `5900` directly to the Internet
-   Never store VNC passwords in Angular source code
-   Never log passwords, JWTs, or WebRTC secrets
-   Hash application passwords securely
-   Validate all API inputs
-   Restrict CORS to approved origins
-   Rate-limit authentication endpoints
-   Expire abandoned sessions
-   Close TCP/WebSocket connections on disconnect
-   Keep TightVNC, Node.js, Angular dependencies, and Windows patched
-   Use TURN credentials with appropriate expiration when TURN is
    introduced

For Internet access, prefer a secure VPN/private-network design rather
than forwarding VNC directly from the router.

------------------------------------------------------------------------

# 26. Recommended `.gitignore`

Backend:

``` gitignore
node_modules/
dist/
.env
*.log
```

Frontend:

``` gitignore
node_modules/
dist/
.angular/
.env
```

Never commit:

``` text
VNC passwords
JWT secrets
MongoDB credentials
TURN credentials
Private keys
Production environment files
```

------------------------------------------------------------------------

# 27. Troubleshooting

## Remote PC screen does not appear

Check:

``` powershell
Test-NetConnection <remote-ip> -Port 5900
```

If false, investigate TightVNC, firewall, IP address, and network
reachability.

## WebSocket disconnects immediately

Verify:

``` text
Backend is running
Port 6080 is reachable
PC ID exists in MongoDB
Remote host/port are correct
Authentication/session token is valid
```

## VNC credentials popup appears

This is expected when the TightVNC server requires authentication.

Enter the VNC password configured on the remote PC.

## Black screen

Check:

-   Remote Windows PC is awake
-   TightVNC service is running
-   A desktop session is available
-   VNC authentication succeeded
-   noVNC reports a connected state

## Mouse/keyboard does not work

Check that:

-   noVNC is connected
-   View-only mode is disabled
-   TightVNC permits remote input
-   The remote screen element has focus when required

## MongoDB does not connect

Check:

``` text
MONGODB_URI
MongoDB service
Atlas IP allow list
Username/password
Firewall/network
```

------------------------------------------------------------------------

# 28. Production Recommendations

The development architecture is suitable for a personal POC, but a
production-ready deployment should add:

``` text
HTTPS/WSS
Reverse proxy
Strong authentication
Fine-grained PC authorization
Session expiry
Audit logging
Secure secrets management
VPN/private networking
STUN/TURN for WebRTC
Connection health checks
Rate limiting
Input validation
Centralized error handling
```

A typical deployment could look like:

``` text
                 HTTPS / WSS
                      │
                      ▼
                Reverse Proxy
                 (e.g. Nginx)
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
      Angular UI              Node API/WS
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
                 MongoDB                  Private Network
                                               │
                                               ▼
                                         Remote PC :5900
```

------------------------------------------------------------------------

# 29. Development Checklist

Before testing a remote connection:

``` text
[ ] MongoDB is running
[ ] Backend dependencies installed
[ ] Backend .env created
[ ] REST API running on 3000
[ ] VNC gateway running on 6080
[ ] Angular dependencies installed
[ ] Angular running on 4200
[ ] Remote PC is powered on
[ ] TightVNC Server is running
[ ] VNC password is configured
[ ] TCP 5900 is allowed through firewall
[ ] Remote PC IP is correct
[ ] PC exists in MongoDB
[ ] User is authenticated
[ ] User is authorized for the selected PC
```

For video calling:

``` text
[ ] Camera permission granted
[ ] Microphone permission granted
[ ] Signaling connection established
[ ] User authorized for the session/room
[ ] STUN/TURN configured when required
[ ] HTTPS/WSS enabled for non-local production use
```

------------------------------------------------------------------------

# 30. Important Note

The exact commands, REST routes, authentication model, session schema,
and video-signaling event names should match the source code in your
repository.

The core remote-desktop path for this application is:

``` text
Angular 22
   ↓
@novnc/novnc
   ↓
WebSocket :6080
   ↓
Node.js VNC Gateway
   ↓
TCP :5900
   ↓
TightVNC Server
   ↓
Remote Windows PC
```

This separation is important: **noVNC runs in the browser, Node.js
bridges WebSocket to TCP, and TightVNC provides the actual VNC server on
the remote computer.**
