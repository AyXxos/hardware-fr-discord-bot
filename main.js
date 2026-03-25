const Discord = require("discord.js");
const cron = require("node-cron");
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

// ASTUCES
const generateHtmlAstuce = require("./Astuces/astuces_html.js");
const generateCAstuce = require("./Astuces/astuces_c.js");
const generatePythonAstuce = require("./Astuces/astuces_python.js");

const ASTUCES_ROTATION = [
  { name: "C", handler: generateCAstuce },
  { name: "Python", handler: generatePythonAstuce },
  { name: "HTML", handler: generateHtmlAstuce },
];

let astuceCronStarted = false;

function getDailyAstuce() {
  const today = new Date();
  const midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysSinceEpoch = Math.floor(midnight.getTime() / (1000 * 60 * 60 * 24));
  const index = ((daysSinceEpoch % ASTUCES_ROTATION.length) + ASTUCES_ROTATION.length) % ASTUCES_ROTATION.length;
  return ASTUCES_ROTATION[index];
}

async function sendDailyRotatingAstuce(bot, logChannel) {
  const astuceOfDay = getDailyAstuce();
  try {
    await astuceOfDay.handler(bot);
    if (logChannel) {
      await logChannel.send(`💡 Astuce du jour envoyée : ${astuceOfDay.name}`);
    }
  } catch (error) {
    console.error(`❌ Erreur cron astuces (${astuceOfDay.name}) :`, error.message);
    if (logChannel) {
      await logChannel.send(`❌ Erreur cron astuces (${astuceOfDay.name}) : ${error.message}`);
    }
  }
}


bot.login(config.token);
loadCommands(bot);
loadEvents(bot);

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

  const logBotChannelId = '1422875116919849080'
  const logChannel = bot.channels.cache.get(logBotChannelId);

  if (!astuceCronStarted) {
    cron.schedule("0 9 * * *", async () => {
      await sendDailyRotatingAstuce(bot, logChannel);
    }, { timezone: "Europe/Paris" });

    astuceCronStarted = true;
    if (logChannel) {
      logChannel.send("🕘 Cron astuces activé : envoi quotidien à 09:00 (Europe/Paris), rotation C → Python → HTML.");
    }
  }

  // Puis répéter toutes les heures
  setInterval(() => {
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

