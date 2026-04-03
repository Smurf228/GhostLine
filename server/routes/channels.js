const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const Message = require('../models/Message');

let _io;
const setIo = (io) => { _io = io; };

// GET /api/channels — получить все каналы
router.get('/', async (req, res) => {
  try {
    const channels = await Channel.find();
    res.json(channels);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/channels — создать канал
router.post('/', async (req, res) => {
  try {
    const { name, creator } = req.body;

    const existing = await Channel.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'Channel already exists' });
    }

    const channel = await Channel.create({ name, creator });
    if (_io) _io.emit('channel_created', channel);
    res.status(201).json(channel);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/channels/:id/messages — получить сообщения канала
router.get('/:id/messages', async (req, res) => {
  try {
    const messages = await Message.find({ channel: req.params.id })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/channels/messages/:id — удалить сообщение
router.delete('/messages/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const senderId = message.sender.toString();
    const userId = req.body.userId;

    const requestingUser = await require('../models/User').findById(userId).select('role');
    const isAdmin = requestingUser?.role === 'admin';

    if (senderId !== userId && !isAdmin) {
      return res.status(403).json({ message: 'Not your message' });
    }

    const channelId = message.channel.toString();
    await message.deleteOne();
    if (_io) _io.to(channelId).emit('message_deleted', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/channels/:id — удалить канал (создатель или админ)
router.delete('/:id', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });

    const requestingUser = await require('../models/User').findById(req.body.userId).select('role');
    const isAdmin = requestingUser?.role === 'admin';

    if (channel.creator.toString() !== req.body.userId && !isAdmin) {
      return res.status(403).json({ message: 'Not your channel' });
    }

    await Message.deleteMany({ channel: req.params.id });
    await channel.deleteOne();
    if (_io) _io.emit('channel_deleted', req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
module.exports.setIo = setIo;
