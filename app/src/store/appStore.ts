import { create } from 'zustand';
import type { FavoriteMovie, ViewMode } from '@/types/movie';
import { getCurrentCinemaContext } from '@/lib/cinema-week';

export type ReleaseMode = 'theater' | 'platform' | 'all';

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
const savedReleaseMode = (localStorage.getItem('cinelume_releasemode') as ReleaseMode) || 'all';

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
  favorites: JSON.parse(localStorage.getItem('cinelume_favs') || '[]'),
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
  setSearchQuery: (q) => {
    const ctx = getCurrentCinemaContext(get().selRegion);
    set({ searchQuery: q, selYear: ctx.year, selMonth: ctx.month, selWeek: ctx.week });
  },

  setDate: (year, month, week) => {
    set({ selYear: year, selMonth: month, selWeek: week });
  },

  setRegion: (region) => {
    localStorage.setItem('cinelume_region', region);
    set({ selRegion: region });
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

  jumpToToday: () => {
    const ctx = getCurrentCinemaContext(get().selRegion);
    set({ selYear: ctx.year, selMonth: ctx.month, selWeek: ctx.week });
  },

  toggleFav: (movie) => {
    const favs = [...get().favorites];
    const idx = favs.findIndex(f => f.id === movie.id);
    if (idx > -1) {
      favs.splice(idx, 1);
    } else {
      favs.push(movie);
    }
    localStorage.setItem('cinelume_favs', JSON.stringify(favs));
    set({ favorites: favs });
  },

  removeFav: (id) => {
    const favs = get().favorites.filter(f => f.id !== id);
    localStorage.setItem('cinelume_favs', JSON.stringify(favs));
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
