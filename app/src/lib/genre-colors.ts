/**
 * Mapping TMDB genre id -> palette de couleur pour les chips dans les
 * cards et modales. Couleurs choisies pour evoquer le ton du genre sans
 * etre criardes. Chaque chip = bg + text + border en variantes /15 /200
 * /30 pour rester subtil sur les fonds sombres et clairs.
 */

interface GenreStyle {
  bg: string;
  text: string;
  border: string;
}

// Style neutre pour les ids inconnus ou non mappes.
const DEFAULT_STYLE: GenreStyle = {
  bg: 'bg-white/5',
  text: 'text-white/65',
  border: 'border-white/10',
};

// Mapping conservateur, on reutilise des familles Tailwind. Pas de
// classes computed (Tailwind compile statiquement), donc on hardcode
// les variantes complete pour qu'elles soient dans le bundle CSS.
const GENRE_MAP: Record<number, GenreStyle> = {
  28: { bg: 'bg-red-500/12', text: 'text-red-300', border: 'border-red-500/25' },         // Action
  12: { bg: 'bg-orange-500/12', text: 'text-orange-300', border: 'border-orange-500/25' },// Aventure
  16: { bg: 'bg-violet-500/12', text: 'text-violet-300', border: 'border-violet-500/25' },// Animation
  35: { bg: 'bg-yellow-500/12', text: 'text-yellow-300', border: 'border-yellow-500/25' },// Comedie
  80: { bg: 'bg-slate-500/15', text: 'text-slate-300', border: 'border-slate-500/30' },   // Crime
  99: { bg: 'bg-sky-500/12', text: 'text-sky-300', border: 'border-sky-500/25' },         // Documentaire
  18: { bg: 'bg-indigo-500/12', text: 'text-indigo-300', border: 'border-indigo-500/25' },// Drame
  10751: { bg: 'bg-emerald-500/12', text: 'text-emerald-300', border: 'border-emerald-500/25' }, // Familial
  14: { bg: 'bg-fuchsia-500/12', text: 'text-fuchsia-300', border: 'border-fuchsia-500/25' }, // Fantastique
  36: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },   // Histoire
  27: { bg: 'bg-rose-700/15', text: 'text-rose-300', border: 'border-rose-700/30' },      // Horreur
  10402: { bg: 'bg-pink-500/12', text: 'text-pink-300', border: 'border-pink-500/25' },   // Musique
  9648: { bg: 'bg-indigo-700/15', text: 'text-indigo-300', border: 'border-indigo-700/30' }, // Mystere
  10749: { bg: 'bg-pink-600/12', text: 'text-pink-200', border: 'border-pink-600/25' },   // Romance
  878: { bg: 'bg-cyan-500/12', text: 'text-cyan-300', border: 'border-cyan-500/25' },    // Science-fiction
  10770: { bg: 'bg-slate-500/12', text: 'text-slate-300', border: 'border-slate-500/25' }, // Telefilm
  53: { bg: 'bg-orange-700/15', text: 'text-orange-300', border: 'border-orange-700/30' },// Thriller
  10752: { bg: 'bg-lime-700/15', text: 'text-lime-300', border: 'border-lime-700/30' },   // Guerre
  37: { bg: 'bg-amber-700/15', text: 'text-amber-300', border: 'border-amber-700/30' },   // Western
};

export function getGenreStyle(id: number): GenreStyle {
  return GENRE_MAP[id] || DEFAULT_STYLE;
}

export function genreChipClass(id: number): string {
  const s = getGenreStyle(id);
  return `${s.bg} ${s.text} ${s.border}`;
}
