#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
#  DÉPLOYER manafamily.org — PAS UN SITE STATIQUE, UN SERVICE VIVANT
# ═══════════════════════════════════════════════════════════════════════════
#
#  🔴 POURQUOI CE SCRIPT DIFFÈRE DES DEUX AUTRES (manatimebank.org,
#  manahome.org). Mesuré le 17/11/2026 : manafamily.org est servi par Caddy
#  via `reverse_proxy 127.0.0.1:3100` — un processus Node vivant
#  (systemd `manafamily.service`), pas un dossier de fichiers statiques. « La
#  même chose » que les deux autres (construire, rsync, comparer des
#  empreintes HTML) n'a pas de sens ici : il n'y a rien à rsyncer, il y a un
#  PROCESSUS à faire avancer.
#
#  ⭐ ET LE DÉPÔT KS-5 (`manafrance-app.git`-like, `/home/debian/depots/
#  manafamily-app.git`) N'EST PAS LA SOURCE DE CE SERVICE. Vérifié : le
#  checkout qui tourne réellement (`/srv/manafamily/repo`) a pour unique
#  remote `origin = github.com/…/manafamily`, et son HEAD est EXACTEMENT
#  celui de GitHub. Ce dépôt bare du KS-5 a une histoire totalement
#  DIVERGENTE (aucun ancêtre commun, dernier commit le 3/11) : c'est un
#  orphelin sans rapport avec ce qui tourne, pas un tronc qu'il faudrait
#  rattraper. GitHub EST la source ici — exactement l'inverse du reste de
#  l'écosystème (ks5 = tronc, github = sauvegarde), et c'est pour ça que ce
#  script pousse GitHub → serveur, jamais l'inverse.
#
# ── CE QUE CE SCRIPT FAIT, DANS L'ORDRE ─────────────────────────────────────
#
#  1. `git fetch` + `merge --ff-only` sur le checkout serveur. `--ff-only`
#     REFUSE plutôt que d'écraser si ce checkout a dérivé (il ne devrait
#     jamais être modifié à la main, mais un garde qui suppose plutôt que de
#     vérifier n'est pas un garde).
#  2. UNE SAUVEGARDE DE LA BASE avant tout redémarrage — en réutilisant
#     `mana-sauvegarde-sqlite.mjs`, déjà posé sur le KS-5 (rapatrié le
#     17/11/2026), PAS un `cp` : la base a un journal WAL ouvert (service
#     vivant), et une copie à chaud peut être incohérente. Ce script ne
#     réinvente pas ce qui existe déjà et qui a déjà été éprouvé.
#  3. Redémarrage du service. Les migrations sont AUTOMATIQUES — `db.js`
#     appelle `applyMigrations()` à la première ouverture de la base, donc
#     dès que le process redémarre. Aucune étape séparée n'est nécessaire ;
#     en ajouter une referait ce que le code fait déjà, avec le risque de le
#     faire deux fois ou de diverger de lui.
#  4. VÉRIFICATION : le service est actif, le checkout serveur a bien avancé
#     au moins jusqu'au commit qui a déclenché ce déploiement, et le domaine
#     public répond. ⚠️ PAS de comparaison d'empreinte HTML comme pour les
#     deux sites statiques — cette page est rendue CÔTÉ SERVEUR à partir de
#     données vivantes (comptes, familles) : elle n'a pas de forme fixe à
#     comparer. Le commit SERVEUR est la preuve qui existe ici.
set -euo pipefail

HOTE="${MANA_HOTE:-debian@147.135.254.25}"
UTILISATEUR_SERVICE="manafamily"
REPO_SERVEUR="/srv/manafamily/repo"
SERVICE="manafamily.service"
DOMAINE="https://manafamily.org"

SSH_OPTS=(-o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15)
[ -n "${MANA_SSH_KEY:-}" ] && SSH_OPTS=(-i "$MANA_SSH_KEY" "${SSH_OPTS[@]}")

dire()  { printf '%s\n' "$*"; }
rouge() { printf '\033[31m%s\033[0m\n' "$*" >&2; }
vert()  { printf '\033[32m%s\033[0m\n' "$*"; }

CIBLE="${1:-$(git rev-parse HEAD)}"
dire "→ commit visé : $CIBLE"

