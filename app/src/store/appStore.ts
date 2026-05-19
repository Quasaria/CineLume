import { create } from 'zustand';
import { toast } from 'sonner';
import type { FavoriteMovie, ViewMode, CustomList } from '@/types/movie';
import { getCurrentCinemaContext, getCinemaWeeksOfMonth } from '@/lib/cinema-week';
import i18n from '@/i18n';

export type ReleaseMode = 'theater' | 'platform' | 'all';

export interface SelectedPerson {
  id: number;
  name: string;
}

interface AppState {
  isDark: boolean;
  viewMode: ViewMode;
  searchQuery: string;
  selYear: number;
  selMonth: number;
  selWeek: number;
  selRegion: string;
  selGenre: string;
  selReleaseMode: ReleaseMode;
  selProvider: string;
  selectedPerson: SelectedPerson | null;
  favorites: FavoriteMovie[];
  watchlist: FavoriteMovie[];
  customLists: CustomList[];
  blindMode: boolean;
  sortBy: 'popularity' | 'date' | 'rating';
  runtimeMax: number | null;  // minutes, null = no filter
  currentModalMovieId: number | null;
  isFilterOpen: boolean;
  isFavOpen: boolean;
  isWatchlistOpen: boolean;
  isListsOpen: boolean;
  isSettingsOpen: boolean;

  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (q: string) => void;
  setDate: (year: number, month: number, week: number) => void;
  setRegion: (region: string) => void;
  setGenre: (genre: string) => void;
  setReleaseMode: (mode: ReleaseMode) => void;
  setProvider: (provider: string) => void;
  setSelectedPerson: (person: SelectedPerson | null) => void;
  jumpToToday: () => void;
  toggleFav: (movie: FavoriteMovie) => void;
  removeFav: (id: number) => void;
  isFav: (id: number) => boolean;
  toggleWatchlist: (movie: FavoriteMovie) => void;
  removeFromWatchlist: (id: number) => void;
  isInWatchlist: (id: number) => boolean;
  createList: (name: string) => string;
  renameList: (id: string, name: string) => void;
  deleteList: (id: string) => void;
  addFilmToList: (listId: string, film: FavoriteMovie) => void;
  removeFilmFromList: (listId: string, filmId: number) => void;
  isFilmInList: (listId: string, filmId: number) => boolean;
  openModal: (id: number) => void;
  closeModal: () => void;
  openFilters: () => void;
  closeFilters: () => void;
  openFavorites: () => void;
  closeFavorites: () => void;
  openWatchlist: () => void;
  closeWatchlist: () => void;
  openLists: () => void;
  closeLists: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  toggleBlindMode: () => void;
  setSortBy: (s: 'popularity' | 'date' | 'rating') => void;
  setRuntimeMax: (n: number | null) => void;
}

// Theme : si l'user a explicitement choisi, on respecte. Sinon on suit
// prefers-color-scheme de l'OS. Defaut dark si pas de preference (e.g.
// vieux browsers sans matchMedia).
const savedTheme = localStorage.getItem('cinelume_theme');
let isDark: boolean;
if (savedTheme === 'dark') {
  isDark = true;
} else if (savedTheme === 'light') {
  isDark = false;
} else if (typeof window !== 'undefined' && window.matchMedia) {
  isDark = !window.matchMedia('(prefers-color-scheme: light)').matches;
} else {
  isDark = true;
}

if (isDark) {
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
} else {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
}

// Si pas de preference user, on ecoute les changements OS pour basculer
// automatiquement. Listener attache une seule fois au module load.
if (!savedTheme && typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  mq.addEventListener('change', (e) => {
    const stillNoPreference = !localStorage.getItem('cinelume_theme');
    if (!stillNoPreference) return;
    const nowDark = !e.matches;
    if (nowDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    useAppStore.setState({ isDark: nowDark });
  });
}

const savedBlindMode = localStorage.getItem('cinelume_blind_mode') === '1';
if (savedBlindMode) {
  document.documentElement.classList.add('blind-mode');
}

const initialRegion = localStorage.getItem('cinelume_region') || 'FR';
const initialContext = getCurrentCinemaContext(initialRegion);

// Migration : l'ancien defaut etait 'all' (trop permissif), on le purge une fois
if (!localStorage.getItem('cinelume_migration_v3')) {
  if (localStorage.getItem('cinelume_releasemode') === 'all') {
    localStorage.removeItem('cinelume_releasemode');
  }
  localStorage.setItem('cinelume_migration_v3', '1');
}

const RELEASE_MODES_VALID: readonly ReleaseMode[] = ['theater', 'platform', 'all'] as const;
const rawMode = localStorage.getItem('cinelume_releasemode');
const savedReleaseMode: ReleaseMode = RELEASE_MODES_VALID.includes(rawMode as ReleaseMode)
  ? (rawMode as ReleaseMode)
  : 'theater';

function safeParseList(key: string): FavoriteMovie[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseFavs(): FavoriteMovie[] {
  return safeParseList('cinelume_favs');
}

function safeParseWatchlist(): FavoriteMovie[] {
  return safeParseList('cinelume_watchlist');
}

function safeParseCustomLists(): CustomList[] {
  try {
    const raw = localStorage.getItem('cinelume_custom_lists');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l): l is CustomList =>
      typeof l === 'object' &&
      l !== null &&
      typeof l.id === 'string' &&
      typeof l.name === 'string' &&
      Array.isArray(l.films) &&
      typeof l.createdAt === 'number',
    );
  } catch {
    return [];
  }
}

