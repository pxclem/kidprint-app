# 🎨 KidPrint IA

Application web statique pour rechercher, filtrer et imprimer des activités ludiques pour enfants.

## Démarrage local

1. Ouvre un terminal dans le dossier du projet.
2. Installe les dépendances si nécessaire : `npm install`.
3. Lance le serveur local : `npm start` ou `npm run dev`.
4. Ouvre `http://localhost:8888` dans ton navigateur.

## Fonctionnalités

- Recherche d’activités par IA et suggestions intelligentes.
- Filtres par âge, catégorie et favoris.
- Profils enfants avec historique, favoris et sélection d’activités.
- Impression des activités sélectionnées sous forme de fiche prête à imprimer.
- Page d’onboarding intégrée pour guider les premiers usages.
- Prise en charge des activités personnalisées et du catalogue local `data/activites.json`.

## Déploiement

- Le projet peut être déployé sur Netlify.
- La fonction serveur est définie dans `netlify/functions/assistant.js`.
- La configuration de déploiement se trouve dans `netlify.toml`.

## Tests

- `npm test` exécute les tests existants si le dossier `tests/` est présent.

## Notes

- Les données de profil, favoris et historique sont stockées dans `localStorage`.
- Le site est conçu comme une Progressive Web App statique avec une logique front-end en JavaScript.

## Architecture

- `index.html` contient la structure principale et les sections de l’interface.
- `assets/css/style.css` gère le style, le responsive et le rendu des cartes.
- `assets/js/app.js` contient toute la logique d’interface, de recherche IA, de pagination, de profils, de sélection et d’impression.
- `data/activites.json` stocke le catalogue local des activités.
- `netlify/functions/assistant.js` implémente le backend Netlify pour la recherche assistée par IA.

## Contribuer

- Propose une nouvelle activité dans `data/activites.json` ou améliore la recherche IA dans `netlify/functions/assistant.js`.
- Vérifie les modifications avec `npm start` puis ouvre `http://localhost:8888`.
- Si tu ajoutes une nouvelle fonctionnalité, documente-la dans ce README.

## Support et dons

- Pour toute question ou problème, contacte le support à `support.pxclem.activites@gmail.com`.
- Les dons sont les bienvenus pour aider à améliorer le projet et financer de nouvelles activités.
- Mentionne dans ton message si tu souhaites faire un don, et nous te répondrons avec les options disponibles.
- Nous ne partageons pas tes informations personnelles : ton message reste privé.
- Merci de soutenir KidPrint et d’aider à rendre les activités encore plus accessibles pour les enfants.
