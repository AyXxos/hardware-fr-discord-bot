const Discord = require("discord.js")

module.exports = {

    name: "ping",
    description: "Pong !",
    permission: "Aucune",
    dm: false,
    category: "Info | bot",

    async run(bot, message, args) {
        const logBotChannelId = '1478430424098275348'
        const logChannel = bot.channels.cache.get(logBotChannelId);
        const id = message.user.id;
        const user = bot.users.cache.get(id);
        logChannel.send("Commande ping utilisée par " + user.tag);
        await message.reply(`<a:peepodj:1391693167904161892> Le bot ${bot.user.tag} a un ping de ${bot.ws.ping} ms`)
    }
}
