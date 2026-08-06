const fs = require('fs');
const path = require('path');

function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function loadActivities() {
  const filePath = path.resolve(__dirname, '..', '..', 'data', 'activites.json');

  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (error) {
    // fallback silencieux
  }

  return [
    {
      id: 1,
      title: 'Labyrinthe Spatial',
      category: 'Labyrinthe',
      age: '6-8',
      icon: '🚀',
      desc: 'Aide l’astronaute à retrouver sa fusée.'
    },
    {
      id: 2,
      title: 'Mots Fléchés Animaux',
      category: 'Mots Fléchés',
      age: '6-8',
      icon: '🦁',
      desc: 'Grille simple pour découvrir les animaux.'
    }
  ];
}

function inferAge(query) {
  const normalized = normalize(query);
  if (normalized.includes('3') || normalized.includes('3-5') || normalized.includes('3 ans')) return '3-5';
  if (normalized.includes('9') || normalized.includes('10') || normalized.includes('11') || normalized.includes('12') || normalized.includes('9-12')) return '9-12';
  return '6-8';
}

function inferCategory(query) {
  const normalized = normalize(query);
  if (normalized.includes('coloriage') || normalized.includes('dessin') || normalized.includes('peinture')) return 'Coloriage';
  if (normalized.includes('labyrinthe')) return 'Labyrinthe';
  if (normalized.includes('mot') || normalized.includes('lettre') || normalized.includes('fleche')) return 'Mots Fléchés';
  if (normalized.includes('crea') || normalized.includes('craft') || normalized.includes('origami')) return 'Créativité';
  return 'Exercice';
}

function inferIcon(query) {
  const normalized = normalize(query);
  if (normalized.includes('coloriage') || normalized.includes('dessin')) return '🎨';
  if (normalized.includes('labyrinthe')) return '🧭';
  if (normalized.includes('mot') || normalized.includes('lettre')) return '🔤';
  if (normalized.includes('math') || normalized.includes('calcul')) return '🔢';
  if (normalized.includes('anim') || normalized.includes('nature')) return '🌿';
  return '🧩';
}

function inferDifficulty(query) {
  const normalized = normalize(query);
  if (normalized.includes('3') || normalized.includes('3 ans') || normalized.includes('petit') || normalized.includes('facile')) return 'Facile';
  if (normalized.includes('9') || normalized.includes('10') || normalized.includes('11') || normalized.includes('12') || normalized.includes('avancé') || normalized.includes('difficile')) return 'Avancé';
  return 'Moyen';
}

function inferObjective(query) {
  const normalized = normalize(query);
  if (normalized.includes('coloriage') || normalized.includes('dessin')) return 'Développer la motricité fine et la concentration';
  if (normalized.includes('labyrinthe')) return 'Travailler l’attention et la logique spatiale';
  if (normalized.includes('mot') || normalized.includes('lettre')) return 'Renforcer la reconnaissance des lettres et du vocabulaire';
  if (normalized.includes('math') || normalized.includes('calcul')) return 'Stimuler le calcul mental et la logique';
  return 'Favoriser l’apprentissage ludique et la curiosité';
}

function inferImage(query) {
  const normalized = normalize(query);
  if (normalized.includes('coloriage') || normalized.includes('dessin')) return 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=800&q=80';
  if (normalized.includes('labyrinthe')) return 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80';
  if (normalized.includes('mot') || normalized.includes('lettre')) return 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80';
  if (normalized.includes('math') || normalized.includes('calcul')) return 'https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?auto=format&fit=crop&w=800&q=80';
  return 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80';
}

function enrichActivity(item, query) {
  return {
    ...item,
    difficulty: item.difficulty || inferDifficulty(query),
    objective: item.objective || inferObjective(query),
    imageUrl: item.imageUrl || inferImage(query)
  };
}

function buildGeneratedColoringActivity(query) {
  const safeQuery = query.trim().replace(/\s+/g, ' ');
  const summary = safeQuery.length > 50 ? `${safeQuery.slice(0, 50).trim()}...` : safeQuery;
  const title = `Coloriage : ${summary}`;
  return {
    id: Date.now(),
    title,
    category: 'Coloriage',
    age: inferAge(query),
    icon: '🎨',
    desc: `Coloriage IA créé à partir de votre demande : ${safeQuery}`,
    difficulty: inferDifficulty(query),
    objective: inferObjective(query),
    imageUrl: ''
  };
}

function buildSuggestedActivity(query) {
  return {
    id: Date.now(),
    title: `Activité ${query.trim().slice(0, 30)}`,
    category: inferCategory(query),
    age: inferAge(query),
    icon: inferIcon(query),
    desc: `Activité créée automatiquement pour ${query.trim()}`,
    difficulty: inferDifficulty(query),
    objective: inferObjective(query),
    imageUrl: inferImage(query)
  };
}

