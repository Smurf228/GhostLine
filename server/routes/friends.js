const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Friendship = require('../models/Friendship');

let _io;
const setIo = (io) => { _io = io; };

// GET /api/friends/search?q=...&userId=... — поиск пользователей (исключая друзей и себя)
router.get('/search', async (req, res) => {
  const { q, userId } = req.query;
  if (!q || q.length < 2) return res.json([]);

  try {
    const existing = await Friendship.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: { $in: ['pending', 'accepted'] }
    });

    const excludeIds = existing.map(f =>
      f.sender.toString() === userId ? f.receiver.toString() : f.sender.toString()
    );

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: userId, $nin: excludeIds }
    }).select('username _id').limit(10);

    res.json(users);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/friends/pending?userId=... — входящие заявки
router.get('/pending', async (req, res) => {
  const { userId } = req.query;
  try {
    const requests = await Friendship.find({
      receiver: userId,
      status: 'pending'
    }).populate('sender', 'username');

    res.json(requests.map(r => ({
      _id: r._id.toString(),
      sender: { _id: r.sender._id.toString(), username: r.sender.username },
      createdAt: r.createdAt
    })));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/friends?userId=... — список принятых друзей
router.get('/', async (req, res) => {
  const { userId } = req.query;
  try {
    const friendships = await Friendship.find({
      $or: [{ sender: userId }, { receiver: userId }],
      status: 'accepted'
    }).populate('sender receiver', 'username');

    const friends = friendships.map(f => {
      const friend = f.sender._id.toString() === userId ? f.receiver : f.sender;
      return { _id: friend._id.toString(), username: friend.username };
    });

    res.json(friends);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/friends/request — отправить заявку
router.post('/request', async (req, res) => {
  const { senderId, receiverId } = req.body;
  if (!senderId || !receiverId || senderId === receiverId) {
    return res.status(400).json({ message: 'Invalid request' });
  }

  try {
    const existing = await Friendship.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: 'Request already exists' });
    }

    const friendship = await Friendship.create({ sender: senderId, receiver: receiverId });
    const populated = await friendship.populate('sender receiver', 'username');

    if (_io) {
      _io.to(`user:${receiverId}`).emit('friend_request', {
        _id: populated._id.toString(),
        sender: { _id: populated.sender._id.toString(), username: populated.sender.username },
        createdAt: populated.createdAt
      });
    }

    res.status(201).json({ message: 'Request sent' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/friends/:id/accept — принять заявку
router.put('/:id/accept', async (req, res) => {
  try {
    const friendship = await Friendship.findByIdAndUpdate(
      req.params.id,
      { status: 'accepted' },
      { new: true }
    ).populate('sender receiver', 'username');

    if (!friendship) return res.status(404).json({ message: 'Not found' });

    // Уведомляем отправителя заявки о принятии
    if (_io) {
      _io.to(`user:${friendship.sender._id.toString()}`).emit('friend_accepted', {
        _id: friendship.receiver._id.toString(),
        username: friendship.receiver.username
      });
    }

    // Возвращаем данные нового друга (отправитель заявки) для того, кто принял
    res.json({ _id: friendship.sender._id.toString(), username: friendship.sender.username });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/friends/:id/reject — отклонить заявку
router.put('/:id/reject', async (req, res) => {
  try {
    await Friendship.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    res.json({ message: 'Rejected' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
module.exports.setIo = setIo;
