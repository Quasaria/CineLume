import { create } from 'zustand';
import { toast } from 'sonner';
import type { FavoriteMovie, ViewMode } from '@/types/movie';
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
  currentModalMovieId: number | null;
  isFilterOpen: boolean;
  isFavOpen: boolean;
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
  openModal: (id: number) => void;
  closeModal: () => void;
  openFilters: () => void;
  closeFilters: () => void;
  openFavorites: () => void;
  closeFavorites: () => void;
  openSettings: () => void;
  closeSettings: () => void;
}

const savedTheme = localStorage.getItem('cinelume_theme');
const isDark = savedTheme ? savedTheme === 'dark' : true;

if (isDark) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
  document.documentElement.classList.add('light');
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

function safeParseFavs(): FavoriteMovie[] {
  try {
    const raw = localStorage.getItem('cinelume_favs');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  isDark,
  viewMode: 'grid',
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
  currentModalMovieId: null,
  isFilterOpen: false,
  isFavOpen: false,
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

  setViewMode: (mode) => set({ viewMode: mode }),
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
    const ctx = getCurrentCinemaContext(get().selRegion);
    set({ selYear: ctx.year, selMonth: ctx.month, selWeek: ctx.week });
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

  openModal: (id) => set({ currentModalMovieId: id }),
  closeModal: () => set({ currentModalMovieId: null }),
  openFilters: () => set({ isFilterOpen: true }),
  closeFilters: () => set({ isFilterOpen: false }),
  openFavorites: () => set({ isFavOpen: true }),
  closeFavorites: () => set({ isFavOpen: false }),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
}));
