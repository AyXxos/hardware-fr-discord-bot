const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { AttachmentBuilder, Collection, EmbedBuilder } = require('discord.js');
const { console } = require("inspector");
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheTHNAtt.json");
const tools = require("../tools.js");

const getTHN = async () => {
  const url = "https://thehackernews.com/search/label/Cyber%20Attack";

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const THNAttacks = [];

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

      THNAttacks.push({
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
        console.warn("⚠️ Cache THN Attack corrompu, il sera réinitialisé.");
        cached = [];
      }
    }

    const newTHNAttacks = THNAttacks.filter(
      (att) => !cached.some((old) => old.link === att.link)
    );

    if (newTHNAttacks.length > 0) {
      const updatedCache = [...cached, ...newTHNAttacks];
      fs.writeFileSync(CACHE_FILE, JSON.stringify(updatedCache, null, 2), "utf-8");
    }

    return newTHNAttacks;
  } catch (error) {
    console.error("❌ Erreur lors du scraping de THN Attack :", error.message);
    return [];
  }
};

module.exports = async (bot) => {
  const logBotChannelId = '1422875116919849080'
  const logChannel = bot.channels.cache.get(logBotChannelId);
  const guild = bot.guilds.cache.get('1422868425461727306');
  const forum = await guild.channels.fetch("1423593016102486057");
  const tags = ["1423648440172285993"];
  if (!forum) {
    console.error("❌ Forum introuvable pour The Hacker News. Vérifie l'ID du forum.");
    return;
  }

  const newTHNAttacks = await getTHN();

  if (newTHNAttacks.length === 0) {
    logChannel.send("📭 Aucun nouvel alert THN trouvé.");
    return;
  }

  for (let i = 0; i < newTHNAttacks.length; i++) {
    const att = newTHNAttacks[i];
    const color = tools.randomColor();
    try {
      const embed = new EmbedBuilder()
          .setColor(color)
          .setTitle(att.title)
          .addFields({ name: "📌 Statut", value: att.status, inline: true })
          .addFields({ name: "📝 Description", value: att.description || "Pas de description disponible." })
          .setFooter({ text: att.date });

      if (att.link) {
        embed.addFields({ name: "🔗 Lire l'info complète", value: `[Lien vers le site](${att.link})` });
      }

      await forum.threads.create({
        name: att.title,
        message: {
          content: att.status,
          embeds: [embed],
      },
      appliedTags: tags,
      autoArchiveDuration: 10080, // 7 jours avant archivage auto
      rateLimitPerUser: 10 // slowmode : 10s par message
    });

    } catch (err) {
      console.error(`❌ Erreur pour ${att.title} :`, err.message);
    } finally {
      console.log(`✅ Attaque The Hacker News envoyée pour : ${att.title}`);
    }
  }
  logChannel.send(`📦 ${newTHNAttacks.length} attaque(s) envoyé(s) .`);

};