function persistCustomLists(lists: CustomList[]) {
  try {
    localStorage.setItem('cinelume_custom_lists', JSON.stringify(lists));
  } catch {
    // quota plein, on ignore
  }
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const VIEW_MODES_VALID: readonly ViewMode[] = ['grid', 'list'] as const;
const rawViewMode = localStorage.getItem('cinelume_view_mode');
const savedViewMode: ViewMode = VIEW_MODES_VALID.includes(rawViewMode as ViewMode)
  ? (rawViewMode as ViewMode)
  : 'grid';

export const useAppStore = create<AppState>((set, get) => ({
  isDark,
  viewMode: savedViewMode,
  searchQuery: '',
  selYear: initialContext.year,
  selMonth: initialContext.month,
  selWeek: initialContext.week,
  selRegion: initialRegion,
  selGenre: localStorage.getItem('cinelume_genre') || '',
  selReleaseMode: savedReleaseMode,
  selProvider: localStorage.getItem('cinelume_provider') || '',
  selectedPerson: null,
  favorites: safeParseFavs(),
  watchlist: safeParseWatchlist(),
  customLists: safeParseCustomLists(),
  blindMode: savedBlindMode,
  sortBy: (localStorage.getItem('cinelume_sort') as 'popularity' | 'date' | 'rating') || 'popularity',
  runtimeMax: (() => {
    const raw = localStorage.getItem('cinelume_runtime_max');
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })(),
  currentModalMovieId: null,
  isFilterOpen: false,
  isFavOpen: false,
  isWatchlistOpen: false,
  isListsOpen: false,
  isSettingsOpen: false,

  toggleTheme: () => {
    const newDark = !get().isDark;
    localStorage.setItem('cinelume_theme', newDark ? 'dark' : 'light');
    if (newDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    set({ isDark: newDark });
  },

  setViewMode: (mode) => {
    try {
      localStorage.setItem('cinelume_view_mode', mode);
    } catch {
      // ignore
    }
    set({ viewMode: mode });
  },
  setSearchQuery: (q) => set({ searchQuery: q }),

  setDate: (year, month, week) => {
    set({ selYear: year, selMonth: month, selWeek: week });
  },

  setRegion: (region) => {
    localStorage.setItem('cinelume_region', region);
    const state = get();
    const weeks = getCinemaWeeksOfMonth(state.selYear, state.selMonth, region);
    const clampedWeek = Math.min(Math.max(state.selWeek, 1), Math.max(weeks.length, 1));
    set({ selRegion: region, selWeek: clampedWeek });
  },

  setGenre: (genre) => {
    localStorage.setItem('cinelume_genre', genre);
    set({ selGenre: genre });
  },

  setReleaseMode: (mode) => {
    localStorage.setItem('cinelume_releasemode', mode);
    set({ selReleaseMode: mode });
  },

  setProvider: (provider) => {
    localStorage.setItem('cinelume_provider', provider);
    set({ selProvider: provider });
  },

  setSelectedPerson: (person) => {
    set({ selectedPerson: person, searchQuery: '' });
  },

  jumpToToday: () => {
    // "Aujourd'hui" : on retombe sur les vraies sorties du jour. Reset aussi
    // la recherche et le mode filmographie sinon le bouton ne fait rien de
    // visible quand l'utilisateur etait dans un de ces modes.
    const ctx = getCurrentCinemaContext(get().selRegion);
    set({
      selYear: ctx.year,
      selMonth: ctx.month,
      selWeek: ctx.week,
      searchQuery: '',
      selectedPerson: null,
    });
  },

  toggleFav: (movie) => {
    const favs = [...get().favorites];
    const idx = favs.findIndex(f => f.id === movie.id);
    const wasFav = idx > -1;
    if (wasFav) {
      favs.splice(idx, 1);
    } else {
      favs.push(movie);
    }
    try {
      localStorage.setItem('cinelume_favs', JSON.stringify(favs));
    } catch {
      // ignore
    }
    set({ favorites: favs });
    toast.success(i18n.t(wasFav ? 'favorites.removed' : 'favorites.added', { title: movie.title }));
  },

  removeFav: (id) => {
    const favs = get().favorites.filter(f => f.id !== id);
    try {
      localStorage.setItem('cinelume_favs', JSON.stringify(favs));
    } catch {
      // ignore
    }
    set({ favorites: favs });
  },

  isFav: (id) => get().favorites.some(f => f.id === id),

  toggleWatchlist: (movie) => {
    const list = [...get().watchlist];
    const idx = list.findIndex(f => f.id === movie.id);
    const wasIn = idx > -1;
    if (wasIn) {
      list.splice(idx, 1);
    } else {
      list.push(movie);
    }
    try {
      localStorage.setItem('cinelume_watchlist', JSON.stringify(list));
    } catch {
      // ignore
    }
    set({ watchlist: list });
    toast.success(i18n.t(wasIn ? 'watchlist.removed' : 'watchlist.added', { title: movie.title }));
  },

  removeFromWatchlist: (id) => {
    const list = get().watchlist.filter(f => f.id !== id);
    try {
      localStorage.setItem('cinelume_watchlist', JSON.stringify(list));
    } catch {
      // ignore
    }
    set({ watchlist: list });
  },

  isInWatchlist: (id) => get().watchlist.some(f => f.id === id),

  createList: (name) => {
    const id = genId();
    const list: CustomList = { id, name: name.trim() || i18n.t('lists.defaultName'), films: [], createdAt: Date.now() };
    const next = [...get().customLists, list];
    persistCustomLists(next);
    set({ customLists: next });
    return id;
  },

  renameList: (id, name) => {
    const next = get().customLists.map(l => l.id === id ? { ...l, name: name.trim() || l.name } : l);
    persistCustomLists(next);
    set({ customLists: next });
  },

  deleteList: (id) => {
    const next = get().customLists.filter(l => l.id !== id);
    persistCustomLists(next);
    set({ customLists: next });
  },

  addFilmToList: (listId, film) => {
    const next = get().customLists.map(l => {
      if (l.id !== listId) return l;
      if (l.films.some(f => f.id === film.id)) return l;
      return { ...l, films: [...l.films, film] };
    });
    persistCustomLists(next);
    set({ customLists: next });
  },

  removeFilmFromList: (listId, filmId) => {
    const next = get().customLists.map(l => {
      if (l.id !== listId) return l;
      return { ...l, films: l.films.filter(f => f.id !== filmId) };
    });
    persistCustomLists(next);
    set({ customLists: next });
  },

  isFilmInList: (listId, filmId) => {
    const list = get().customLists.find(l => l.id === listId);
    return list ? list.films.some(f => f.id === filmId) : false;
  },

  openModal: (id) => set({ currentModalMovieId: id }),
  closeModal: () => set({ currentModalMovieId: null }),
  openFilters: () => set({ isFilterOpen: true }),
  closeFilters: () => set({ isFilterOpen: false }),
  openFavorites: () => set({ isFavOpen: true }),
  closeFavorites: () => set({ isFavOpen: false }),
  openWatchlist: () => set({ isWatchlistOpen: true }),
  closeWatchlist: () => set({ isWatchlistOpen: false }),
  openLists: () => set({ isListsOpen: true }),
  closeLists: () => set({ isListsOpen: false }),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),

  toggleBlindMode: () => {
    const next = !get().blindMode;
    try {
      localStorage.setItem('cinelume_blind_mode', next ? '1' : '0');
    } catch {
      // ignore
    }
    if (next) {
      document.documentElement.classList.add('blind-mode');
    } else {
      document.documentElement.classList.remove('blind-mode');
    }
    set({ blindMode: next });
  },

  setSortBy: (s) => {
    try {
      localStorage.setItem('cinelume_sort', s);
    } catch {
      // ignore
    }
    set({ sortBy: s });
  },

  setRuntimeMax: (n) => {
    try {
      if (n === null) localStorage.removeItem('cinelume_runtime_max');
      else localStorage.setItem('cinelume_runtime_max', String(n));
    } catch {
      // ignore
    }
    set({ runtimeMax: n });
  },
}));
