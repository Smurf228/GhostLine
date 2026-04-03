const express = require('express');
const router = express.Router();
const DirectMessage = require('../models/DirectMessage');

// GET /api/dm?userId=X&with=Y — история переписки между двумя пользователями
router.get('/', async (req, res) => {
  const { userId, with: withId } = req.query;
  if (!userId || !withId) return res.status(400).json({ message: 'Missing params' });

  try {
    const messages = await DirectMessage.find({
      $or: [
        { sender: userId, receiver: withId },
        { sender: withId, receiver: userId }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(50)
      .populate('sender', 'username');

    res.json(messages);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
