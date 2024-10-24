const mongoose = require('mongoose');


const userSchema = new mongoose.Schema({
  userId: String,
  cardCount: Number,
  coins: { type: Number, default: 0 },
  favoriteCard: String,
  searchText: String,
  currentStreak: Number,
  lastDaily: { type: Date },
  lastDrop: { type: Date, default: null },
  lastWork: { type: Date, default: null },
  lastUsedDate: { type: Date, default: null },
  hasUsedGenerate: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', userSchema);
