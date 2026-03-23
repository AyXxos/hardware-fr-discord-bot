const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { MessageEmbed } = require('discord.js');
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheDataLeaks.json");
const tools = require("../tools.js");
const getDataLeaks = async () => {
  const url = "https://frenchbreaches.com/blog.php";

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const dataLeaks = [];

    $('.blog-card').each(async (index, element) => {
      const titleRaw = $(element).find('h2.blog-card-title').text().trim();
      const linkRelative = $(element).attr('href');
      const link = linkRelative ? `https://frenchbreaches.com${linkRelative}` : null;
      const dateArticle = $(element).find('.blog-card-date').text().trim() || "Date non spécifiée";
      const description = $(element).find('.blog-card-excerpt').text().trim() || "Pas de description";
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const heure = now.getHours();
      const minutes = now.getMinutes();
      const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;
      if (!link || !titleRaw) return;

      dataLeaks.push({
        title: titleRaw,
        link,
        description,
        status: dateArticle,
        date : dateFormatted,
        timestamp: now.getTime()
      });
    });

    let cached = [];
    if (fs.existsSync(CACHE_FILE)) {
      try {
        const raw = fs.readFileSync(CACHE_FILE, "utf-8");
        cached = JSON.parse(raw || "[]");
      } catch (err) {
        console.warn("⚠️ Cache Data Leaks corrompu, il sera réinitialisé.");
        cached = [];
      }
    }

    const newDataLeaks = dataLeaks.filter(
      (sb) => !cached.some((old) => old.link === sb.link)
    );

    if (newDataLeaks.length > 0) {
      const updatedCache = [...cached, ...newDataLeaks];
      fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2), "utf-8");
    }

    return newDataLeaks;
  } catch (error) {
    console.error("❌ Erreur lors du scraping de Data Leaks :", error.message);
    return [];
  }
};

module.exports = async (bot) => {
  const logBotChannelId = tools.logsBotChannelId;
  const logChannel = bot.channels.cache.get(logBotChannelId);
  const guild = bot.guilds.cache.get(tools.guildId);
  const forum = await guild.channels.fetch("1478428658367594646");
  const tags = ["1478429751596028069"];
  
  if (!forum) {
    console.error("❌ Forum introuvable pour Data Leaks. Vérifie l'ID du forum.");
    return;
  }

  const newDataLeaks = await getDataLeaks();

  if (newDataLeaks.length === 0) {
    logChannel.send("📭 Aucun nouvel alert Data Leaks trouvé.");
    return;
  }

  for (let i = 0; i < newDataLeaks.length; i++) {
    const sb = newDataLeaks[i];
    const color = tools.randomColor();
    try {
      const embed = new MessageEmbed()
          .setColor(color)
          .setTitle(sb.title)
          .addField("📌 Statut", sb.status, true)
          .addField("📝 Description", sb.description || "Pas de description disponible.")
          .setFooter(sb.date);

      if (sb.link) {
        embed.addField("🔗 Lire l'alerte complète", `[Lien vers le site](${sb.link})`);
      }
      
      // Limiter le nom du thread à 100 caractères (limite Discord)
      const threadName = sb.title.length > 100 ? sb.title.substring(0, 97) + '...' : sb.title;
      
      const thread = await forum.threads.create({
        name: threadName,
        message: {
          content: sb.status,
          embeds: [embed],
      },
      appliedTags: tags,
      autoArchiveDuration: 10080, // 7 jours avant archivage auto
      rateLimitPerUser: 10 // slowmode : 10s par message
    });

    } catch (err) {
      console.error(`❌ ERREUR pour ${sb.title} :`);
      console.error(`   Message: ${err.message}`);
      console.error(`   Stack: ${err.stack}`);
    }
  }
  logChannel.send(`📦 ${newDataLeaks.length} alerte(s) envoyé(s) .`);

};
