const express = require('express');
const router = express.Router();
const ChannelInvite = require('../models/ChannelInvite');
const Channel = require('../models/Channel');
const Friendship = require('../models/Friendship');

let _io;
const setIo = (io) => { _io = io; };

// GET /api/channel-invites/pending?userId=... — входящие приглашения
router.get('/pending', async (req, res) => {
  const { userId } = req.query;
  try {
    const invites = await ChannelInvite.find({ receiver: userId, status: 'pending' })
      .populate('channel', 'name')
      .populate('sender', 'username');

    res.json(invites.map(inv => ({
      _id: inv._id.toString(),
      channel: { _id: inv.channel._id.toString(), name: inv.channel.name },
      sender: { _id: inv.sender._id.toString(), username: inv.sender.username },
      createdAt: inv.createdAt
    })));
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/channel-invites — отправить приглашение
router.post('/', async (req, res) => {
  const { channelId, senderId, receiverId } = req.body;

  try {
    // Проверить что отправитель состоит в канале
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found' });
    if (!channel.members.map(m => m.toString()).includes(senderId)) {
      return res.status(403).json({ message: 'Not a member' });
    }

    // Проверить дружбу
    const friendship = await Friendship.findOne({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ],
      status: 'accepted'
    });
    if (!friendship) return res.status(403).json({ message: 'Not friends' });

    // Проверить что ещё не приглашён / не состоит
    if (channel.members.map(m => m.toString()).includes(receiverId)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    const invite = await ChannelInvite.create({ channel: channelId, sender: senderId, receiver: receiverId });
    const populated = await invite.populate(['channel', 'sender']);

    if (_io) {
      _io.to(`user:${receiverId}`).emit('channel_invite', {
        _id: invite._id.toString(),
        channel: { _id: channel._id.toString(), name: channel.name },
        sender: { _id: populated.sender._id.toString(), username: populated.sender.username },
        createdAt: invite.createdAt
      });
    }

    res.status(201).json({ message: 'Invite sent' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Already invited' });
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/channel-invites/:id/accept — принять
router.put('/:id/accept', async (req, res) => {
  try {
    const invite = await ChannelInvite.findByIdAndUpdate(
      req.params.id,
      { status: 'accepted' },
      { new: true }
    ).populate('channel sender receiver', 'name username');

    if (!invite) return res.status(404).json({ message: 'Not found' });

    // Добавить в members
    await Channel.findByIdAndUpdate(invite.channel._id, {
      $addToSet: { members: invite.receiver._id }
    });

    const channelData = {
      _id: invite.channel._id.toString(),
      name: invite.channel.name,
      creator: invite.channel.creator ? invite.channel.creator.toString() : null,
      members: []
    };

    // Уведомить того кто принял (он же receiver)
    if (_io) _io.to(`user:${invite.receiver._id.toString()}`).emit('channel_created', channelData);

    res.json(channelData);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/channel-invites/:id/reject — отклонить
router.put('/:id/reject', async (req, res) => {
  try {
    await ChannelInvite.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    res.json({ message: 'Rejected' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
module.exports.setIo = setIo;
