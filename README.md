# 👻 GhostLine — Cyberpunk Real-Time Chat

<div align="center">

![GhostLine](https://img.shields.io/badge/GHOST-LINE-00ff41?style=for-the-badge&labelColor=0a0a0a)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)

**A real-time chat application with a hacker/cyberpunk aesthetic.**

*Matrix rain • Neon glow • Message decryption effect • Live typing indicator*

</div>

---

## 🖥️ Preview

```
 ██████╗ ██╗  ██╗ ██████╗ ███████╗████████╗██╗     ██╗███╗   ██╗███████╗
██╔════╝ ██║  ██║██╔═══██╗██╔════╝╚══██╔══╝██║     ██║████╗  ██║██╔════╝
██║  ███╗███████║██║   ██║███████╗   ██║   ██║     ██║██╔██╗ ██║█████╗  
██║   ██║██╔══██║██║   ██║╚════██║   ██║   ██║     ██║██║╚██╗██║██╔══╝  
╚██████╔╝██║  ██║╚██████╔╝███████║   ██║   ███████╗██║██║ ╚████║███████╗
 ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝   ╚═╝   ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
                    [ SECURE TERMINAL v2.0.26 ]
```

## ✨ Features

- **🔐 Authentication** — Register & login with hacker handles (@username)
- **💬 Real-time messaging** — Instant communication via WebSocket (Socket.io)
- **📡 Channels** — Create and join chat rooms (#general, #darknet, etc.)
- **🔓 Message decryption effect** — Incoming messages appear as random symbols, then decrypt into readable text
- **⌨️ Typing indicator** — "@user is decrypting..." shown when someone is typing
- **🟢 Matrix rain** — Animated falling characters on the background (Canvas)
- **📺 Scanlines overlay** — CRT monitor effect
- **💚 Neon glow** — Glowing green text with text-shadow effects
- **🔤 Monospace font** — Fira Code for that authentic terminal feel

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express** — HTTP server & REST API
- **Socket.io** — WebSocket server for real-time communication
- **MongoDB** + **Mongoose** — Database & ODM
- **JWT** + **bcryptjs** — Authentication & password hashing

### Frontend
- **React 19** + **Vite** — UI framework & build tool
- **Socket.io-client** — WebSocket client
- **Axios** — HTTP requests
- **Framer Motion** — Animations

## 📁 Project Structure

```
GhostLine/
├── server/
│   ├── index.js              # Entry point, Express + Socket.io setup
│   ├── models/
│   │   ├── User.js           # User schema (username, password, status)
│   │   ├── Message.js        # Message schema (text, sender, channel)
│   │   └── Channel.js        # Channel schema (name, creator)
│   ├── routes/
│   │   ├── auth.js           # POST /register, POST /login
│   │   └── channels.js       # GET/POST channels, GET messages
│   ├── .env                  # Environment variables
│   └── package.json
│
└── client/
    ├── src/
    │   ├── App.jsx            # Main app component
    │   ├── socket.js          # Socket.io client instance
    │   ├── components/
    │   │   ├── MatrixRain.jsx # Canvas matrix rain animation
    │   │   ├── Login.jsx      # Login form
    │   │   ├── Register.jsx   # Registration form
    │   │   ├── Chat.jsx       # Main chat layout
    │   │   ├── Sidebar.jsx    # Channel list & user info
    │   │   ├── Messages.jsx   # Message display
    │   │   ├── ChatInput.jsx  # Message input with typing indicator
    │   │   └── DecryptText.jsx # Decryption animation effect
    │   └── index.css          # Global cyberpunk styles
    ├── index.html
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (free tier)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/GhostLine.git
cd GhostLine
```

### 2. Setup server
```bash
cd server
npm install
```

Create `.env` file:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
JWT_SECRET=your_secret_key_here
```

### 3. Setup client
```bash
cd ../client
npm install
```

### 4. Run
```bash
# Terminal 1 — Server
cd server
npm run dev

# Terminal 2 — Client
cd client
npm run dev
```

Open `http://localhost:5173` and enjoy! 🎮

## 🎨 Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| 🟢 Acid Green | `#00ff41` | Primary text, borders, glow |
| 🔵 Neon Cyan | `#00d4ff` | Usernames, accents |
| 🟣 Magenta | `#ff00ff` | Typing indicator |
| 🔴 Red | `#ff0040` | Errors, disconnect |
| ⚫ Black | `#0a0a0a` | Background |

<div align="center">

**Built with 💚 and terminal vibes**

`> connection terminated_█`

</div>
