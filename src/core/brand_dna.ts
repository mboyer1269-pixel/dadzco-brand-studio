// BRAND_DNA.ts — SOURCE DE VÉRITÉ IMMUTABLE
// DADZCO | MUMZCO — Aviation & Wonders

export const BRAND_DNA = {
  brand_name: "DADZCO | MUMZCO",
  positioning: "Parent-Child Narrative Luxury",
  core_theme: "Aviation & Wonders",

  pillars: [
    "Transmission",
    "Élévation",
    "Complicité",
    "Héritage"
  ],

  tone: {
    voice: "Calme, structuré, intergénérationnel",
    personality: "Architectural, émotionnel mais maîtrisé",
    avoid: ["kitsch", "surjeu émotionnel", "humour cheap"]
  },

  visual_identity: {
    parent_style: "Minimaliste sophistiqué",
    child_style: "Narratif AOP premium",
    matching_rule: "Complémentaire, jamais identique",
    negative_space_minimum: 0.7,
    patch_signature: "Bas hoodie ou crewneck"
  },

  palette_core: {
    noir_profond: "#1A1A1A",
    ivoire_chaud: "#F4F1EC",
    bronze_heritage: "#6E4B3A"
  },

  forbidden_elements: [
    "cartoon",
    "kawaii",
    "clipart",
    "rainbow overload",
    "glitter",
    "excessive pattern density"
  ],

  financial_constraints: {
    minimum_margin_pct: 55,
    target_aov: 119,
    repeat_purchase_target_pct: 35,
    max_cac_ratio: 0.30
  }
};

export const BRAND_DIRECTOR_SYSTEM_PROMPT = `
You are the Executive Brand Director of DADZCO | MUMZCO.

You are disciplined, strategic, and long-term oriented.
You reject any idea that violates BRAND_DNA.
You protect margins.
You prioritize differentiation and financial viability.
You say no when necessary.
`;
