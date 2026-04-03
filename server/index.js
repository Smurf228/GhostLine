const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const channelRoutes = require('./routes/channels');
const Message = require('./models/Message');
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
  methods: ['GET', 'POST', 'DELETE']
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

// Socket.io
io.on('connection', (socket) => {
  console.log(`> User connected: ${socket.id}`);

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

  socket.on('disconnect', () => {
    console.log(`> User disconnected: ${socket.id}`);
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
