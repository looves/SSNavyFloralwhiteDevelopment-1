const Card = require('../models/Card');
const Inventory = require('../models/Inventory');

const incrementCardCount = async (userId, cardId) => {
  try {
    // Buscar la carta por su ID
    const card = await Card.findById(cardId);
    if (!card) {
      throw new Error('Carta no encontrada');
    }

    // Incrementar el contador de la carta (que representa el número de copias totales generadas)
    card.count = (card.count || 0) + 1;
    await card.save();

    // Actualizar el inventario del usuario
    let inventory = await Inventory.findOne({ userId });
    if (!inventory) {
      // Crear un inventario si no existe
      inventory = new Inventory({ userId, cards: [] });
    }

    // Verificar si el usuario ya tiene esta carta en su inventario
    const cardInInventory = inventory.cards.find(c => c.cardId.toString() === card._id.toString());
    if (cardInInventory) {
      // Si ya existe, aumentar el contador de esta carta en el inventario
      cardInInventory.count += 1;
    } else {
      // Si no existe, agregar la carta al inventario con 1 copia
      inventory.cards.push({ cardId: card._id, count: 1 });
    }

    // Guardar el inventario actualizado
    await inventory.save();

    // Retornar el número de copia actualizado y la carta
    return {
      copyNumber: card.count,
      card
    };

  } catch (error) {
    console.error('Error al incrementar el conteo de la carta:', error);
    throw error;
  }
};

module.exports = incrementCardCount;