function rankActivities(query, items) {
  const normalizedQuery = normalize(query);
  const keywords = normalizedQuery.split(/\s+/).filter(Boolean);

  return items
    .map((item) => {
      const haystack = normalize(`${item.title} ${item.category} ${item.desc} ${item.age}`);
      let score = 0;

      if (haystack.includes(normalizedQuery)) score += 10;

      if (normalizedQuery.includes('coloriage') || normalizedQuery.includes('dessin')) {
        if (haystack.includes('coloriage') || haystack.includes('dessin')) score += 6;
      }
      if (normalizedQuery.includes('labyrinthe')) {
        if (haystack.includes('labyrinthe')) score += 6;
      }
      if (normalizedQuery.includes('mots') || normalizedQuery.includes('lettre') || normalizedQuery.includes('fleche')) {
        if (haystack.includes('mots') || haystack.includes('lettre') || haystack.includes('fleche')) score += 6;
      }
      if (normalizedQuery.includes('math') || normalizedQuery.includes('calcul') || normalizedQuery.includes('nombre')) {
        if (haystack.includes('math') || haystack.includes('calcul') || haystack.includes('nombre')) score += 6;
      }
      if (normalizedQuery.includes('nature') || normalizedQuery.includes('animal') || normalizedQuery.includes('animaux')) {
        if (haystack.includes('nature') || haystack.includes('animal') || haystack.includes('animaux')) score += 6;
      }
      if (normalizedQuery.includes('crea') || normalizedQuery.includes('craft')) {
        if (haystack.includes('crea') || haystack.includes('craft')) score += 6;
      }

      keywords.forEach((keyword) => {
        if (haystack.includes(keyword)) score += 2;
      });

      return { ...item, score, difficulty: item.difficulty || inferDifficulty(query), objective: item.objective || inferObjective(query), imageUrl: item.imageUrl || inferImage(query) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function buildWebActivities(query) {
  const normalized = normalize(query);
  const age = inferAge(query);
  const difficulty = inferDifficulty(query);
  const objective = inferObjective(query);
  const imageUrl = inferImage(query);
  const activities = [];

  if (normalized.includes('coloriage') || normalized.includes('dessin')) {
    activities.push({
      id: Date.now() + 1,
      title: 'Coloriage Licorne à imprimer',
      category: 'Coloriage',
      age,
      icon: '🦄',
      desc: 'Fiche de coloriage simple et amusante pour les enfants.',
      difficulty,
      objective,
      imageUrl
    });
    activities.push({
      id: Date.now() + 2,
      title: 'Coloriage Dinosaure PDF',
      category: 'Coloriage',
      age,
      icon: '🦕',
      desc: 'Une grande page de coloriage de dinosaure à imprimer.',
      difficulty,
      objective,
      imageUrl
    });
  }

  if (normalized.includes('labyrinthe')) {
    activities.push({
      id: Date.now() + 3,
      title: 'Labyrinthe de la Forêt',
      category: 'Labyrinthe',
      age,
      icon: '🌳',
      desc: 'Un labyrinthe imprimable pour développer la logique.',
      difficulty,
      objective,
      imageUrl
    });
    activities.push({
      id: Date.now() + 4,
      title: 'Labyrinthe Aventure',
      category: 'Labyrinthe',
      age,
      icon: '🧭',
      desc: 'Parcours de labyrinthe imprimable pour explorer.',
      difficulty,
      objective,
      imageUrl
    });
  }

  if (normalized.includes('mots') || normalized.includes('lettre')) {
    activities.push({
      id: Date.now() + 5,
      title: 'Mots Mêlés à imprimer',
      category: 'Mots Fléchés',
      age,
      icon: '🔤',
      desc: 'Un jeu de mots mêlés simple pour les enfants.',
      difficulty,
      objective,
      imageUrl
    });
    activities.push({
      id: Date.now() + 6,
      title: 'Cherche les Lettres PDF',
      category: 'Mots Fléchés',
      age,
      icon: '📝',
      desc: 'Activité imprimable pour reconnaître les lettres.',
      difficulty,
      objective,
      imageUrl
    });
  }

  if (activities.length === 0) {
    activities.push({
      id: Date.now() + 7,
      title: `Activité imprimable ${query.trim().slice(0, 30)}`,
      category: inferCategory(query),
      age,
      icon: inferIcon(query),
      desc: `Activité générée pour votre recherche : ${query}`,
      difficulty,
      objective,
      imageUrl
    });
  }

  return activities;
}

function buildWebSearchResults(query) {
  const normalizedQuery = normalize(query);
  const webResults = [];

  const knownSites = [
    {
      title: 'Tête à modeler – Activités et coloriages',
      url: 'https://www.teteamodeler.com',
      snippet: 'Des centaines de fiches d’activités, de coloriages et de bricolages à imprimer pour les enfants.'
    },
    {
      title: 'Coloriages.biz – Colorier en ligne et PDF',
      url: 'https://www.coloriages.biz',
      snippet: 'Grand choix de coloriages à imprimer, adaptés à tous les thèmes et âges.'
    },
    {
      title: 'Hugo l’escargot – Jeux et activités',
      url: 'https://www.hugolescargot.com',
      snippet: 'Jeux gratuits, coloriages, activités et ressources pour les écoles et la maison.'
    },
    {
      title: 'Mômes.net – DIY et activités enfants',
      url: 'https://www.momes.net',
      snippet: 'Idées d’activités manuelles, recettes et jeux à imprimer pour enfants et familles.'
    },
    {
      title: 'Petites têtes – Activités pédagogiques',
      url: 'https://www.petitestetes.com',
      snippet: 'Fiches pédagogiques, coloriages et exercices à télécharger pour les 3-8 ans.'
    }
  ];

  if (normalizedQuery.includes('coloriage') || normalizedQuery.includes('dessin')) {
    webResults.push({
      title: 'Coloriages à imprimer pour enfants',
      url: 'https://www.coloriages.biz',
      snippet: 'Feuilles de coloriage à imprimer pour des heures de création.',
      type: 'pdf'
    });
    webResults.push({
      title: 'Tête à modeler - Coloriages et activités',
      url: 'https://www.teteamodeler.com/coloriages/index.htm',
      snippet: 'Coloriages, bricolages et activités manuelles adaptés aux enfants.',
      type: 'pdf'
    });
  }

  if (normalizedQuery.includes('labyrinthe')) {
    webResults.push({
      title: 'Labyrinthes imprimables',
      url: 'https://www.hugolescargot.com/jeux/jeux-educatifs/episodes/laby',
      snippet: 'Des labyrinthes prêts à imprimer pour travailler la logique et la concentration.',
      type: 'pdf'
    });
    webResults.push({
      title: 'Tête à modeler - Labyrinthes',
      url: 'https://www.teteamodeler.com/jeux/laby/laby.htm',
      snippet: 'Labyrinthes faciles et amusants à télécharger pour les enfants.',
      type: 'pdf'
    });
  }

  if (normalizedQuery.includes('mots') || normalizedQuery.includes('lettre') || normalizedQuery.includes('vocabulaire')) {
    webResults.push({
      title: 'Jeux de lettres pour enfants',
      url: 'https://www.petitestetes.com/activite/activites-maternelle-lecture-graphisme.php',
      snippet: 'Fiches d’activités pour jouer avec les mots, les lettres et l’écriture.',
      type: 'pdf'
    });
    webResults.push({
      title: 'Mômes.net - Jeux de lecture',
      url: 'https://www.momes.net/jeux/jeux-lecture',
      snippet: 'Activités ludiques pour apprendre les lettres et le vocabulaire.',
      type: 'pdf'
    });
  }

  if (normalizedQuery.includes('math') || normalizedQuery.includes('calcul') || normalizedQuery.includes('nombre')) {
    webResults.push({
      title: 'Jeux de maths à imprimer',
      url: 'https://www.teteamodeler.com/jeux/maths/maths.htm',
      snippet: 'Fiches d’additions, soustractions et jeux mathématiques à imprimer.',
      type: 'pdf'
    });
    webResults.push({
      title: 'Hugo l’escargot - Maths',
      url: 'https://www.hugolescargot.com/jeux/maths/',
      snippet: 'Exercices et jeux de logique mathématique pour enfants.',
      type: 'pdf'
    });
  }

  if (normalizedQuery.includes('crea') || normalizedQuery.includes('bricolage') || normalizedQuery.includes('DIY')) {
    webResults.push({
      title: 'Activités manuelles à imprimer',
      url: 'https://www.teteamodeler.com/activite/activites-manuelles',
      snippet: 'Bricolages, activités créatives et idées à imprimer pour les enfants.',
      type: 'pdf'
    });
    webResults.push({
      title: 'Mômes.net - DIY enfants',
      url: 'https://www.momes.net/diy',
      snippet: 'Tutoriels de bricolage et activités créatives à réaliser et imprimer.',
      type: 'pdf'
    });
  }

  if (webResults.length === 0) {
    knownSites.forEach((site) => webResults.push({ ...site, type: 'site' }));
    webResults.unshift({
      title: 'Activités imprimables pour enfants',
      url: 'https://www.google.com/search?q=activites+imprimables+enfant+pdf',
      snippet: 'Résultats de recherche web pour trouver des contenus pédagogiques à imprimer.',
      type: 'pdf'
    });
  }

  return webResults.slice(0, 6);
}

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const query = (data.query || '').trim();
    const action = data.action || 'search';
    const activities = loadActivities();

    if (action === 'import_url' || query.includes('http://') || query.includes('https://')) {
      const createdActivity = buildSuggestedActivity(query || 'activité importée');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Activité préparée à partir de votre demande ou de l’URL fournie.',
          createdActivity
        })
      };
    }

    if (action === 'generate_coloring') {
      const createdActivity = buildGeneratedColoringActivity(query);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Coloriage IA généré selon votre demande.',
          createdActivity,
          webActivities: [],
          recommendedActivities: [],
          webResults: []
        })
      };
    }

    const recommendedActivities = rankActivities(query, activities);
    const webActivities = buildWebActivities(query);
    const webResults = buildWebSearchResults(query);
    let createdActivity = null;

    if (recommendedActivities.length === 0 && query) {
      createdActivity = buildSuggestedActivity(query);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Voici les activités sélectionnées selon votre demande.',
        recommendedActivities,
        webActivities,
        createdActivity,
        webResults
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};