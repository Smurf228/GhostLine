const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const channelRoutes = require('./routes/channels');
const dmRoutes = require('./routes/dm');
const friendsRoutes = require('./routes/friends');
const channelInvitesRoutes = require('./routes/channelInvites');
const Message = require('./models/Message');
const DirectMessage = require('./models/DirectMessage');
const User = require('./models/User');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PUT']
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/channel-invites', channelInvitesRoutes);
channelRoutes.setIo(io);
friendsRoutes.setIo(io);
channelInvitesRoutes.setIo(io);

// Socket.io
const onlineUsers = {}; // socketId -> { id, username, status }
const voiceRooms = {};  // channelId -> [{ socketId, userId, username }]

io.on('connection', (socket) => {
  console.log(`> User connected: ${socket.id}`);

  // Пользователь регистрируется
  socket.on('user_online', ({ id, username, role }) => {
    onlineUsers[socket.id] = { id, username, status: 'ONLINE', role };
    socket.join(`user:${id}`);
    io.emit('online_users', Object.values(onlineUsers));
  });

  // Смена статуса
  socket.on('change_status', (status) => {
    if (onlineUsers[socket.id]) {
      onlineUsers[socket.id].status = status;
      io.emit('online_users', Object.values(onlineUsers));
    }
  });

  // Пользователь заходит в канал
  socket.on('join_channel', (channelId) => {
    socket.join(channelId);
    console.log(`> User ${socket.id} joined channel ${channelId}`);
  });

  // Пользователь отправляет сообщение
  socket.on('send_message', async (data) => {
    const { text, senderId, channelId } = data;

    const message = await Message.create({
      text,
      sender: senderId,
      channel: channelId
    });

    const populated = await message.populate('sender', 'username');

    const messageData = {
      _id: populated._id.toString(),
      text: populated.text,
      sender: {
        _id: populated.sender._id.toString(),
        username: populated.sender.username,
      },
      channel: channelId,
      createdAt: populated.createdAt,
    };

    io.to(channelId).emit('receive_message', messageData);
  });

  // Индикатор печати
  socket.on('typing', (data) => {
    socket.to(data.channelId).emit('user_typing', data.username);
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.channelId).emit('user_stop_typing', data.username);
  });

  // Личные сообщения
  socket.on('send_dm', async ({ text, senderId, receiverId }) => {
    try {
      const dm = await DirectMessage.create({ text, sender: senderId, receiver: receiverId });
      const populated = await dm.populate('sender', 'username');

      const dmData = {
        _id: populated._id.toString(),
        text: populated.text,
        sender: {
          _id: populated.sender._id.toString(),
          username: populated.sender.username,
        },
        receiverId,
        createdAt: populated.createdAt,
      };

      io.to(`user:${receiverId}`).emit('receive_dm', dmData);
      io.to(`user:${senderId}`).emit('receive_dm', dmData);
    } catch (err) {
      console.error('DM error:', err);
    }
  });

  // Голосовые звонки (сигналинг WebRTC)
  socket.on('join_voice', ({ channelId, userId, username }) => {
    if (!voiceRooms[channelId]) voiceRooms[channelId] = [];
    // Отправить новому участнику список уже находящихся в комнате
    socket.emit('voice_participants', voiceRooms[channelId]);
    // Уведомить остальных о новом участнике
    socket.to(channelId).emit('voice_user_joined', { socketId: socket.id, userId, username });
    voiceRooms[channelId].push({ socketId: socket.id, userId, username });
  });

  socket.on('leave_voice', ({ channelId }) => {
    if (voiceRooms[channelId]) {
      voiceRooms[channelId] = voiceRooms[channelId].filter(p => p.socketId !== socket.id);
      if (voiceRooms[channelId].length === 0) delete voiceRooms[channelId];
    }
    socket.to(channelId).emit('voice_user_left', { socketId: socket.id });
  });

  socket.on('voice_offer', ({ to, offer }) => {
    console.log(`[voice] offer relay ${socket.id.slice(0,6)} -> ${to.slice(0,6)}`);
    io.to(to).emit('voice_offer', { from: socket.id, offer });
  });

  socket.on('voice_answer', ({ to, answer }) => {
    console.log(`[voice] answer relay ${socket.id.slice(0,6)} -> ${to.slice(0,6)}`);
    io.to(to).emit('voice_answer', { from: socket.id, answer });
  });

  socket.on('voice_ice', ({ to, candidate }) => {
    io.to(to).emit('voice_ice', { from: socket.id, candidate });
  });

  socket.on('disconnect', () => {
    console.log(`> User disconnected: ${socket.id}`);
    // Очистить голосовые комнаты
    Object.entries(voiceRooms).forEach(([channelId, participants]) => {
      const before = participants.length;
      voiceRooms[channelId] = participants.filter(p => p.socketId !== socket.id);
      if (voiceRooms[channelId].length === 0) delete voiceRooms[channelId];
      else if (voiceRooms[channelId].length < before) {
        socket.to(channelId).emit('voice_user_left', { socketId: socket.id });
      }
    });
    delete onlineUsers[socket.id];
    io.emit('online_users', Object.values(onlineUsers));
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('> Connected to MongoDB');
    server.listen(process.env.PORT, () => {
      console.log(`> Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.log('DB connection error:', err));
