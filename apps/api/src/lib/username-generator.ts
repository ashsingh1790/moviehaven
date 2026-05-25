const ADJECTIVES = [
  "Neon",
  "Silent",
  "Crimson",
  "Phantom",
  "Cosmic",
  "Rogue",
  "Digital",
  "Shadow",
  "Midnight",
  "Quantum",
  "Mystic",
  "Iron",
  "Velvet",
  "Electric",
  "Golden",
  "Silver",
  "Stellar",
  "Lunar",
  "Frozen",
  "Obsidian",
  "Noir",
  "Savage",
  "Atomic",
  "Primal",
  "Hollow",
  "Burning",
  "Faded",
  "Vivid",
  "Lucid",
  "Static",
];

const NOUNS = [
  "Auteur",
  "Lumiere",
  "Cineaste",
  "Gaffer",
  "Criterion",
  "Celluloid",
  "Aperture",
  "Shutter",
  "Watcher",
  "Voyeur",
  "Specter",
  "Blade",
  "Falcon",
  "Drifter",
  "Hunter",
  "Ghost",
  "Raven",
  "Nova",
  "Cipher",
  "Rebel",
  "Dolly",
  "Frame",
  "Splice",
  "Montage",
  "Marquee",
  "Reel",
  "Cut",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function suffix(): string {
  return Math.random() > 0.5 ? String(Math.floor(Math.random() * 900) + 100) : "";
}

export function generateUsername(): string {
  return `${pick(ADJECTIVES)}${pick(NOUNS)}${suffix()}`;
}

// Given user input, return 4 movie-themed variants they might like
export function suggestUsernames(input: string): string[] {
  const base = input.trim().replace(/\s+/g, "");
  if (!base) return Array.from({ length: 4 }, generateUsername);

  const capitalized = base.charAt(0).toUpperCase() + base.slice(1);

  return [
    `${pick(ADJECTIVES)}${capitalized}`,
    `${capitalized}${pick(NOUNS)}`,
    `${pick(ADJECTIVES)}${capitalized}${suffix()}`,
    `${capitalized}${pick(NOUNS)}${suffix()}`,
  ];
}
