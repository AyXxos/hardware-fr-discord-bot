const fs = require("fs");
const path = require("path");
const { MessageEmbed } = require("discord.js");
const tools = require("../tools.js");

const CACHE_FILE = path.join(__dirname, "../data/caches/astuces_c_cache.json");
const CACHE_DURATION = 90 * 24 * 60 * 60 * 1000;
const LOG_CHANNEL_ID = "1478430424098275348";
const ASTUCES_CHANNEL_ID = "1067906475390926958";

function loadCache() {
	if (!fs.existsSync(CACHE_FILE)) {
		return { astuces: [], lastCleanup: Date.now() };
	}

	try {
		const fileContent = fs.readFileSync(CACHE_FILE, "utf-8");
		if (!fileContent.trim()) {
			return { astuces: [], lastCleanup: Date.now() };
		}

		const cache = JSON.parse(fileContent);
		if (Date.now() - cache.lastCleanup > CACHE_DURATION) {
			cache.astuces = cache.astuces.filter((astuce) => Date.now() - astuce.timestamp < CACHE_DURATION);
			cache.lastCleanup = Date.now();
			saveCache(cache);
		}

		return cache;
	} catch (error) {
		console.warn("Cache C corrompu, création d'un nouveau cache.");
		return { astuces: [], lastCleanup: Date.now() };
	}
}

function saveCache(cache) {
	fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
	fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

async function generateCAstuce() {
	const cache = loadCache();
	const apiKey = process.env.MISTRAL_API_KEY;

	if (!apiKey) {
		throw new Error("MISTRAL_API_KEY manquante dans le .env");
	}

	const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "mistral-small",
			messages: [
				{
					role: "system",
					content: "Tu es un expert en langage C.",
				},
				{
					role: "user",
					content: `Donne-moi une astuce C utile, sûre et pratique, puis explique-la simplement.

Réponds STRICTEMENT avec ce format :
Astuce: <une seule ligne de code ou une phrase courte>
Explication: <explication courte et claire en français>

Contraintes importantes :
- Donne UNE SEULE astuce.
- N'ajoute rien d'autre avant/après ces 2 lignes.

Ne me donne PAS ces astuces déjà données :
${cache.astuces.map((a) => `- ${a.content.substring(0, 100)}...`).join("\n")}`,
				},
			],
			temperature: 0.7,
		}),
	});

	if (!response.ok) {
		throw new Error(`Erreur API Mistral: ${response.status}`);
	}

	const data = await response.json();
	const rawContent = data?.choices?.[0]?.message?.content?.trim();
	if (!rawContent) {
		throw new Error("Réponse Mistral invalide: astuce vide.");
	}

	const astuceMatch = rawContent.match(/^Astuce\s*:\s*(.+)$/im);
	const explicationMatch = rawContent.match(/^Explication\s*:\s*(.+)$/im);
	const astuce = astuceMatch ? astuceMatch[1].trim() : rawContent.split("\n").find((line) => line.trim())?.trim();
	const explication = explicationMatch ? explicationMatch[1].trim() : "Aucune explication fournie.";

	if (!astuce) {
		throw new Error("Réponse Mistral invalide: astuce introuvable.");
	}

	cache.astuces.push({
		content: astuce,
		timestamp: Date.now(),
	});
	saveCache(cache);

	return { astuce, explication };
}

module.exports = async (bot) => {
	if (!bot || !bot.channels || !bot.channels.cache) {
		throw new Error("Bot Discord invalide: argument 'bot' manquant.");
	}

	const logChannel = bot.channels.cache.get(LOG_CHANNEL_ID);
	const astucesChannelId = ASTUCES_CHANNEL_ID;
	const astucesChannel = bot.channels.cache.get(astucesChannelId);

	if (!astucesChannel) {
		console.error("❌ Channel astuces introuvable.");
		if (logChannel) {
			logChannel.send("❌ Channel astuces C introuvable (ID invalide). ");
		}
		return;
	}

	try {
		const { astuce, explication } = await generateCAstuce();
		const embed = new MessageEmbed()
			.setColor(tools.randomColor())
			.setTitle("💡 Astuce C")
			.setDescription(astuce)
			.addField("🧠 Explication", explication)
			.setTimestamp();

		await astucesChannel.send({ embeds: [embed] });

		if (logChannel && logChannel.id !== astucesChannel.id) {
			await logChannel.send("✅ Astuce C envoyée.");
		}
	} catch (error) {
		console.error("❌ Erreur lors de la génération/envoi de l'astuce C:", error.message);
		if (logChannel) {
			await logChannel.send(`❌ Erreur astuce C: ${error.message}`);
		}
	}
};
