const express = require('express');
const router = express.Router();
const Channel = require('../models/Channel');
const Message = require('../models/Message');

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

module.exports = router;
