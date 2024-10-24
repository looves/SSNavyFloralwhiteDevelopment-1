// ../utils/rarityToEmojis.js
module.exports = (rarity) => {
    const emojis = {
        1: '<:stars:1296709132266770432>',
        2: '<:stars:1296709132266770432><:stars:1296709132266770432>',
        3: '<:stars:1296709132266770432><:stars:1296709132266770432><:stars:1296709132266770432>'
    };

    return emojis[rarity] || '<:stars:1296709132266770432>'; // Default a una estrella si la rareza es inválida
};
