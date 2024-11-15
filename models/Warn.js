const mongoose = require('mongoose');

const warnSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // ID del usuario al que se le dio la advertencia
  moderatorId: { type: String, required: true }, // ID del moderador que emitió la advertencia
  reason: { type: String, required: true }, // Razón de la advertencia
  date: { type: Date, default: Date.now }, // Fecha de la advertencia
});

const Warn = mongoose.model('Warn', warnSchema);

module.exports = Warn;
