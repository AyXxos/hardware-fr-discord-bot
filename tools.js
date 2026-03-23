const fs = require("fs");

function loadEmojis() {
    if (!fs.existsSync(EMOJI_FILE)) return {};
    try {
        const data = fs.readFileSync(EMOJI_FILE, "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Erreur lors du chargement des collections :", err);
            return {};
        }
}

module.exports = {

    loadEmojis: loadEmojis,

    randint: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    randomColor: function() {
        const num = this.randint(1, 32);
        const couleurs = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
        let randomColor = '#';
        for (let i = 0; i < 6; i++) {
            randomColor += couleurs[this.randint(0, 15)];
        }
        return randomColor;
    },
    randomEmoji: function() {
        const emojis = loadEmojis();
        return emojis[this.randint(0, emojis.length - 1)];
    },
    logsBotChannelId: '1478430424098275348',
    guildId: '1067865973371187230',
    
}
