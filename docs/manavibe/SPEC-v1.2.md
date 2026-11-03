# MANAvibe — Spécification technique de référence v1.2

*Autoporteur. Fait foi pour l'implémentation phase 1. Règle 0 prioritaire sur tout le reste.*

**Principe fondateur** : *La mémoire appartient à la chanson (`SongReference`). Le choix d'écoute appartient à l'enregistrement (`RecordingReference`).*

**Positionnement** : MANAvibe est le studio de mémoire musicale familiale de MANAfamily. Ni une radio, ni un agrégateur de streaming, ni un mini-Spotify. MANAvibe produit et conserve des émissions familiales : narration MANA (TTS), messages vocaux, souvenirs racontés, références musicales. La lecture des morceaux commerciaux est déléguée aux services personnels des membres ou à des lecteurs tiers autorisés.

## 0. Règle de conception 0

**Aucun connecteur musical n'est développé avant qu'une émission familiale complète soit jouable, archivable et exportable sans eux.** Premier livrable : une émission complète — voix, narrations TTS, souvenirs, transitions — zéro musique commerciale.

**Principe d'intégration** : MANAvibe enrichit MANAfamily, il ne l'absorbe pas. Les espaces existants (Souvenirs, Famille, Agenda, Créer) restent premiers ; l'émission est un nouveau format de mémoire, pas un centre de gravité qui réorganise le produit.

## 1. Modèle de données — deux niveaux de référence

```ts
// ---------- Niveau 1 : la chanson (identité familiale) ----------
type SongId = string;             // UUID MANA, obligatoire, immuable

interface SongReference {
  id: SongId;
  title: string;                 // « Fly Me to the Moon »
  primaryArtist?: string;        // artiste de référence (informatif)
  recordings: RecordingId[];     // 0..N enregistrements
  contributedBy: MemberId[];     // qui l'a fait entrer dans la famille
  story?: MemoryId;              // LE souvenir : pourquoi cette chanson compte
  anecdotes?: MemoryId[];        // histoires et dédicaces familiales
}

// ---------- Niveau 2 : l'enregistrement (identité musicale) ----------
type RecordingId = string;       // UUID MANA, obligatoire, immuable

interface RecordingReference {
  id: RecordingId;
  songId: SongId;                // parent obligatoire
  artist: string;               // Sinatra — ou le petit-fils et sa reprise
  album?: string;
  year?: number;
  isrc?: string;                // facultatif, clé de rapprochement
  identifiers: {                // persistants, jamais des URLs
    spotifyId?: string;
    deezerId?: string;
    appleMusicId?: string;
    youtubeId?: string;
  };
  resolvedLinks?: Partial<Record<MusicProvider, string>>;  // mortels, re-résolus à l'affichage
}
```

Règles :
- Une `SongReference` vit avec `recordings` **vide** — la mémoire survit à tout.
- Supprimer un `RecordingReference` n'efface jamais la chanson ni son souvenir.
- Les `identifiers` (persistants) et les `resolvedLinks` (temporaires) ne sont jamais confondus.

## 2. Types de support

```ts
interface VoiceAsset {
  id: string;
  kind: "family_voice" | "mana_narration";
  by: MemberId | "mana";
  durationMs: number;
  storagePath: string;            // actif possédé, sur l'infra MANA
  transcript?: string;
}

interface Transition { kind: "silence" | "fade"; durationMs: number }

interface MemoryInput {
  type: "story" | "anecdote" | "dedication";
  text?: string;
  voiceAssetId?: string;
  attachedBy: MemberId;
}

interface FallbackSegment {
  kind: "sober_notice" | "replay_real_content";
  sourceMemoryId?: MemoryId;      // requis si kind = "replay_real_content"
}

interface Archive {
  programId: string;
  manifest: { title: string; createdAt: string; segments: Segment[] };
  assets: VoiceAsset[];
  memories: Memory[];
  songs: SongSummary[];           // title/artist uniquement — aucune dépendance de lecture
}
```

## 3. Le conducteur

```ts
type Segment =
  | { type: "mana_voice";   text: string }
  | { type: "family_voice"; assetId: string; by: MemberId }
  | { type: "song_ref";    songId: SongId; chosenRecordingId?: RecordingId; by: MemberId }
  | { type: "transition";   transition: Transition }
  | { type: "announcement"; text: string; by?: MemberId };

interface Conductor {
  advance(): Promise<Segment>;
  onSegmentComplete(cb: (s: Segment) => void): void;
  onRecordingUnavailable(songId: SongId, reason: UnavailableReason): FallbackSegment;
  exportArchive(programId: string): Promise<Archive>;
}
```

