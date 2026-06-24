// ─── ai-search.ts ────────────────────────────────────────────────────────────
//
// Semantic AI search engine for WorkShip.
//
// Architecture (layered, each builds on the previous):
//
//  1. Synonym Expansion   — normalises diverse query phrasing into canonical terms
//  2. Intent Library      — maps canonical terms → weighted semantic tag sets
//  3. aiTag Generation    — derives hidden tags from workspace attributes
//  4. Confidence Scoring  — tags carry 0–1 confidence; ranking uses them
//  5. Ranking             — multi-signal score: tags × confidence + legacy signals
//  6. Explanation         — returns matched tags + % score for UI chips
//
// All logic is pure / synchronous — no API calls.

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export type IntentTag = {
  tag: string;
  confidence: number; // 0 – 1
};

export type ParsedAiSearch = {
  city?: string;
  category?: string;
  amenities: string[];
  maxPrice?: number;
  capacity?: number;
  minRating?: number;
  intents: string[];
  collections: string[];
  preferredAmenities: string[];
  preferredCategories: string[];
  keywords: string[];
  // NEW — semantic intent tags with confidence weights
  intentTags: IntentTag[];
};

export type SemanticWorkspace = {
  title: string;
  description?: string;
  amenities?: string[];
  category?: string;
  price?: number;
  pricePerHour?: number;
  rating?: number;
  capacity?: number;
  // NEW — hidden searchable tags generated from workspace attributes
  aiTags?: string[];
};

