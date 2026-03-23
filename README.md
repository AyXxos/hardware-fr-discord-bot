# Bot Veille Techno

Bot Discord de veille cybersécurité/tech qui agrège des contenus depuis plusieurs sources (watchers), publie des alertes, et exécute des tâches de maintenance (nettoyage de threads/cache).

## Fonctionnalités

- Chargement automatique des commandes dans `Commandes/`
- Chargement automatique des événements Discord dans `Events/`
- Enregistrement des slash commands au démarrage
- Exécution de watchers (THN, CERT, Data Leaks, Electronics Weekly, etc.)
- Nettoyage périodique des anciens threads et des entrées de cache
- Gestion de l'arrivée d'un membre (rôle + message de bienvenue)

## Prérequis

- Node.js 16+ (recommandé: 18 LTS)
- npm
- Un bot Discord créé dans le portail développeur Discord

## Installation

```bash
npm install
```

## Configuration

Créer un fichier `.env` à la racine du projet:

```env
DISCORD_TOKEN=VOTRE_TOKEN_DISCORD
```

Le token est lu dans `config.js` via `dotenv`.

## Lancer le bot

```bash
node main.js
```

## Structure du projet

```text
Bot Veille Techno/
├── main.js                 # Point d'entrée du bot
├── config.js               # Lecture des variables d'environnement
├── Commandes/              # Commandes slash
├── Events/                 # Événements Discord
├── Loaders/                # Chargement commandes/events/slash commands
├── Watchers/               # Collecteurs de sources externes
├── tools/                  # Outils de maintenance
└── data/caches/            # Données de cache persistées
```

## Notes importantes

- Les IDs Discord (serveurs/salons/rôles) sont actuellement définis en dur dans `main.js` et certaines commandes.
- Si le token a déjà été exposé, régénère-le immédiatement dans le portail Discord Developer.
- `.env` est ignoré via `.gitignore` pour éviter toute fuite de secret.

## Dépannage rapide

- Si le bot ne se connecte pas: vérifier `DISCORD_TOKEN` dans `.env`.
- Si une commande ne répond pas: vérifier que le bot a les permissions nécessaires sur le serveur.
- Si aucune slash command n'apparaît: redémarrer le bot pour relancer l'enregistrement.