**Repli honnête** : MANA ne fabrique jamais de contenu. `replay_real_content` exige un `MemoryId` existant ; sinon `sober_notice` et l'émission continue.

## 4. Modules (frontières strictes)

```ts
interface Studio {
  recordVoice(memberId: MemberId): Promise<VoiceAsset>;
  synthesizeManaVoice(text: string, voice: ManaVoiceConfig): Promise<VoiceAsset>;
  attachStory(songId: SongId, memory: MemoryInput): Promise<MemoryId>;
}

interface MusicGateway {
  createSong(input: { title: string; artist?: string }): Promise<SongReference>;
  addRecording(songId: SongId, input: { artist: string; isrc?: string }): Promise<RecordingReference>;
  resolveLinks(recordingId: RecordingId): Promise<Partial<Record<MusicProvider, string>>>;
}

interface ManaPlayer {
  play(asset: VoiceAsset | Transition): Promise<PlaybackHandle>;
  // Contenus MANAfamily UNIQUEMENT. Test T6 : la compilation doit échouer
  // si on tente d'y jouer un SongReference/RecordingReference.
}

interface ExternalPlaybackHost {
  readonly embeds: {
    youtubeEmbed?:  { enabled: boolean };  // off par défaut
    deezerPreview?: { enabled: boolean };  // off par défaut, autorisation écrite Deezer requise
  };
  openEmbed(provider: MusicProvider, recordingId: RecordingId): Promise<EmbedHandle | null>;
}

interface DeepLinkService {
  getDeepLink(recordingId: RecordingId, memberPreference: MusicProvider): string | null;
}
```

## 5. Cascade de lecture

```
1. Fiche souvenir (chanson + mémoire) — toujours affichée
2. « Écouter chez mon fournisseur » → DeepLinkService (préférence du membre)
3. Embed intégré → ExternalPlaybackHost, si et seulement si connecteur activé
4. Sinon → FallbackSegment honnête, l'émission continue
```

## 6. Invariants de conformité

1. Aucun enregistrement commercial hébergé/stocké/retransmis (sauf contrat explicite, phase 2).
2. Aucune mutualisation d'abonnement grand public ; aucun flux personnel via nos serveurs.
3. Chaque connecteur respecte les conditions de son fournisseur ; **aucun contournement** (pas de coupeur de pub, pas d'extraction, lecteur tiers intact).
4. La monétisation ne vend jamais l'accès aux morceaux.
5. Pochettes : usage conditionnel par source ; défaut = photo du membre contributeur.
6. L'émission reste complète sans lecture externe.
7. *Réserve : architecture de réduction des risques, pas une certification juridique. Validation avocat PI avant lancement commercial. Cas « Made for Kids » (YouTube/COPPA) à instruire spécifiquement.*

## 7. Tests d'acceptation

| # | Test | Critère |
|---|---|---|
| **T1** | **Émission fondateur, tous connecteurs OFF**, toutes familles de segments — incluant au moins un `song_ref` sans enregistrement jouable | Émission jouable de bout en bout ; zéro écran mort |
| T2 | Création `SongReference` minimale (`{title}`) | Utilisable immédiatement dans une émission |
| T3 | Une chanson, trois enregistrements, suppression complète des liens | Chanson + souvenirs + émission intacts |
| T4 | Indisponibilité : liens morts **avec** souvenir → replay réel ; **sans** → notice sobre | Jamais de contenu inventé |
| T5 | Export autonome | Archive complète, chansons en métadonnées, rejouable hors ligne |
| T6 | Isolation du `ManaPlayer` (typage/statique) | Impossible d'y jouer une référence musicale |
| T7 | Connecteurs off par défaut | Build initiale verte sans configuration |
| T8 | Traçabilité des sources (métadonnées/pochettes) | Chaque élément affiché trace sa source et son cadre d'autorisation |

**Passage v1.3 (connecteurs)** : T1–T8 verts sur une émission réelle d'une famille pilote.

## 8. Phase 2 (gelée)

Contrat B2B audio (piste : Tuned Global ; alternative gelée : MassiveMusic/7digital) pour lecture intégrée sans public. Conditions d'ouverture : volume de foyers justifiant les minimums garantis, validation juridique, test de lecture réelle en sandbox sans engagement. Le modèle de données n'a pas besoin d'être modifié : la Gateway ajoute un connecteur, rien d'autre.
