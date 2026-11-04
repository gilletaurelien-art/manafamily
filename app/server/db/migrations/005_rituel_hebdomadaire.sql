-- 005 : le rituel hebdomadaire — MANA pose une question, la réponse
-- alimente un souvenir, et si la question porte sur une chanson, une
-- entrée MANAvibe. Zéro nouvelle colonne ailleurs : la réponse est un
-- `memory` (et, pour les chansons, un `song`) comme n'importe quel autre.
--
-- ⭐ Pourquoi pas de tâche planifiée : la livraison se calcule À LA LECTURE
-- (ensureCurrentPrompt), pas par un cron. Le dépôt documente déjà qu'aucun
-- ordonnanceur n'existe ici et qu'aucun besoin réel ne le justifiait — en
-- ajouter un pour « une fois par semaine » aurait été la première
-- dépendance opérationnelle du projet pour un gain nul : la première
-- requête de la semaine suffit à déclencher la livraison.

CREATE TABLE IF NOT EXISTS prompt (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'chanson')),
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS prompt_delivery (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES family(id) ON DELETE CASCADE,
  prompt_id TEXT NOT NULL REFERENCES prompt(id),
  delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
  answered_at TEXT,
  memory_id TEXT REFERENCES memory(id) ON DELETE SET NULL,
  song_id TEXT REFERENCES song(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_prompt_delivery_family ON prompt_delivery(family_id, delivered_at DESC);

-- Le jeu de questions de départ. Table de référence, pas des données
-- personnelles : versionnée comme le reste du schéma, pas dans data/.
INSERT OR IGNORE INTO prompt (id, text, category) VALUES
  ('prm_chanson_mariage', 'Quelle chanson jouait le jour de votre mariage, ou de votre rencontre ?', 'chanson'),
  ('prm_chanson_enfance', 'Quelle chanson vous ramène directement à votre enfance ?', 'chanson'),
  ('prm_chanson_voiture', 'La chanson qu''on chantait en voiture, en famille — laquelle ?', 'chanson'),
  ('prm_chanson_perdu', 'Quelle chanson vous fait penser à quelqu''un qui n''est plus là ?', 'chanson'),
  ('prm_chanson_fete', 'La chanson qui ouvrait toujours le bal, dans votre famille ?', 'chanson'),
  ('prm_chanson_bercer', 'Quelle chanson vous berçait, ou que vous chantiez pour endormir un enfant ?', 'chanson'),
  ('prm_general_lieu', 'Quel endroit de votre enfance aimeriez-vous que vos petits-enfants connaissent ?', 'general'),
  ('prm_general_metier', 'Comment avez-vous choisi votre métier, ou ce que vous avez fait de votre vie ?', 'general'),
  ('prm_general_recette', 'Quelle recette de famille personne n''a encore écrite quelque part ?', 'general'),
  ('prm_general_conseil', 'Quel conseil vous a le plus marqué, et qui vous l''a donné ?', 'general'),
  ('prm_general_rire', 'Quel est le souvenir qui vous fait le plus rire, encore aujourd''hui ?', 'general'),
  ('prm_general_peur', 'De quoi aviez-vous peur, enfant, et qu''est-ce qui vous a rassuré ?', 'general'),
  ('prm_general_fierte', 'De quoi êtes-vous le plus fier dans votre famille ?', 'general'),
  ('prm_general_voyage', 'Quel voyage ou déplacement a changé quelque chose pour vous ?', 'general'),
  ('prm_general_tradition', 'Quelle tradition familiale voudriez-vous voir continuer ?', 'general');
