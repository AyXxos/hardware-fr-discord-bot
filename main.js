const Discord = require("discord.js");
const config = require("./config.js");
const bot = new Discord.Client({ intents: 53608447 });
const loadCommands = require("./Loaders/loadCommands");
const loadEvents = require("./Loaders/loadEvents");
bot.commands = new Discord.Collection();
const { EmbedBuilder } = require("discord.js");

// WATCHERS
const certAlerts = require("./Watchers/CertAlertsWatcher.js");
const certAvis = require("./Watchers/CertAvisWatcher.js");
const thnVulWatcher = require("./Watchers/THNVulneWatcher.js");
const thAttWatcher = require("./Watchers/THNAttacksWatcher.js");
const thBreachWatcher = require("./Watchers/THNBreachesWatcher.js");
const electronicsweekly = require("./Watchers/ElectronicsWeeklyWatcher.js");
const cleanOldThreads = require("./tools/cleanOldThreads.js");
const cleanOldCacheEntries = require("./tools/cleanOldCacheEntries.js");
const dataLeaksWatcher = require("./Watchers/DataLeaksWatcher.js");

bot.login(config.token);
loadCommands(bot);
loadEvents(bot);

bot.on("guildMemberAdd", async (member) => {
  const roleId = "1391160831638503526"; 
  const role = member.guild.roles.cache.get(roleId);

  if (!role) {
    console.error("❌ Rôle introuvable !");
    return;
  }

  try {
    await member.roles.add(role);
    console.log(`✅ Rôle ${role.name} donné à ${member.user.tag}`);
  } catch (err) {
    console.error("Erreur en ajoutant le rôle :", err);
  }
  const channelId = "1391168142721683487";
  const channel = member.guild.channels.cache.get(channelId);
  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor("#00b0f4")
    .setTitle("🎉 Bienvenue sur le serveur !")
    .setDescription(`Salut ${member}, ravi de te voir parmi nous !`)
    .addFields(
      { name: "👥 Membre n°", value: `${member.guild.memberCount}`, inline: true },
      { name: "📜 Pense à lire :", value: "<#1391168855065231370>", inline: true }
    )
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: `${member.guild.name}`, iconURL: member.guild.iconURL({ dynamic: true }) })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
});

const allowedGuilds = ['1391151609194479777', '885931233010401290', '1067865973371187230'];

bot.on('guildCreate', async (guild) => {
  if (!allowedGuilds.includes(guild.id)) {
    await guild.leave();
  }
});




bot.on("ready", async () => {
  await certAlerts(bot);
  await certAvis(bot);
  await thnVulWatcher(bot);
  await thAttWatcher(bot);
  await thBreachWatcher(bot);
  await dataLeaksWatcher(bot);  
  await electronicsweekly(bot);
  await cleanOldThreads(bot); // Nettoyage initial au démarrage
  await cleanOldCacheEntries(bot); // Nettoyage des caches au démarrage
  // Puis répéter toutes les heures
  setInterval(() => {
    const logBotChannelId = '1422875116919849080'
    const logChannel = bot.channels.cache.get(logBotChannelId);
    logChannel.send("------------------------");
    const currentTime = new Date();
    logChannel.send(`Heure actuelle : ${currentTime.toLocaleTimeString()}`);
    logChannel.send("------------------------");

    certAlerts(bot);
    certAvis(bot);
    thnVulWatcher(bot);
    thAttWatcher(bot);
    thBreachWatcher(bot);
    dataLeaksWatcher(bot);
    electronicsweekly(bot);
    cleanOldThreads(bot); // Nettoyage périodique
    cleanOldCacheEntries(bot); // Nettoyage des caches périodique
  }, 1000 * 60 * 30); // Toutes les 1/2h
});

