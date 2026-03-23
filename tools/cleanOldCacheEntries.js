const fs = require("fs");
const path = require("path");

/**
 * Nettoie les entrées des fichiers cache qui datent de plus de 1.5 mois (45 jours)
 * @param {Discord.Client} bot - L'instance du bot Discord
 */
module.exports = async (bot) => {
  const logBotChannelId = '1422875116919849080';
  const logChannel = bot.channels.cache.get(logBotChannelId);
  
  const CACHE_DIR = path.join(__dirname, "../data/caches");
  const ONE_AND_HALF_MONTHS_MS = 45 * 24 * 60 * 60 * 1000; // 1.5 mois en millisecondes
  const now = Date.now();
  
  // Liste des fichiers cache à nettoyer
  const cacheFiles = [
    "cacheCertAlerts.json",
    "cacheCertAvis.json",
    "cacheTHNVul.json",
    "cacheTHNAtt.json",
    "cacheTHNBreach.json",
    "cacheElecWeekly.json"
  ];

  let totalCleaned = 0;
  let totalRemaining = 0;

  try {
    for (const cacheFile of cacheFiles) {
      const cachePath = path.join(CACHE_DIR, cacheFile);
      
      if (!fs.existsSync(cachePath)) {
        console.warn(`⚠️ Fichier cache ${cacheFile} introuvable.`);
        continue;
      }

      try {
        const raw = fs.readFileSync(cachePath, "utf-8");
        const cached = JSON.parse(raw || "[]");
        const initialCount = cached.length;

        // Filtrer les entrées de moins de 45 jours
        const filteredCache = cached.filter((entry) => {
          // Si l'entrée a un timestamp, l'utiliser
          if (entry.timestamp) {
            const age = now - entry.timestamp;
            return age <= ONE_AND_HALF_MONTHS_MS;
          }
          
          // Sinon, essayer de parser la date au format "DD/MM/YYYY à HH:MM"
          if (entry.date) {
            try {
              const dateMatch = entry.date.match(/(\d{2})\/(\d{2})\/(\d{4})/);
              if (dateMatch) {
                const [, day, month, year] = dateMatch;
                const entryDate = new Date(`${year}-${month}-${day}`);
                const age = now - entryDate.getTime();
                return age <= ONE_AND_HALF_MONTHS_MS;
              }
            } catch (err) {
              console.warn(`⚠️ Impossible de parser la date : ${entry.date}`);
              // En cas d'erreur de parsing, garder l'entrée par sécurité
              return true;
            }
          }
          
          // Si pas de date ni timestamp, garder l'entrée par sécurité
          return true;
        });

        const removed = initialCount - filteredCache.length;
        totalCleaned += removed;
        totalRemaining += filteredCache.length;

        if (removed > 0) {
          fs.writeFileSync(cachePath, JSON.stringify(filteredCache, null, 2), "utf-8");
          console.log(`🧹 ${cacheFile}: ${removed} entrée(s) supprimée(s), ${filteredCache.length} restante(s)`);
        }
      } catch (err) {
        console.error(`❌ Erreur lors du nettoyage du cache ${cacheFile} :`, err.message);
      }
    }

    if (totalCleaned > 0) {
      logChannel.send(`🧹 Nettoyage des caches terminé : ${totalCleaned} entrée(s) de plus de 1.5 mois supprimée(s). ${totalRemaining} entrée(s) conservée(s).`);
    } else {
      console.log(`✅ Aucune entrée à nettoyer dans les caches (toutes ont moins de 1.5 mois).`);
    }

    console.log(`✅ Nettoyage des caches terminé : ${totalCleaned} entrées supprimées, ${totalRemaining} conservées.`);
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage des caches :", error.message);
    if (logChannel) {
      logChannel.send("❌ Erreur lors du nettoyage des anciens caches.");
    }
  }
};
