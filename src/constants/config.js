export const INITIAL_COLLEGES = [
  {
    "id": "NMC",
    "name": "Narsee Monjee College",
    "code": "NMC"
  },
  {
    "id": "UPG",
    "name": "Usha Pravin Gandhi College",
    "code": "UPG"
  }
];

export const INITIAL_PROGRAMS = {
  "NMC": [
    "45611 - B.Com.",
    "45612 - B.Com.(FM)",
    "45613 - B.Com.(A&F)",
    "45614 - B.M.S.",
    "45615 - B.Com.(M&F)",
    "45616 - B.Com.(Eco)",
    "45617 - B.Com.(Eco&Ana)",
    "45618 - B.Sc.(IT)",
    "45619 - B.Sc.(AI&DA)",
    "45620 - B.Com.(MS)",
    "45621 - B.Com.(C&M)",
    "45701 - M.Com.(AA)",
    "45702 - M.Com.(B&F)",
    "45703 - M.Com.(BM)"
  ],
  "UPG": [
    "53011 - B.A.(MMC)",
    "53012 - B.M.S.",
    "53013 - B.Sc.(IT)",
    "53014 - B.A.(FT&NMP)",
    "53015 - B.Com.(MS)",
    "53016 - B.Sc.(AI&DS)",
    "53021 - M.Sc.(IT)",
    "53022 - M.A.(EMA)",
    "53023 - M.Com.(BM)",
    "53024 - M.A.(MC-FTNM)",
    "53026 - M.Sc.(AI&DS)"
  ]
};

export const INITIAL_BATCHES = [
  "2024-25",
  "2025-26",
  "2026-27",
  "2027-28"
];
    export const INITIAL_SEMESTERS = [
  "Sem I",
  "Sem II",
  "Sem III",
  "Sem IV",
  "Sem V",
  "Sem VI",
  "Sem VII",
  "Sem VIII"
];
    export const INITIAL_EXAM_CYCLES = [
  "Regular",
  "Re-Exam"
];

export const INITIAL_PHASES = [
  "Phase 1: Academic & SAP Setup",
  "Phase 2: ICA & Pre-Conduct",
  "Phase 3: OSM & Evaluation",
  "Phase 4: Regular Results",
  "Phase 5: Revaluation (GR)",
  "Phase 6: Re-Exam & Re-Exam GR",
  "Phase 7: Post-Exam, DigiLocker & Convocation"
];

export const SUPABASE_CONFIG = {
  url: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url) || localStorage.getItem('svkm_supabase_url') || "https://wfkjekwxmodyzncytyqq.supabase.co",
  anonKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.anonKey) || localStorage.getItem('svkm_supabase_anon_key') || "sb_publishable_evpiRRWqkrlBwWud2F6eIg_6oE3HnLs"
};
export const FIREBASE_CONFIG = SUPABASE_CONFIG; // Backward compatibility alias
