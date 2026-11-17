export const INITIAL_COLLEGES = [
  {
    "id": "NM",
    "name": "NM College",
    "code": "NM"
  },
  {
    "id": "UPG",
    "name": "UPG College",
    "code": "UPG"
  },
  {
    "id": "MITHIBAI",
    "name": "Mithibai College",
    "code": "MITHIBAI"
  },
  {
    "id": "DJSCE",
    "name": "D.J. Sanghvi College",
    "code": "DJSCE"
  }
];
    export const INITIAL_PROGRAMS = {
  "NM": [
    "B.Com",
    "B.Com (Hons)",
    "BMS",
    "BAF",
    "BFM",
    "B.Sc. Finance",
    "B.Sc. Economics",
    "M.Com"
  ],
  "UPG": [
    "BMS",
    "BAMMC",
    "B.Sc. IT",
    "B.Sc. Data Science",
    "M.A.CJ",
    "M.Sc. IT"
  ],
  "MITHIBAI": [
    "B.A.",
    "B.Sc.",
    "B.Com",
    "BMS",
    "BAF",
    "BAMMC",
    "B.Sc. Comp Sci",
    "B.Sc. Biotech",
    "M.Sc.",
    "M.A.",
    "M.Com"
  ],
  "DJSCE": [
    "B.Tech Computer",
    "B.Tech IT",
    "B.Tech EXTC",
    "B.Tech AI & DS",
    "B.Tech Mechanical",
    "M.Tech"
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
