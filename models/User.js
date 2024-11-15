const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  userId: String,
  cardCount: Number,
  coins: { type: Number, default: 0 },
  favoriteCard: String,
  searchText: String,
  currentStreak: Number,
  lastDaily: { type: Date, default: null },
  lastDrop: { type: Date, default: null },
  lastWork: { type: Date, default: null },
  lastUsedDate: { type: Date, default: null },
  hasUsedGenerate: { type: Boolean, default: false },
  GenerateStaff: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  warnings: { type: Number, default: 0, },
});

module.exports = mongoose.model('User', userSchema);
