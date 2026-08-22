// Usage : node scripts/import-database-to-supabase.js chemin/vers/database.json [--confirm]
//
// Import ponctuel : injecte un fichier database.json (par ex. recupere depuis
// le salon #database-logs, backup automatique envoye a chaque arret du bot)
// dans la table Supabase utilisee par le bot. Necessaire une seule fois
// apres la migration, pour ne pas repartir de zero (roses, warnings,
// giveaways, historique d'invitations...).
//
// Sans --confirm : mode dry-run, affiche juste un resume de ce qui serait
// importe et de ce qui existe deja sur Supabase, sans rien ecrire.

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
const confirmed = process.argv.includes('--confirm');

if (!filePath) {
  console.error('Usage: node scripts/import-database-to-supabase.js chemin/vers/database.json [--confirm]');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL / SUPABASE_KEY manquants dans .env — rien à importer vers.');
  process.exit(1);
}

const resolvedPath = path.resolve(filePath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ Fichier introuvable : ${resolvedPath}`);
  process.exit(1);
}

const incoming = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

function summarize(db) {
  return {
    utilisateurs_economy: Object.keys(db.economy || {}).length,
    warnings: Object.keys(db.warnings || {}).length,
    invite_history: (db.invite_history || []).length,
    active_giveaways: Object.keys(db.active_giveaways || {}).length,
  };
}

(async () => {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  const { data: existingRow, error: fetchError } = await supabase
    .from('bot_data')
    .select('data')
    .eq('id', 'main')
    .maybeSingle();

  if (fetchError) {
    console.error('❌ Impossible de lire Supabase (table bot_data créée ? policy en place ?) :', fetchError.message);
    process.exit(1);
  }

  console.log('📄 Fichier local à importer :', summarize(incoming));
  console.log('☁️  Contenu actuel sur Supabase :', summarize(existingRow?.data || {}));

  if (!confirmed) {
    console.log('\nDry-run terminé. Relance avec --confirm pour écraser les données Supabase avec le fichier local.');
    return;
  }

  const { error: writeError } = await supabase
    .from('bot_data')
    .upsert({ id: 'main', data: incoming, updated_at: new Date().toISOString() });

  if (writeError) {
    console.error('❌ Échec de l\'import :', writeError.message);
    process.exit(1);
  }

  console.log('✅ Import terminé. Supabase contient maintenant les données de', resolvedPath);
})();
