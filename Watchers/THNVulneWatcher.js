const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder, Collection, EmbedBuilder } = require('discord.js');
const { console } = require("inspector");
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheTHNVul.json");
const tools = require("../tools.js");

const getTHN = async () => {
  const url = "https://thehackernews.com/search/label/Vulnerability";

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const THNVuln = [];

    $('.body-post').each(async (index, element) => {
      const titleRaw = $(element).find('.home-title').text().trim();
      const link = $(element).find('.story-link').attr('href');
      const status = $(element).find('.h-datetime').text().trim() || null;
      const description = $(element).find('.home-desc').text().trim() || "Pas de description";
      const now = new Date();
      const date = now.toLocaleDateString('fr-FR');
      const heure = now.getHours();
      const minutes = now.getMinutes();
      const dateFormatted = `${date} à ${heure}:${minutes < 10 ? '0' + minutes : minutes}`;
      if (!link || !titleRaw || status == null) return;

      THNVuln.push({
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
        console.warn("⚠️ Cache THN Vulnerability corrompu, il sera réinitialisé.");
        cached = [];
      }
    }

    const newTHNVuln = THNVuln.filter(
      (vul) => !cached.some((old) => old.link === vul.link)
    );

    if (newTHNVuln.length > 0) {
      const updatedCache = [...cached, ...newTHNVuln];
      fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2), "utf-8");
    }

    return newTHNVuln;
  } catch (error) {
    console.error("❌ Erreur lors du scraping de THN Vulnerability :", error.message);
    return [];
  }
};

module.exports = async (bot) => {
  const logBotChannelId = '1422875116919849080'
  const logChannel = bot.channels.cache.get(logBotChannelId);
  const guild = bot.guilds.cache.get('1422868425461727306');
  const forum = await guild.channels.fetch("1423593016102486057");
  const tags = ["1423630615919464499"];
  if (!forum) {
    console.error("❌ Forum introuvable pour The Hacker News. Vérifie l'ID du forum.");
    return;
  }

  const newTHNVuln = await getTHN();

  if (newTHNVuln.length === 0) {
    logChannel.send("📭 Aucun nouvel alert THN trouvé.");
    return;
  }

  for (let i = 0; i < newTHNVuln.length; i++) {
    const vul = newTHNVuln[i];
    const color = tools.randomColor();
    try {
      const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(vul.title)
          .addFields({ name: "📌 Statut", value: vul.status, inline: true })
          .addFields({ name: "📝 Description", value: vul.description || "Pas de description disponible." })
          .setFooter({ text: vul.date });

      if (vul.link) {
        embed.addFields({ name: "🔗 Lire l'info complète", value: `[Lien vers le site](${vul.link})` });
      }

      await forum.threads.create({
        name: vul.title,
        message: {
          content: vul.status,
          embeds: [embed],
      },
      appliedTags: tags,
      autoArchiveDuration: 10080, // 7 jours avant archivage auto
      rateLimitPerUser: 10 // slowmode : 10s par message
    });

    } catch (err) {
      console.error(`❌ Erreur pour ${vul.title} :`, err.message);
    } finally {
      console.log(`✅ Vulnerabilité The Hacker News envoyée pour : ${vul.title}`);
    }
  }
  logChannel.send(`📦 ${newTHNVuln.length} alerte(s) envoyé(s) .`);

};
