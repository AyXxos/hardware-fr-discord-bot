const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const { MessageEmbed } = require('discord.js');
const CACHE_FILE = path.join(__dirname, "../data/caches/cacheDataLeaks.json");
const tools = require("../tools.js");

const BLOG_URL = "https://frenchbreaches.com/blog.php";
const FEED_URL = "https://frenchbreaches.com/feed.xml";
const MAX_ITEMS = 30;
const REQUEST_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Referer": "https://frenchbreaches.com/",
  "Connection": "keep-alive"
};

const truncate = (value, maxLength) => {
  const text = String(value || "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 3)}...`;
};

const buildDateFormatted = () => {
  const now = new Date();
  const date = now.toLocaleDateString("fr-FR");
  const heure = now.getHours();
  const minutes = now.getMinutes();
  return {
    now,
    dateFormatted: `${date} à ${heure}:${minutes < 10 ? `0${minutes}` : minutes}`
  };
};

const fetchDataLeaksFromBlog = async () => {
  const response = await axios.get(BLOG_URL, {
    headers: REQUEST_HEADERS,
    timeout: 20000,
    validateStatus: () => true
  });

  if (response.status === 403) {
    throw new Error("HTTP 403 sur blog.php");
  }

  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status} sur blog.php`);
  }

  const $ = cheerio.load(response.data);
  const dataLeaks = [];

  $(".blog-card").each((index, element) => {
    if (index >= MAX_ITEMS) return;

    const titleRaw = $(element).find("h2.blog-card-title").text().trim();
    const linkRaw = $(element).attr("href");
    const link = !linkRaw
      ? null
      : linkRaw.startsWith("http")
        ? linkRaw
        : `https://frenchbreaches.com${linkRaw}`;
    const dateArticle = $(element).find(".blog-card-date").text().trim() || "Date non spécifiée";
    const description = $(element).find(".blog-card-excerpt").text().replace(/\s+/g, " ").trim() || "Pas de description";
    const { now, dateFormatted } = buildDateFormatted();

    if (!link || !titleRaw) return;

    dataLeaks.push({
      title: titleRaw,
      link,
      description,
      status: dateArticle,
      date: dateFormatted,
      timestamp: now.getTime()
    });
  });

  return dataLeaks;
};

const fetchDataLeaksFromFeed = async () => {
  const response = await axios.get(FEED_URL, {
    headers: REQUEST_HEADERS,
    timeout: 20000,
    validateStatus: () => true
  });

  if (response.status >= 400) {
    throw new Error(`HTTP ${response.status} sur feed.xml`);
  }

  const $ = cheerio.load(response.data, { xmlMode: true });
  const dataLeaks = [];

  $("item").each((index, element) => {
    if (index >= MAX_ITEMS) return;

    const titleRaw = $(element).find("title").first().text().trim();
    const link = $(element).find("link").first().text().trim();
    const dateArticle = $(element).find("pubDate").first().text().trim() || "Date non spécifiée";
    const description = $(element).find("description").first().text().replace(/\s+/g, " ").trim() || "Pas de description";
    const { now, dateFormatted } = buildDateFormatted();

    if (!link || !titleRaw) return;

    dataLeaks.push({
      title: titleRaw,
      link,
      description,
      status: dateArticle,
      date: dateFormatted,
      timestamp: now.getTime()
    });
  });

  return dataLeaks;
};

const getDataLeaks = async () => {
  try {
    let dataLeaks = [];

    try {
      dataLeaks = await fetchDataLeaksFromBlog();
      if (dataLeaks.length === 0) {
        console.warn("⚠️ Data Leaks: blog.php vide, tentative via feed.xml.");
        dataLeaks = await fetchDataLeaksFromFeed();
      }
    } catch (blogError) {
      console.warn(`⚠️ Data Leaks: blog.php inaccessible (${blogError.message}), fallback feed.xml.`);
      dataLeaks = await fetchDataLeaksFromFeed();
    }

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
      fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
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
      const safeTitle = truncate(sb.title || "Alerte Data Leaks", 256);
      const safeStatus = truncate(sb.status || "Date non spécifiée", 1024);
      const safeDescription = truncate(sb.description || "Pas de description disponible.", 1024);

      const embed = new MessageEmbed()
          .setColor(color)
          .setTitle(safeTitle)
          .addField("📌 Statut", safeStatus, true)
          .addField("📝 Description", safeDescription)
          .setFooter(sb.date);

      if (sb.link) {
        embed.addField("🔗 Lire l'alerte complète", `[Lien vers le site](${sb.link})`);
      }
      
      // Limiter le nom du thread à 100 caractères (limite Discord)
      const threadName = safeTitle.length > 100 ? safeTitle.substring(0, 97) + '...' : safeTitle;
      
      await forum.threads.create({
        name: threadName,
        message: {
          content: safeStatus,
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
