-- 002 : lien optionnel entre une personne de l'arbre et un compte
-- utilisateur membre. Sert à la visibilité : un utilisateur relié à
-- une personne marquée enfant ne voit pas les contenus "adults".

ALTER TABLE person ADD COLUMN linked_user_id TEXT REFERENCES app_user(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_person_linked_user ON person(linked_user_id) WHERE linked_user_id IS NOT NULL;
