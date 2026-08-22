// Stockage du changelog (salon Updates & Fix), volontairement ISOLE de
// utils/db.js : ligne Supabase separee (id='changelog' au lieu de 'main').
//
// Pourquoi : le bot (bot.js) garde en memoire un cache complet de la ligne
// 'main' et reecrit CET OBJET ENTIER a chaque writeDatabase(). Si ce script
// (execute a part, hors du process du bot) partageait la meme ligne, la
// prochaine sauvegarde faite par le bot en cours d'execution (ex: un membre
// qui gagne des roses en discutant) ecraserait silencieusement les entrees
// de changelog qu'on vient d'ajouter, avec le cache perime du bot. Une ligne
// dediee que seul ce script touche elimine totalement ce risque.
const fs = require('fs');
const path = require('path');

const LOCAL_PATH = path.join(__dirname, '..', 'changelog_store.json');
const TABLE = 'bot_data';
const ROW_ID = 'changelog';

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
}

function readLocalFile() {
  if (!fs.existsSync(LOCAL_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(LOCAL_PATH, 'utf8'));
  } catch {
    return {};
  }
}

async function readChangelogData() {
  if (!supabase) return readLocalFile();
  const { data, error } = await supabase.from(TABLE).select('data').eq('id', ROW_ID).maybeSingle();
  if (error) {
    console.error('⚠️  Impossible de charger le changelog depuis Supabase:', error.message);
    return {};
  }
  return data?.data ?? {};
}

async function writeChangelogData(data) {
  if (!supabase) {
    fs.writeFileSync(LOCAL_PATH, JSON.stringify(data, null, 2));
    return;
  }
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: ROW_ID, data, updated_at: new Date().toISOString() });
  if (error) throw new Error('Erreur de sauvegarde Supabase (changelog): ' + error.message);
}

module.exports = { readChangelogData, writeChangelogData };
