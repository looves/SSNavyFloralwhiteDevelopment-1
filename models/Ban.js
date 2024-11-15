const mongoose = require('mongoose');

// Esquema para el baneo de un usuario
const banSchema = new mongoose.Schema({
  userId: {
    type: String, // ID del usuario baneado
    required: true,
  },
  moderatorId: {
    type: String, // ID del moderador que ejecutó el baneo
    required: true,
  },
  reason: {
    type: String, // Razón del baneo
    required: true,
  },
  timestamp: {
    type: String, // Fecha en que el baneo fue aplicado
    required: true,
  },
});

// Crear el modelo de Mongoose
const Ban = mongoose.model('Ban', banSchema);

module.exports = Ban;
