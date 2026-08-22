-- A executer une seule fois dans Supabase : Dashboard > SQL Editor > New query.
-- Cree la table qui remplace database.json (stockage persistant, survit aux
-- redeploiements/redemarrages sur Render).

create table if not exists bot_data (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS active par defaut sur les nouveaux projets Supabase : sans policy, la
-- cle publishable (anon) n'a acces a rien. On autorise explicitement le bot
-- (via sa cle publishable) a lire/ecrire cette table.
alter table bot_data enable row level security;

create policy "bot_data_anon_all"
on bot_data
for all
to anon
using (true)
with check (true);
