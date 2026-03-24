const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { MessageEmbed } = require('discord.js');
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheCertAlerts.json");
const tools = require("../tools.js");
const getCert = async () => {
  const url = "https://www.cert.ssi.gouv.fr/alerte/";

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const certAlerts = [];

    $('.cert-alert').each(async (index, element) => {
      const titleRaw = $(element).find('.item-title a').text().trim();
      const relativeLink = $(element).find('.item-title a').attr('href');
      const link = relativeLink ? `https://www.cert.ssi.gouv.fr${relativeLink}` : null;
      const status = $(element).find('.item-status').text().trim() || "Statut inconnu";
      const description = $(element).find('.item-excerpt').text().trim() || "Pas de description";
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const heure = now.getHours();
      const minutes = now.getMinutes();
      const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;
      if (!link || !titleRaw) return;

      certAlerts.push({
        title: titleRaw,
        link,
        description,
        status,
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
        console.warn("⚠️ Cache Cert corrompu, il sera réinitialisé.");
        cached = [];
      }
    }

    const newCertAlerts = certAlerts.filter(
      (sb) => !cached.some((old) => old.link === sb.link)
    );

    if (newCertAlerts.length > 0) {
      const updatedCache = [...cached, ...newCertAlerts];
      fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2), "utf-8");
    }

    return newCertAlerts;
  } catch (error) {
    console.error("❌ Erreur lors du scraping de Cert :", error.message);
    return [];
  }
};

module.exports = async (bot) => {
  const logBotChannelId = tools.logsBotChannelId;
  const logChannel = bot.channels.cache.get(logBotChannelId);
  const guild = bot.guilds.cache.get(tools.guildId);
  const forum = await guild.channels.fetch("1478428865100648620");
  const tags = ["1478429248518885417"];
  if (!forum) {
    console.error("❌ Forum introuvable pour Cert. Vérifie l'ID du forum.");
    return;
  }

  const newCertAlerts = await getCert();

  if (newCertAlerts.length === 0) {
    logChannel.send("📭 Aucun nouvel alert Cert trouvé.");
    return;
  }

  for (let i = 0; i < newCertAlerts.length; i++) {
    const sb = newCertAlerts[i];
    if (sb.title.toLowerCase().includes("vulnérabilité") || sb.title.toLowerCase().includes("vulnérabilités")) tags.push("1478429132542050435"); // Ignorer les titres avec "Vulnétalibié"
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

      const threadName = sb.title.length > 100 ? sb.title.substring(0, 97) + '...' : sb.title;

      await forum.threads.create({
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
      console.error(`❌ Erreur pour ${sb.title} :`, err.message);
    } finally {
      console.log(`✅ Alerte Cert envoyée pour : ${sb.title}`);
    }
  }
  logChannel.send(`📦 ${newCertAlerts.length} alerte(s) envoyé(s) .`);

};
