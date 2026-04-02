const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['ONLINE', 'AWAY', 'GHOST'],
    default: 'ONLINE'
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);