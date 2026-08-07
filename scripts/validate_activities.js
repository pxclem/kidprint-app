const fs = require('fs');
const path = require('path');

function load() {
  const file = path.resolve(__dirname, '..', 'data', 'activites.json');
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validate(items) {
  const issues = [];
  const ids = new Map();
  const allowedCategories = ['Coloriage','Labyrinthe','Mots Fléchés','Exercice','Créativité'];

  items.forEach((it, idx) => {
    const context = `index:${idx} id:${it.id}`;
    if (it.id === undefined || it.id === null) issues.push(`${context} - id manquant`);
    if (typeof it.id !== 'number' && typeof it.id !== 'string') issues.push(`${context} - id doit être number|string`);
    if (!isNonEmptyString(it.title)) issues.push(`${context} - title manquant ou vide`);
    if (!isNonEmptyString(it.category)) issues.push(`${context} - category manquant ou vide`);
    if (!isNonEmptyString(it.desc)) issues.push(`${context} - desc manquant ou vide`);
    if (!isNonEmptyString(it.age)) issues.push(`${context} - age manquant ou vide`);
    if (!isNonEmptyString(it.icon)) issues.push(`${context} - icon manquant ou vide`);

    // detect duplicate ids
    const key = String(it.id);
    if (ids.has(key)) {
      issues.push(`${context} - id dupliqué (avec index ${ids.get(key)})`);
    } else {
      ids.set(key, idx);
    }

    // category consistency
    if (!allowedCategories.includes(it.category)) {
      issues.push(`${context} - category '${it.category}' non standard`);
    }

    // age format check (simple)
    if (!/^\d+(?:-\d+)?$/.test(it.age) && !/^Tous ?âges$/i.test(it.age) && !/^\d+-\d+$/.test(it.age)) {
      // allow formats like 3-5 or 6-8 etc
      // not strict but warn
      issues.push(`${context} - format age inhabituel: '${it.age}'`);
    }
  });

  return issues;
}

try {
  const items = load();
  const issues = validate(items);
  console.log(`Vérification de ${items.length} activités`);
  if (issues.length === 0) {
    console.log('Aucun problème détecté.');
    process.exit(0);
  }
  console.log('Problèmes détectés:');
  issues.forEach((s) => console.log(' -', s));
  process.exit(2);
} catch (err) {
  console.error('Erreur lors de la validation :', err.message);
  process.exit(1);
}