/** Per-workspace result from rankSemanticResults */
export type RankedWorkspace<TWorkspace> = {
  workspace: TWorkspace;
  score: number;
  /** 0–100 AI match percentage */
  matchPct: number;
  /** Human-readable reasons for the match, used by explanation chips */
  matchReasons: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal legacy types (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

type IntentDefinition = {
  id: string;
  label: string;
  phrases: string[];
  keywords: string[];
  collections: string[];
  preferredAmenities?: string[];
  preferredCategories?: string[];
  minRating?: number;
  defaultCapacity?: number;
  defaultMaxPrice?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// PART 1 — Synonym Expansion Engine
// Maps raw query words/phrases → canonical search terms before intent matching.
// This is the first pass; it broadens reach without changing intent semantics.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Each entry is { synonyms[], canonical }.
 * The expansion applies IN ORDER so earlier rules take precedence for overlaps.
 */
const SYNONYM_RULES: Array<{ synonyms: string[]; canonical: string }> = [
  // ── Aesthetic / beauty ──────────────────────────────────────────────────
  {
    synonyms: ["beautiful", "pretty", "gorgeous", "stunning", "lovely", "nice looking", "photogenic", "instagrammable", "aesthetic"],
    canonical: "aesthetic",
  },
  {
    synonyms: ["good vibes", "great vibes", "vibey", "cool vibe", "cool atmosphere", "nice ambience", "good ambience", "great ambience", "nice vibe", "vibes"],
    canonical: "inspiring",
  },
  // ── View / scenery ──────────────────────────────────────────────────────
  {
    synonyms: ["great view", "nice view", "amazing view", "good view", "city view", "scenic view", "beautiful view", "skyline view", "rooftop view", "overlooking"],
    canonical: "scenic",
  },
  {
    synonyms: ["skyline", "city lights", "urban view"],
    canonical: "city-view",
  },
  // ── Productivity / focus ────────────────────────────────────────────────
  {
    synonyms: ["productive", "focused", "lock in", "deep work", "concentration", "focus mode", "work mode", "grind", "get work done", "finish my project", "heads down", "heads-down", "no distraction", "distraction free"],
    canonical: "productivity",
  },
  {
    synonyms: ["peaceful", "no noise", "pin drop silence", "super quiet", "very quiet", "serene", "calm", "tranquil", "hushed"],
    canonical: "quiet",
  },
  // ── Developer / tech ────────────────────────────────────────────────────
  {
    synonyms: ["coding", "code", "programming", "software", "developer", "engineer", "tech work", "build an app", "build app", "hackathon", "laptop work"],
    canonical: "developer-friendly",
  },
  // ── Team / startup ──────────────────────────────────────────────────────
  {
    synonyms: ["startup", "founders", "entrepreneurs", "co-founders", "early stage", "bootstrap", "my startup"],
    canonical: "networking",
  },
  {
    synonyms: ["team", "my team", "group work", "collaborate", "collaboration", "together", "colleagues", "coworkers", "coworking", "sprint", "scrum", "standup"],
    canonical: "team-friendly",
  },
  {
    synonyms: ["brainstorm", "brainstorming", "ideate", "ideation", "workshop", "whiteboard session"],
    canonical: "collaborative",
  },
  // ── Meetings / professional ─────────────────────────────────────────────
  {
    synonyms: ["presentation", "pitch", "pitch deck", "client call", "sales meeting", "investor meeting", "board meeting", "demo", "investor", "investors"],
    canonical: "meeting-room",
  },
  {
    synonyms: ["professional", "corporate", "executive", "formal", "business"],
    canonical: "corporate",
  },
  {
    synonyms: ["premium", "luxury", "upscale", "high-end", "5 star", "five star", "exclusive", "top notch"],
    canonical: "premium",
  },
  // ── Creative / content ──────────────────────────────────────────────────
  {
    synonyms: ["creative", "creative work", "art", "design", "artistic", "artistic space"],
    canonical: "creative",
  },
  {
    synonyms: ["content creation", "content creator", "youtube", "filming", "shoot", "photoshoot", "photography", "reel", "reels", "video"],
    canonical: "content-creator",
  },
  {
    synonyms: ["podcast", "recording", "audio recording", "mic", "sound studio", "soundproof"],
    canonical: "podcast",
  },
  // ── Networking / community ──────────────────────────────────────────────
  {
    synonyms: ["networking", "meet people", "community", "events", "meetup", "connect with people", "socialize", "socialise"],
    canonical: "networking",
  },
  // ── Comfort / cozy ──────────────────────────────────────────────────────
  {
    synonyms: ["cozy", "cosy", "comfortable", "warm", "homely", "relaxed", "laid back", "chill"],
    canonical: "cozy",
  },
  // ── Outdoor / open air ──────────────────────────────────────────────────
  {
    synonyms: ["outdoor", "open air", "outside", "garden", "terrace", "balcony", "alfresco", "fresh air"],
    canonical: "outdoor",
  },
  {
    synonyms: ["rooftop", "roof top", "rooftop space", "sky lounge", "sky terrace"],
    canonical: "rooftop",
  },
  // ── Study ───────────────────────────────────────────────────────────────
  {
    synonyms: ["study", "revision", "reading", "exam prep", "research", "studying"],
    canonical: "study",
  },
  // ── Budget ──────────────────────────────────────────────────────────────
  {
    synonyms: ["cheap", "budget", "affordable", "low cost", "inexpensive", "student friendly", "student", "value for money", "economical"],
    canonical: "budget-friendly",
  },
  // ── Late night ──────────────────────────────────────────────────────────
  {
    synonyms: ["late night", "night work", "after hours", "24 hours", "24/7", "overnight", "evening"],
    canonical: "late-night",
  },
  // ── Inspiring ───────────────────────────────────────────────────────────
  {
    synonyms: ["inspiring", "inspirational", "motivation", "motivated", "inspired", "energising", "energizing"],
    canonical: "inspiring",
  },
  // ── High rated ──────────────────────────────────────────────────────────
  {
    synonyms: ["best", "top rated", "highly rated", "amazing", "excellent", "world class", "five stars", "recommended"],
    canonical: "high-rated",
  },
];

/**
 * Expands a raw query string by substituting synonym phrases/words with their
 * canonical equivalents. The expanded query is used for intent detection.
 */
function expandSynonyms(query: string): string {
  let expanded = normalize(query);
  for (const { synonyms, canonical } of SYNONYM_RULES) {
    for (const syn of synonyms) {
      // Replace whole-word / whole-phrase occurrences
      const escaped = normalize(syn).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expanded = expanded.replace(new RegExp(`\\b${escaped}\\b`, "gi"), canonical);
    }
  }
  return expanded;
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 2 — Intent Library
// Maps canonical terms (from synonym expansion) → { intentTags + confidence }.
// ─────────────────────────────────────────────────────────────────────────────

type IntentEntry = {
  /** canonical trigger words (single tokens after synonym expansion) */
  triggers: string[];
  /** phrase triggers (multi-word, checked against full expanded query) */
  phraseTriggers?: string[];
  /** tags emitted when this intent fires */
  tags: Array<{ tag: string; confidence: number }>;
};

const INTENT_LIBRARY: IntentEntry[] = [
  // ── Scenic / view ─────────────────────────────────────────────────────
  {
    triggers: ["scenic", "city-view", "rooftop", "outdoor", "view"],
    tags: [
      { tag: "scenic", confidence: 0.95 },
      { tag: "city-view", confidence: 0.88 },
      { tag: "rooftop", confidence: 0.72 },
      { tag: "outdoor", confidence: 0.65 },
      { tag: "inspiring", confidence: 0.60 },
    ],
  },
  // ── Inspiring / aesthetic ─────────────────────────────────────────────
  {
    triggers: ["inspiring", "aesthetic", "creative"],
    tags: [
      { tag: "inspiring", confidence: 0.95 },
      { tag: "aesthetic", confidence: 0.88 },
      { tag: "creative", confidence: 0.80 },
      { tag: "cozy", confidence: 0.55 },
    ],
  },
  // ── Productivity / focus / deep work ──────────────────────────────────
  {
    triggers: ["productivity", "quiet", "developer-friendly"],
    phraseTriggers: ["lock in", "finish my project", "heads down", "deep work", "focus mode"],
    tags: [
      { tag: "productivity", confidence: 0.95 },
      { tag: "quiet", confidence: 0.90 },
      { tag: "developer-friendly", confidence: 0.85 },
      { tag: "focused", confidence: 0.80 },
    ],
  },
  // ── Developer / coding ────────────────────────────────────────────────
  {
    triggers: ["developer-friendly"],
    tags: [
      { tag: "developer-friendly", confidence: 0.97 },
      { tag: "productivity", confidence: 0.88 },
      { tag: "quiet", confidence: 0.80 },
      { tag: "wifi", confidence: 0.75 },
    ],
  },
  // ── Team / startup ────────────────────────────────────────────────────
  {
    triggers: ["team-friendly", "collaborative", "networking"],
    phraseTriggers: ["startup founders", "my startup", "group work"],
    tags: [
      { tag: "team-friendly", confidence: 0.95 },
      { tag: "collaborative", confidence: 0.88 },
      { tag: "networking", confidence: 0.80 },
      { tag: "meeting-room", confidence: 0.60 },
    ],
  },
  // ── Meeting / client / corporate ──────────────────────────────────────
  {
    triggers: ["meeting-room", "corporate", "premium"],
    phraseTriggers: ["client meeting", "pitch deck", "investor meeting", "board meeting"],
    tags: [
      { tag: "meeting-room", confidence: 0.97 },
      { tag: "corporate", confidence: 0.92 },
      { tag: "premium", confidence: 0.85 },
      { tag: "team-friendly", confidence: 0.70 },
    ],
  },
  // ── Creative workspace ────────────────────────────────────────────────
  {
    triggers: ["creative", "content-creator", "podcast"],
    tags: [
      { tag: "creative", confidence: 0.95 },
      { tag: "content-creator", confidence: 0.88 },
      { tag: "inspiring", confidence: 0.80 },
      { tag: "aesthetic", confidence: 0.70 },
      { tag: "photography", confidence: 0.65 },
    ],
  },
  // ── Networking / community ────────────────────────────────────────────
  {
    triggers: ["networking"],
    tags: [
      { tag: "networking", confidence: 0.97 },
      { tag: "community", confidence: 0.88 },
      { tag: "coworking", confidence: 0.80 },
      { tag: "team-friendly", confidence: 0.70 },
    ],
  },
  // ── Cozy / comfortable ────────────────────────────────────────────────
  {
    triggers: ["cozy"],
    tags: [
      { tag: "cozy", confidence: 0.95 },
      { tag: "inspiring", confidence: 0.70 },
      { tag: "aesthetic", confidence: 0.65 },
    ],
  },
  // ── Outdoor / rooftop ─────────────────────────────────────────────────
  {
    triggers: ["outdoor", "rooftop"],
    tags: [
      { tag: "outdoor", confidence: 0.95 },
      { tag: "rooftop", confidence: 0.88 },
      { tag: "scenic", confidence: 0.80 },
      { tag: "city-view", confidence: 0.70 },
      { tag: "inspiring", confidence: 0.60 },
    ],
  },
  // ── Study mode ────────────────────────────────────────────────────────
  {
    triggers: ["study"],
    tags: [
      { tag: "quiet", confidence: 0.95 },
      { tag: "productivity", confidence: 0.88 },
      { tag: "cozy", confidence: 0.70 },
      { tag: "budget-friendly", confidence: 0.60 },
    ],
  },
  // ── Budget ────────────────────────────────────────────────────────────
  {
    triggers: ["budget-friendly"],
    tags: [
      { tag: "budget-friendly", confidence: 0.97 },
      { tag: "wifi", confidence: 0.70 },
      { tag: "quiet", confidence: 0.60 },
    ],
  },
  // ── Late night ────────────────────────────────────────────────────────
  {
    triggers: ["late-night"],
    tags: [
      { tag: "late-night", confidence: 0.97 },
      { tag: "cozy", confidence: 0.70 },
      { tag: "wifi", confidence: 0.65 },
    ],
  },
  // ── High rated ────────────────────────────────────────────────────────
  {
    triggers: ["high-rated"],
    tags: [
      { tag: "high-rated", confidence: 0.97 },
      { tag: "premium", confidence: 0.80 },
    ],
  },
];

/**
 * Extracts weighted intent tags from a raw query string.
 * Applies synonym expansion first, then matches against the intent library.
 * When multiple intents emit the same tag, the highest confidence wins.
 */
export function extractIntentTags(rawQuery: string): IntentTag[] {
  const expanded = expandSynonyms(rawQuery);
  const tokens = tokenize(expanded);
  const tagMap = new Map<string, number>(); // tag → best confidence

  function upsert(tag: string, confidence: number) {
    const existing = tagMap.get(tag) ?? 0;
    if (confidence > existing) tagMap.set(tag, confidence);
  }

  for (const entry of INTENT_LIBRARY) {
    let fired = false;

    // Token triggers
    for (const trigger of entry.triggers) {
      if (tokens.includes(trigger)) {
        fired = true;
        break;
      }
    }

    // Phrase triggers (checked on expanded string)
    if (!fired && entry.phraseTriggers) {
      for (const phrase of entry.phraseTriggers) {
        if (expanded.includes(normalize(phrase))) {
          fired = true;
          break;
        }
      }
    }

    if (fired) {
      for (const { tag, confidence } of entry.tags) {
        upsert(tag, confidence);
      }
    }
  }

  // Sort by confidence descending, cap at top 8 to keep UI clean
  return Array.from(tagMap.entries())
    .map(([tag, confidence]) => ({ tag, confidence }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 3 — aiTag Generation
// Derives hidden semantic tags from a workspace's existing attributes.
// These tags are matched against intentTags during ranking.
// ─────────────────────────────────────────────────────────────────────────────

// Category → tags
const CATEGORY_TAGS: Record<string, string[]> = {
  rooftop: ["rooftop", "outdoor", "scenic", "city-view", "inspiring", "creative", "photography", "aesthetic"],
  cafe: ["cozy", "inspiring", "creative", "quiet", "networking", "aesthetic", "community"],
  private: ["quiet", "productivity", "developer-friendly", "focused", "corporate"],
  coworking: ["team-friendly", "networking", "collaborative", "community", "coworking", "wifi"],
  meeting: ["meeting-room", "collaborative", "team-friendly", "corporate", "premium"],
  loft: ["creative", "inspiring", "collaborative", "networking", "aesthetic", "photography"],
  studio: ["creative", "content-creator", "photography", "podcast", "inspiring", "aesthetic"],
};

// Amenity → tags
const AMENITY_TAGS: Record<string, string[]> = {
  "Outdoor": ["outdoor", "scenic", "fresh-air", "rooftop"],
  "City View": ["city-view", "scenic", "inspiring"],
  "Quiet": ["quiet", "productivity", "focused"],
  "Coffee": ["cozy", "aesthetic", "networking"],
  "Whiteboard": ["collaborative", "meeting-room", "team-friendly"],
  "Monitor": ["developer-friendly", "productivity"],
  "Wi-Fi": ["developer-friendly", "productivity", "wifi"],
  "4K Display": ["developer-friendly", "meeting-room", "premium"],
  "Projector": ["meeting-room", "collaborative", "corporate"],
  "Vinyl": ["creative", "inspiring", "aesthetic"],
  "Books": ["cozy", "study", "quiet", "inspiring"],
  "Phone booths": ["focused", "quiet", "corporate"],
  "AC": ["premium", "corporate", "productivity"],
  "Parking": ["premium", "corporate"],
  "Printer": ["corporate", "productivity"],
  "Standing desk": ["developer-friendly", "productivity", "premium"],
  "Catering": ["premium", "corporate", "meeting-room"],
  "Snacks": ["cozy", "community", "networking"],
  "Lockers": ["productivity", "developer-friendly"],
  "Power": ["developer-friendly", "productivity"],
  "Shade": ["outdoor", "rooftop"],
  "Tea": ["cozy", "quiet", "study"],
  "Plants": ["aesthetic", "inspiring", "cozy"],
};

// Description keyword → tags (checked as substrings)
const DESCRIPTION_KEYWORD_TAGS: Array<{ keywords: string[]; tags: string[] }> = [
  { keywords: ["view", "views", "overlook"], tags: ["scenic", "city-view", "inspiring"] },
  { keywords: ["rooftop", "roof top"], tags: ["rooftop", "outdoor", "scenic"] },
  { keywords: ["bright", "sunlit", "sunny", "light-filled"], tags: ["inspiring", "aesthetic", "photography"] },
  { keywords: ["collaboration", "collaborative", "community"], tags: ["collaborative", "team-friendly", "networking"] },
  { keywords: ["deep work", "focus", "concentrate"], tags: ["quiet", "productivity", "focused"] },
  { keywords: ["creative", "creativity"], tags: ["creative", "inspiring", "aesthetic"] },
  { keywords: ["premium", "luxury", "executive"], tags: ["premium", "corporate"] },
  { keywords: ["loft", "industrial"], tags: ["creative", "inspiring", "collaborative"] },
  { keywords: ["glass", "glasshouse"], tags: ["inspiring", "aesthetic", "premium", "scenic"] },
  { keywords: ["sunset", "golden-hour", "golden hour", "string lights"], tags: ["scenic", "inspiring", "photography", "aesthetic"] },
  { keywords: ["pitch", "client"], tags: ["meeting-room", "corporate", "premium"] },
  { keywords: ["cozy", "cosy", "comfortable"], tags: ["cozy", "inspiring"] },
  { keywords: ["jazz", "music", "vinyl"], tags: ["aesthetic", "creative", "inspiring"] },
  { keywords: ["no-calls", "no calls", "quiet zone"], tags: ["quiet", "focused", "productivity"] },
  { keywords: ["book", "library", "reading"], tags: ["quiet", "study", "cozy"] },
  { keywords: ["garden", "plants", "green"], tags: ["outdoor", "aesthetic", "inspiring"] },
  { keywords: ["canal", "water", "riverside", "waterfront"], tags: ["scenic", "inspiring", "aesthetic"] },
  { keywords: ["espresso", "specialty coffee", "barista"], tags: ["cozy", "aesthetic", "premium"] },
  { keywords: ["ergonomic", "standing desk"], tags: ["productivity", "developer-friendly", "premium"] },
  { keywords: ["AV", "audio visual", "presentation"], tags: ["meeting-room", "corporate"] },
  { keywords: ["podcast", "recording", "soundproof"], tags: ["podcast", "content-creator", "creative"] },
];

/**
 * Generates an array of semantic AI tags from a workspace's attributes.
 * These are stored as `workspace.aiTags` and used during ranking.
 */
export function generateAiTags(workspace: SemanticWorkspace): string[] {
  const tags = new Set<string>();

  // Category tags
  const catTags = CATEGORY_TAGS[workspace.category?.toLowerCase() ?? ""] ?? [];
  for (const t of catTags) tags.add(t);

  // Amenity tags
  for (const amenity of workspace.amenities ?? []) {
    const amenTags = AMENITY_TAGS[amenity] ?? [];
    for (const t of amenTags) tags.add(t);
  }

  // Description keyword tags
  const desc = normalize(workspace.description ?? "");
  const titleText = normalize(workspace.title ?? "");
  const fullText = `${titleText} ${desc}`;

  for (const { keywords, tags: kwTags } of DESCRIPTION_KEYWORD_TAGS) {
    for (const kw of keywords) {
      if (fullText.includes(normalize(kw))) {
        for (const t of kwTags) tags.add(t);
        break;
      }
    }
  }

  return Array.from(tags);
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy helpers (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_PATTERNS: Array<{ value: string; patterns: string[] }> = [
  { value: "private", patterns: ["private office", "private workspace", "private cabin"] },
  { value: "meeting", patterns: ["meeting room", "conference room", "board room"] },
  { value: "coworking", patterns: ["coworking", "coworking space", "shared workspace"] },
  { value: "cafe", patterns: ["cafe", "coffee shop", "cafe style"] },
  { value: "rooftop", patterns: ["rooftop", "terrace"] },
  { value: "loft", patterns: ["loft"] },
  { value: "studio", patterns: ["studio"] },
];

const EXPLICIT_AMENITY_PATTERNS: Array<{ value: string; patterns: string[] }> = [
  { value: "Wi-Fi", patterns: ["wifi", "wi-fi", "internet"] },
  { value: "Coffee", patterns: ["coffee", "espresso"] },
  { value: "Quiet", patterns: ["quiet", "silent"] },
  { value: "Monitor", patterns: ["monitor", "screen", "display"] },
  { value: "Whiteboard", patterns: ["whiteboard", "white board"] },
  { value: "Outdoor", patterns: ["outdoor", "open air"] },
  { value: "Phone booths", patterns: ["phone booth", "phone booths", "call booth"] },
  { value: "Printer", patterns: ["printer", "printing"] },
  { value: "Parking", patterns: ["parking", "car park"] },
];

const INTENT_DEFINITIONS: IntentDefinition[] = [
  {
    id: "deep-work",
    label: "Quiet Spaces",
    phrases: ["deep work", "whole day", "heads down", "focus on coding", "lock in", "finish my project"],
    keywords: ["focus", "coding", "code", "study", "productive", "quiet", "concentrate"],
    collections: ["Quiet Spaces", "Developer Friendly"],
    preferredAmenities: ["Quiet", "Wi-Fi", "Monitor"],
    preferredCategories: ["private", "studio", "cafe"],
    minRating: 4.5,
  },
  {
    id: "developer-friendly",
    label: "Developer Friendly",
    phrases: ["software work", "developer friendly", "build an app"],
    keywords: ["developer", "programming", "coding", "laptop", "engineer", "hackathon"],
    collections: ["Developer Friendly"],
    preferredAmenities: ["Wi-Fi", "Monitor", "Quiet", "Coffee"],
    preferredCategories: ["private", "coworking", "studio"],
    minRating: 4.4,
  },
  {
    id: "team-friendly",
    label: "Team Friendly",
    phrases: ["startup team", "my team", "group work", "team session", "startup founders", "my startup"],
    keywords: ["team", "startup", "collaboration", "brainstorm", "sprint", "coworking", "founders", "entrepreneurs"],
    collections: ["Team Friendly", "Trending"],
    preferredAmenities: ["Wi-Fi", "Whiteboard", "Coffee"],
    preferredCategories: ["coworking", "meeting", "loft"],
    defaultCapacity: 4,
    minRating: 4.3,
  },
  {
    id: "client-meeting",
    label: "Corporate Spaces",
    phrases: ["client meetings", "client meeting", "pitch deck", "board meeting", "investor meeting", "professional space"],
    keywords: ["client", "pitch", "presentation", "meeting", "professional", "corporate", "investor", "investors"],
    collections: ["Corporate Spaces", "Highly Rated"],
    preferredAmenities: ["Whiteboard", "Coffee"],
    preferredCategories: ["meeting", "private", "loft"],
    defaultCapacity: 4,
    minRating: 4.6,
  },
  {
    id: "cafe-ambience",
    label: "Cafe Style",
    phrases: ["beautiful place", "great ambience", "good ambience", "aesthetic place", "good vibes", "nice ambience"],
    keywords: ["beautiful", "coffee", "ambience", "cozy", "aesthetic", "vibes", "vibe", "inspiring", "vibey"],
    collections: ["Cafe Style", "Highly Rated"],
    preferredAmenities: ["Coffee", "Wi-Fi"],
    preferredCategories: ["cafe", "rooftop", "loft"],
    minRating: 4.5,
  },
  {
    id: "budget-friendly",
    label: "Budget Friendly",
    phrases: ["cheap place", "budget friendly", "low cost"],
    keywords: ["cheap", "budget", "affordable", "student", "value"],
    collections: ["Budget Friendly"],
    preferredAmenities: ["Wi-Fi", "Quiet"],
    preferredCategories: ["coworking", "cafe", "studio"],
    defaultMaxPrice: 300,
  },
  {
    id: "late-night-work",
    label: "Late Night Work",
    phrases: ["late night", "after hours", "overnight"],
    keywords: ["night", "evening", "late"],
    collections: ["Late Night Work"],
    preferredAmenities: ["Coffee", "Wi-Fi"],
    preferredCategories: ["coworking", "cafe", "rooftop"],
  },
  {
    id: "study-mode",
    label: "Quiet Spaces",
    phrases: ["place to study", "study session"],
    keywords: ["study", "revision", "reading", "exam"],
    collections: ["Quiet Spaces", "Budget Friendly"],
    preferredAmenities: ["Quiet", "Wi-Fi"],
    preferredCategories: ["cafe", "private", "studio"],
    defaultMaxPrice: 300,
  },
  {
    id: "top-rated",
    label: "Highly Rated",
    phrases: ["best place", "top rated", "highly recommended"],
    keywords: ["best", "premium", "highly rated", "amazing", "excellent"],
    collections: ["Highly Rated"],
    minRating: 4.7,
  },
  {
    id: "creative-workspace",
    label: "Creative Spaces",
    phrases: ["content creation", "creative workspace", "creative work", "good place for content"],
    keywords: ["creative", "content", "photography", "design", "art", "artistic", "studio"],
    collections: ["Creative Spaces"],
    preferredAmenities: ["Wi-Fi", "Coffee"],
    preferredCategories: ["studio", "loft", "rooftop", "cafe"],
    minRating: 4.3,
  },
  {
    id: "scenic-view",
    label: "Scenic Views",
    phrases: ["great view", "nice view", "city view", "scenic view", "with a view", "overlooking"],
    keywords: ["view", "scenic", "skyline", "rooftop", "outdoor"],
    collections: ["Scenic Views"],
    preferredCategories: ["rooftop", "loft", "cafe"],
    minRating: 4.5,
  },
];

const NOISE_WORDS = new Set([
  "a", "an", "and", "can", "for", "i", "in", "me", "my", "need",
  "of", "on", "place", "somewhere", "space", "that", "the", "to",
  "want", "where", "with", "workspace", "is", "at", "are", "be",
  "do", "get", "have", "it", "just", "like", "look", "looking",
  "nice", "really", "some", "this", "us", "we", "would",
]);

function normalize(value: string) {
  return value.toLowerCase().replace(/[^\w\s-]/g, " ");
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function tokenize(value: string) {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function extractCity(query: string, cities: string[]) {
  const normalizedQuery = normalize(query);
  for (const city of cities) {
    const normalizedCity = normalize(city).trim();
    if (!normalizedCity) continue;
    const pattern = new RegExp(`\\b${normalizedCity.replace(/\s+/g, "\\s+")}\\b`, "i");
    if (pattern.test(normalizedQuery)) return city;
  }
  return undefined;
}

function extractCategory(query: string) {
  const normalizedQuery = normalize(query);
  const match = CATEGORY_PATTERNS.find(({ patterns }) =>
    patterns.some((pattern) => normalizedQuery.includes(normalize(pattern))),
  );
  return match?.value;
}

function extractExplicitAmenities(query: string) {
  const normalizedQuery = normalize(query);
  return unique(
    EXPLICIT_AMENITY_PATTERNS.filter(({ patterns }) =>
      patterns.some((pattern) => normalizedQuery.includes(normalize(pattern))),
    ).map(({ value }) => value),
  );
}

function extractMaxPrice(query: string) {
  const match = query.match(
    /(?:under|below|less than|max(?:imum)?|up to)\s*(?:rs\.?|inr|₹)?\s*(\d{2,5})/i,
  );
  return match ? Number(match[1]) : undefined;
}

function extractCapacity(query: string) {
  const match = query.match(
    /(?:for|fits?|seat(?:s|ing)?|capacity(?: of)?)\s*(\d{1,3})\s*(?:people|persons?|pax)?/i,
  );
  return match ? Number(match[1]) : undefined;
}

function extractKeywords(query: string) {
  return unique(tokenize(query).filter((token) => !NOISE_WORDS.has(token)));
}

function detectIntents(query: string) {
  // Run on BOTH original and synonym-expanded query for best recall
  const normalizedQuery = normalize(query);
  const expandedQuery = expandSynonyms(query);
  const tokens = tokenize(expandedQuery);
  const intents: IntentDefinition[] = [];

  for (const intent of INTENT_DEFINITIONS) {
    let score = 0;

    for (const phrase of intent.phrases) {
      if (normalizedQuery.includes(normalize(phrase))) score += 3;
      if (expandedQuery.includes(normalize(phrase))) score += 2;
    }

    for (const keyword of intent.keywords) {
      if (tokens.includes(normalize(keyword).trim())) score += 1;
    }

    if (score >= 2) intents.push(intent);
  }

  return intents;
}

// ─────────────────────────────────────────────────────────────────────────────
// parseAiSearchQuery — main entry point for the homepage search bar
// ─────────────────────────────────────────────────────────────────────────────

export function parseAiSearchQuery(query: string, cities: string[]): ParsedAiSearch {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      amenities: [],
      intents: [],
      collections: [],
      preferredAmenities: [],
      preferredCategories: [],
      keywords: [],
      intentTags: [],
    };
  }

  const explicitAmenities = extractExplicitAmenities(trimmed);
  const detectedIntents = detectIntents(trimmed);
  const preferredAmenities = unique(
    detectedIntents.flatMap((intent) => intent.preferredAmenities ?? []),
  );
  const preferredCategories = unique(
    detectedIntents.flatMap((intent) => intent.preferredCategories ?? []),
  );
  const collections = unique(detectedIntents.flatMap((intent) => intent.collections));
  const inferredMinRating = detectedIntents.reduce<number | undefined>((highest, intent) => {
    if (intent.minRating === undefined) return highest;
    return highest === undefined ? intent.minRating : Math.max(highest, intent.minRating);
  }, undefined);
  const inferredCapacity = detectedIntents.reduce<number | undefined>((highest, intent) => {
    if (intent.defaultCapacity === undefined) return highest;
    return highest === undefined ? intent.defaultCapacity : Math.max(highest, intent.defaultCapacity);
  }, undefined);
  const inferredMaxPrice = detectedIntents.reduce<number | undefined>((lowest, intent) => {
    if (intent.defaultMaxPrice === undefined) return lowest;
    return lowest === undefined ? intent.defaultMaxPrice : Math.min(lowest, intent.defaultMaxPrice);
  }, undefined);

  // NEW — semantic intent tags via synonym expansion + intent library
  const intentTags = extractIntentTags(trimmed);

  return {
    city: extractCity(trimmed, cities),
    category: extractCategory(trimmed) || preferredCategories[0],
    amenities: explicitAmenities,
    maxPrice: extractMaxPrice(trimmed) ?? inferredMaxPrice,
    capacity: extractCapacity(trimmed) ?? inferredCapacity,
    minRating: inferredMinRating,
    intents: detectedIntents.map((intent) => intent.label),
    collections,
    preferredAmenities,
    preferredCategories,
    keywords: extractKeywords(trimmed),
    intentTags,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring helpers
// ─────────────────────────────────────────────────────────────────────────────

function getWorkspacePrice(workspace: SemanticWorkspace) {
  return workspace.price ?? workspace.pricePerHour ?? 0;
}

function getWorkspaceText(workspace: SemanticWorkspace) {
  return normalize(
    [workspace.title, workspace.description, workspace.category, ...(workspace.amenities ?? [])]
      .filter(Boolean)
      .join(" "),
  );
}

function scorePriceSuitability(workspace: SemanticWorkspace, maxPrice?: number) {
  const price = getWorkspacePrice(workspace);
  if (!maxPrice || price <= 0) return 0;
  if (price <= maxPrice) return 12;
  const overshoot = price - maxPrice;
  return Math.max(-16, 10 - overshoot / 20);
}

function scoreCapacitySuitability(workspace: SemanticWorkspace, capacity?: number) {
  const actualCapacity = workspace.capacity ?? 0;
  if (!capacity) return 0;
  if (actualCapacity >= capacity) return 10 + Math.min(6, actualCapacity - capacity);
  return -20;
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 3 + 5 — Enhanced relevance scoring with confidence-weighted tag matching
// ─────────────────────────────────────────────────────────────────────────────

/** Max raw score achievable — used to normalise to 0–100 %. */
const MAX_POSSIBLE_SCORE = 120;

type ScoringContext = Pick<
  ParsedAiSearch,
  | "category"
  | "amenities"
  | "preferredAmenities"
  | "preferredCategories"
  | "maxPrice"
  | "capacity"
  | "minRating"
  | "keywords"
  | "intents"
  | "intentTags"
>;

export function getSemanticRelevanceScore(
  workspace: SemanticWorkspace,
  parsed: ScoringContext,
): { score: number; matchReasons: string[] } {
  let score = 0;
  const matchReasons: string[] = [];
  const workspaceText = getWorkspaceText(workspace);
  const workspaceAmenities = workspace.amenities ?? [];
  const workspaceCategory = workspace.category ?? "";
  const workspaceTags = workspace.aiTags ?? [];
  const rating = workspace.rating ?? 0;

  // ── Legacy: explicit category ──────────────────────────────────────────
  if (parsed.category) {
    if (workspaceCategory === parsed.category) {
      score += 28;
    } else {
      score -= 12;
    }
  }

  // ── Legacy: explicit amenities ─────────────────────────────────────────
  for (const amenity of parsed.amenities) {
    if (workspaceAmenities.includes(amenity)) {
      score += 14;
    } else {
      score -= 6;
    }
  }

  // ── Legacy: preferred amenities ────────────────────────────────────────
  for (const amenity of parsed.preferredAmenities) {
    if (parsed.amenities.includes(amenity)) continue;
    if (workspaceAmenities.includes(amenity)) score += 8;
  }

  // ── Legacy: preferred categories ───────────────────────────────────────
  for (const category of parsed.preferredCategories) {
    if (workspaceCategory === category) score += 10;
  }

  // ── Legacy: keyword text match ─────────────────────────────────────────
  for (const keyword of parsed.keywords) {
    if (workspaceText.includes(keyword)) score += 4;
  }

  // ── Legacy: price / capacity / rating ─────────────────────────────────
  score += scorePriceSuitability(workspace, parsed.maxPrice);
  score += scoreCapacitySuitability(workspace, parsed.capacity);

  if (parsed.minRating) {
    score += rating >= parsed.minRating ? 12 : -8;
  } else {
    score += rating * 2;
  }

  if (parsed.intents.length > 0) {
    score += Math.min(10, parsed.intents.length * 2);
  }

  // ── NEW: Confidence-weighted semantic tag matching ─────────────────────
  // Each intentTag hit on workspace.aiTags contributes confidence × 8 points.
  // Cap at 48 to keep balance with legacy signals.
  let tagScore = 0;
  for (const { tag, confidence } of parsed.intentTags) {
    if (workspaceTags.includes(tag)) {
      const pts = confidence * 8;
      tagScore += pts;
      // Collect human-readable reasons for top-confidence tags
      if (confidence >= 0.7) {
        const label = TAG_LABELS[tag] ?? tag;
        if (!matchReasons.includes(label)) matchReasons.push(label);
      }
    }
  }
  score += Math.min(48, tagScore);

  // Also boost if workspace text itself mentions the tag keyword (belt + suspenders)
  for (const { tag } of parsed.intentTags) {
    if (workspaceText.includes(tag.replace(/-/g, " "))) score += 2;
  }

  return { score, matchReasons };
}

// ─────────────────────────────────────────────────────────────────────────────
// PART 6 — Human-readable tag labels for explanation chips
// ─────────────────────────────────────────────────────────────────────────────

export const TAG_LABELS: Record<string, string> = {
  scenic: "Scenic View",
  "city-view": "City View",
  rooftop: "Rooftop Workspace",
  outdoor: "Outdoor Space",
  inspiring: "Inspiring Environment",
  aesthetic: "Aesthetic Space",
  creative: "Creative Workspace",
  "content-creator": "Content Creator Ready",
  photography: "Photography Friendly",
  podcast: "Podcast / Recording",
  networking: "Networking Hub",
  community: "Community Space",
  coworking: "Coworking Friendly",
  "team-friendly": "Team Friendly",
  collaborative: "Collaborative Space",
  "meeting-room": "Meeting Room",
  corporate: "Corporate Space",
  premium: "Premium Workspace",
  "developer-friendly": "Developer Friendly",
  productivity: "High Productivity",
  focused: "Focused Environment",
  quiet: "Quiet Space",
  wifi: "Fast Wi-Fi",
  cozy: "Cozy Atmosphere",
  "budget-friendly": "Budget Friendly",
  "late-night": "Late Night Work",
  study: "Study Friendly",
  "high-rated": "Highly Rated",
  "fresh-air": "Fresh Air",
};

/** Emoji map for explanation chips */
export const TAG_EMOJIS: Record<string, string> = {
  scenic: "🌇",
  "city-view": "🏙️",
  rooftop: "🏢",
  outdoor: "🌿",
  inspiring: "✨",
  aesthetic: "🎨",
  creative: "🎨",
  "content-creator": "🎬",
  photography: "📸",
  podcast: "🎙️",
  networking: "🤝",
  community: "👥",
  coworking: "💼",
  "team-friendly": "👥",
  collaborative: "🧠",
  "meeting-room": "📊",
  corporate: "🏛️",
  premium: "⭐",
  "developer-friendly": "💻",
  productivity: "⚡",
  focused: "🎯",
  quiet: "🌿",
  wifi: "📶",
  cozy: "☕",
  "budget-friendly": "💰",
  "late-night": "🌙",
  study: "📚",
  "high-rated": "🏆",
  "fresh-air": "🌬️",
};

// ─────────────────────────────────────────────────────────────────────────────
// PART 5 — rankSemanticResults (enhanced)
// ─────────────────────────────────────────────────────────────────────────────

export function rankSemanticResults<TWorkspace extends SemanticWorkspace>(
  workspaces: TWorkspace[],
  parsed: ScoringContext,
): RankedWorkspace<TWorkspace>[] {
  if (workspaces.length === 0) return [];

  const scored = workspaces.map((workspace) => {
    const { score, matchReasons } = getSemanticRelevanceScore(workspace, parsed);
    return { workspace, score, matchReasons };
  });

  // Determine range for normalisation
  const scores = scored.map((s) => s.score);
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);
  const range = maxScore - minScore || 1;

  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ workspace, score, matchReasons }) => {
      // Map score to 0–100 relative to this result set, floor at 40 for non-zero matches
      const rawPct = ((score - minScore) / range) * 60 + 40;
      const matchPct = Math.round(Math.min(99, Math.max(40, rawPct)));
      return { workspace, score, matchPct, matchReasons };
    });
}
