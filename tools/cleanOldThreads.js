/**
 * Supprime les threads créés par les watchers s'ils datent de plus de 10 jours
 * @param {Discord.Client} bot - L'instance du bot Discord
 */
module.exports = async (bot) => {
  const logBotChannelId = '1422875116919849080';
  const logChannel = bot.channels.cache.get(logBotChannelId);
  
  // IDs des forums où les watchers créent des threads
  const forumIds = [
    "1422989732018655454", // Forum Cert Alerts
    "1423593016102486057", // Forum THN
    // Ajoute ici les autres IDs de forums si nécessaire
  ];

  const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000; // 10 jours en millisecondes
  const now = Date.now();
  let totalDeleted = 0;

  try {
    for (const forumId of forumIds) {
      const forum = await bot.channels.fetch(forumId).catch(() => null);
      
      if (!forum) {
        console.warn(`⚠️ Forum ${forumId} introuvable.`);
        continue;
      }

      // Récupère tous les threads actifs
      const activeThreads = await forum.threads.fetchActive();
      // Récupère tous les threads archivés
      const archivedThreads = await forum.threads.fetchArchived();

      // Combine tous les threads
      const allThreads = new Map([...activeThreads.threads, ...archivedThreads.threads]);

      for (const [threadId, thread] of allThreads) {
        const threadAge = now - thread.createdTimestamp;
        
        // Si le thread a plus de 10 jours
        if (threadAge > TEN_DAYS_MS) {
          try {
            await thread.delete();
            totalDeleted++;
            console.log(`🗑️ Thread supprimé : ${thread.name} (créé le ${new Date(thread.createdTimestamp).toLocaleDateString('fr-FR')})`);
          } catch (err) {
            console.error(`❌ Erreur lors de la suppression du thread ${thread.name} :`, err.message);
          }
        }
      }
    }

    if (totalDeleted > 0) {
      logChannel.send(`🧹 Nettoyage terminé : ${totalDeleted} thread(s) de plus de 10 jours supprimé(s).`);
    } else {
      logChannel.send(`✅ Aucun thread à supprimer (tous ont moins de 10 jours).`);
    }

    console.log(`✅ Nettoyage des threads terminé : ${totalDeleted} supprimés.`);
  } catch (error) {
    console.error("❌ Erreur lors du nettoyage des threads :", error.message);
    if (logChannel) {
      logChannel.send("❌ Erreur lors du nettoyage des anciens threads.");
    }
  }
};
