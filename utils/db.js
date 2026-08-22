// Stockage centralise du bot : Supabase (Postgres) si SUPABASE_URL/SUPABASE_KEY
// sont definis, sinon repli sur database.json en local (utile en dev).
// Toutes les commandes/modules doivent passer par ce module au lieu de lire/
// ecrire database.json directement, pour que les donnees survivent aux
// redemarrages/redeploiements (le disque Render n'est pas persistant).

const fs = require('fs');
const path = require('path');

const LOCAL_PATH = path.join(__dirname, '..', 'database.json');
const TABLE = 'bot_data';
const ROW_ID = 'main';

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

let cache = null;

function readLocalFile() {
  if (!fs.existsSync(LOCAL_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * A appeler une fois au demarrage du bot, avant client.login().
 * Charge les donnees depuis Supabase (ou le fichier local si Supabase n'est
 * pas configure) dans le cache memoire.
 */
async function initDatabase() {
  if (!supabase) {
    console.log('ℹ️  SUPABASE_URL/SUPABASE_KEY absents : stockage local (database.json).');
    cache = readLocalFile();
    return cache;
  }

  const { data, error } = await supabase.from(TABLE).select('data').eq('id', ROW_ID).maybeSingle();
  if (error) {
    console.error('⚠️  Impossible de charger la base Supabase au démarrage:', error.message);
    cache = {};
    return cache;
  }

  cache = data?.data ?? {};
  console.log('✅ Base de données chargée depuis Supabase.');
  return cache;
}

/**
 * Retourne l'objet base de donnees courant (meme reference partagee par tout
 * le bot). A muter directement puis passer a writeDatabase().
 */
function readDatabase() {
  if (cache === null) cache = readLocalFile();
  return cache;
}

/**
 * Persiste la base. Met a jour le cache immediatement (synchrone) et lance
 * la sauvegarde Supabase en arriere-plan (ou ecrit le fichier local si
 * Supabase n'est pas configure).
 */
function writeDatabase(db) {
  cache = db;

  if (!supabase) {
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(db, null, 2));
    return Promise.resolve();
  }

  return supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, data: db, updated_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.error('⚠️  Erreur de sauvegarde Supabase:', error.message);
    });
}

module.exports = { initDatabase, readDatabase, writeDatabase };