# ── 1. Avancer le checkout serveur, en refusant plutôt qu'en écrasant ──────
dire "→ fetch + merge --ff-only sur $REPO_SERVEUR"
AVANT=$(ssh "${SSH_OPTS[@]}" "$HOTE" "sudo -u $UTILISATEUR_SERVICE git -C $REPO_SERVEUR rev-parse HEAD")
ssh "${SSH_OPTS[@]}" "$HOTE" "
  set -e
  sudo -u $UTILISATEUR_SERVICE git -C $REPO_SERVEUR fetch origin main --quiet
  sudo -u $UTILISATEUR_SERVICE git -C $REPO_SERVEUR merge --ff-only origin/main
"
APRES=$(ssh "${SSH_OPTS[@]}" "$HOTE" "sudo -u $UTILISATEUR_SERVICE git -C $REPO_SERVEUR rev-parse HEAD")
dire "   $AVANT → $APRES"

if [ "$AVANT" = "$APRES" ]; then
  dire "   = déjà à jour, rien à redémarrer"
  exit 0
fi

# ── 2. Sauvegarde AVANT tout redémarrage ────────────────────────────────────
# ⚠️ ROTATION, ET DANS LA MÊME COMMANDE QUE L'ÉCRITURE — pas un script à part
#    qu'on pourrait oublier de poser. Sans elle, une copie de 300 Ko par
#    déploiement s'accumule sans fin ; la nocturne (mana-sauvegarde-base.sh)
#    a déjà sa propre rotation à 7, celle-ci n'en a aucune avant cette ligne.
TS="$(date -u +%Y%m%d-%H%M%S)"
dire "→ sauvegarde de la base avant redémarrage (rotation : 5 gardées)"
ssh "${SSH_OPTS[@]}" "$HOTE" "
  sudo -u $UTILISATEUR_SERVICE node /usr/local/sbin/mana-sauvegarde-sqlite.mjs \
    /srv/manafamily/data/manafamily.db \
    /srv/manafamily/data/avant-deploiement-$TS.db
  sudo -u $UTILISATEUR_SERVICE bash -c '
    ls -1t /srv/manafamily/data/avant-deploiement-*.db 2>/dev/null | tail -n +6 | xargs -r rm -f
  '
"

# ── 3. Redémarrer — les migrations se font SEULES, au premier accès DB ─────
dire "→ redémarrage de $SERVICE"
ssh "${SSH_OPTS[@]}" "$HOTE" "sudo systemctl restart $SERVICE"

# ⚠️ ATTENDRE, PAS SUPPOSER. `Restart=always` relance un crash immédiatement :
#    sans attente, on observerait un état transitoire et on croirait OK un
#    service qui vient de boucler une première fois.
sleep 3
ETAT=$(ssh "${SSH_OPTS[@]}" "$HOTE" "systemctl is-active $SERVICE" || true)
dire "   état : $ETAT"
if [ "$ETAT" != "active" ]; then
  rouge "🔴 $SERVICE N'EST PAS ACTIF après redémarrage ($ETAT)."
  rouge "   journal : ssh $HOTE sudo journalctl -u $SERVICE --since -2min --no-pager"
  rouge "   base avant déploiement conservée : /srv/manafamily/data/avant-deploiement-$TS.db"
  exit 1
fi

# ── 4. La vérification qui compte ───────────────────────────────────────────
dire "→ vérification"

# Le checkout serveur a-t-il BIEN avancé jusqu'au commit visé (ou plus loin,
# si un autre push a couru pendant ce déploiement — ce n'est pas un échec,
# c'est le déploiement SUIVANT qui est déjà en route) ?
if ! ssh "${SSH_OPTS[@]}" "$HOTE" "sudo -u $UTILISATEUR_SERVICE git -C $REPO_SERVEUR merge-base --is-ancestor $CIBLE HEAD"; then
  rouge "🔴 le commit visé ($CIBLE) n'est PAS un ancêtre du HEAD serveur ($APRES)."
  exit 1
fi
vert "   ✓ le serveur a bien avancé jusqu'à (au moins) $CIBLE"

CODE=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$DOMAINE/")
dire "   $DOMAINE/ : $CODE"
[ "$CODE" = "200" ] || { rouge "🔴 le domaine ne rend pas 200."; exit 1; }

TITRE=$(curl -sS --max-time 20 "$DOMAINE/" | grep -o '<title>[^<]*</title>' || true)
[ -n "$TITRE" ] || { rouge "🔴 aucun <title> dans la page servie — rendu cassé ?"; exit 1; }
dire "   $TITRE"

vert "✅ déployé et vérifié — $SERVICE actif, serveur à $APRES, $DOMAINE répond."
