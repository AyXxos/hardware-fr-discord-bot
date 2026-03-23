const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder, Collection, EmbedBuilder } = require('discord.js');
const { console } = require("inspector");
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheElecWeekly.json");
const tools = require("../tools.js");

const getElecWeekly = async () => {
  const url = "https://www.electronicsweekly.com/news/";

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const ElecWeeklyArticles = [];

    $('.item-list').each(async (index, element) => {
      const titleRaw = $(element).find('.post-title a').text().trim();
      const link = $(element).find('.post-title a').attr('href');
      const status = $(element).find('.tie-date').text().trim() || null;
      const description = $(element).find('.entry p').text().trim() || "Pas de description";
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const heure = now.getHours();
      const minutes = now.getMinutes();
      const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;
      if (!link || !titleRaw || status == null) return;

      ElecWeeklyArticles.push({
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
        console.warn("⚠️ Cache ElecWeekly corrompu, il sera réinitialisé.");
        cached = [];
      }
    }

    const newElecWeeklyArticles = ElecWeeklyArticles.filter(
      (att) => !cached.some((old) => old.link === att.link)
    );

    if (newElecWeeklyArticles.length > 0) {
      const updatedCache = [...cached, ...newElecWeeklyArticles];
      fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2), "utf-8");
    }

    return newElecWeeklyArticles;
  } catch (error) {
    console.error("❌ Erreur lors du scraping de Electronics Weekly :", error.message);
    return [];
  }
};

module.exports = async (bot) => {
  const logBotChannelId = '1422875116919849080'
  const logChannel = bot.channels.cache.get(logBotChannelId);
  const guild = bot.guilds.cache.get('1422868425461727306');
  const forum = await guild.channels.fetch("1425398614284304434");
  const tags = [];
  if (!forum) {
    console.error("❌ Forum introuvable pour Electronics Weekly. Vérifie l'ID du forum.");
    return;
  }

  const newElecWeeklyArticles = await getElecWeekly();

  if (newElecWeeklyArticles.length === 0) {
    logChannel.send("📭 Aucun nouvel article Electronics Weekly trouvé.");
    return;
  }

  for (let i = 0; i < newElecWeeklyArticles.length; i++) {
    const article = newElecWeeklyArticles[i];
    if (article.title.toLowerCase().includes("")) tags.push("1425396315994591285"); // Tag Vulnérabilités
    const color = tools.randomColor();
    try {
      const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(article.title)
          .addFields({ name: "📌 Statut", value: article.status, inline: true })
          .addFields({ name: "📝 Description", value: article.description || "Pas de description disponible." })
          .setFooter({ text: article.date });

      if (article.link) {
        embed.addFields({ name: "🔗 Lire l'info complète", value: `[Lien vers le site](${article.link})` });
      }

      await forum.threads.create({
        name: article.title,
        message: {
          embeds: [embed],
      },
      appliedTags: tags,
      autoArchiveDuration: 10080, // 7 jours avant archivage auto
      rateLimitPerUser: 10 // slowmode : 10s par message
    });

    } catch (err) {
      console.error(`❌ Erreur pour ${article.title} :`, err.message);
    } finally {
      console.log(`✅ Article Electronics Weekly envoyé pour : ${article.title}`);
    }
  }
  logChannel.send(`📦 ${newElecWeeklyArticles.length} article(s) envoyé(s) .`);

};
