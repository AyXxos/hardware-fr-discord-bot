const Discord = require("discord.js")

module.exports = {

    name: "compile",
    description: "Compile le code source",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",
    

    async run(bot, message, args) {
        const logBotChannelId = '1422875116919849080'
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = message.user.id;
        const user = bot.users.cache.get(id);
        logChannel.send("Commande compile utilisée par " + user.tag);
        

    }
}