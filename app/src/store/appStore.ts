import { create } from 'zustand';
import { toast } from 'sonner';
import type { FavoriteMovie, ViewMode, CustomList, SeenMovie } from '@/types/movie';
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
  previousFilmId: number | null;  // pour le bouton 'retour au film' depuis la vue personne
  favorites: FavoriteMovie[];
  watchlist: FavoriteMovie[];
  seen: SeenMovie[];
  customLists: CustomList[];
  blindMode: boolean;
  sortBy: 'popularity' | 'date' | 'rating';
  runtimeMax: number | null;  // minutes, null = no filter
  // Heures de calme pour les notifications : pas de notif entre ces heures.
  // null = pas de plage active. Format minute-of-day (0-1439).
  notifQuietFrom: number | null;
  notifQuietTo: number | null;
  currentModalMovieId: number | null;
  isFilterOpen: boolean;
  isFavOpen: boolean;
  collectionsTab: 'favorites' | 'watchlist' | 'seen';
  isListsOpen: boolean;
  isSettingsOpen: boolean;
  isPickerOpen: boolean;
  isSwipeOpen: boolean;
  isWatchHistoryOpen: boolean;
  isYearCalendarOpen: boolean;

  toggleTheme: () => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (q: string) => void;
  setDate: (year: number, month: number, week: number) => void;
  setRegion: (region: string) => void;
  setGenre: (genre: string) => void;
  setReleaseMode: (mode: ReleaseMode) => void;
  setProvider: (provider: string) => void;
  setSelectedPerson: (person: SelectedPerson | null) => void;
  openPersonFromFilm: (person: SelectedPerson, fromFilmId: number) => void;
  goBackToFilm: () => void;
  jumpToToday: () => void;
  toggleFav: (movie: FavoriteMovie) => void;
  removeFav: (id: number) => void;
  isFav: (id: number) => boolean;
  toggleWatchlist: (movie: FavoriteMovie, opts?: { silent?: boolean }) => void;
  removeFromWatchlist: (id: number) => void;
  isInWatchlist: (id: number) => boolean;
  markAsSeen: (movie: FavoriteMovie) => void;
  unmarkAsSeen: (id: number) => void;
  isSeen: (id: number) => boolean;
  createList: (name: string) => string;
  renameList: (id: string, name: string) => void;
  setListEmoji: (id: string, emoji: string | undefined) => void;
  reorderFilmInList: (listId: string, filmId: number, newIndex: number) => void;
  setListFilms: (listId: string, films: FavoriteMovie[]) => void;
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
  setCollectionsTab: (tab: 'favorites' | 'watchlist' | 'seen') => void;
  openSeen: () => void;
  openLists: () => void;
  closeLists: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openPicker: () => void;
  closePicker: () => void;
  openSwipe: () => void;
  closeSwipe: () => void;
  openWatchHistory: () => void;
  closeWatchHistory: () => void;
  openYearCalendar: () => void;
  closeYearCalendar: () => void;
  toggleBlindMode: () => void;
  setSortBy: (s: 'popularity' | 'date' | 'rating') => void;
  setRuntimeMax: (n: number | null) => void;
  setNotifQuiet: (from: number | null, to: number | null) => void;
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

// Pose le meta theme-color initial selon la preference user persistee.
// Les meta media queries dans index.html suivent les prefs OS, mais si
// l'user a override dans Settings, il faut que la status bar le suive aussi.
(function applyInitialThemeColor() {
  const color = isDark ? '#050508' : '#fafafa';
  let m = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
  if (!m) {
    m = document.createElement('meta');
    m.name = 'theme-color';
    document.head.appendChild(m);
  }
  m.content = color;
})();

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

function safeParseSeen(): SeenMovie[] {
  try {
    const raw = localStorage.getItem('cinelume_seen');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m): m is SeenMovie =>
      typeof m === 'object' && m !== null
      && typeof (m as SeenMovie).id === 'number'
      && typeof (m as SeenMovie).title === 'string'
      && typeof (m as SeenMovie).watchedAt === 'number',
    );
  } catch {
    return [];
  }
}

function isValidFilm(f: unknown): f is FavoriteMovie {
  return typeof f === 'object' && f !== null
    && typeof (f as FavoriteMovie).id === 'number'
    && typeof (f as FavoriteMovie).title === 'string';
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
      l.films.every(isValidFilm) &&
      typeof l.createdAt === 'number' &&
      // emoji optionnel mais si present doit etre une string courte
      (l.emoji === undefined || (typeof l.emoji === 'string' && l.emoji.length <= 8)),
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
  previousFilmId: null,
  favorites: safeParseFavs(),
  watchlist: safeParseWatchlist(),
  seen: safeParseSeen(),
  customLists: safeParseCustomLists(),
  blindMode: savedBlindMode,
  sortBy: (localStorage.getItem('cinelume_sort') as 'popularity' | 'date' | 'rating') || 'popularity',
  runtimeMax: (() => {
    const raw = localStorage.getItem('cinelume_runtime_max');
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  })(),
  notifQuietFrom: (() => {
    const raw = localStorage.getItem('cinelume_notif_quiet_from');
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 && n < 1440 ? n : null;
  })(),
  notifQuietTo: (() => {
    const raw = localStorage.getItem('cinelume_notif_quiet_to');
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 && n < 1440 ? n : null;
  })(),
  currentModalMovieId: null,
  isFilterOpen: false,
  isFavOpen: false,
  collectionsTab: 'favorites',
  isListsOpen: false,
  isSettingsOpen: false,
  isPickerOpen: false,
  isSwipeOpen: false,
  isWatchHistoryOpen: false,
  isYearCalendarOpen: false,

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
    // Met a jour le meta theme-color pour que la status bar Android
    // matche le nouveau theme. Sans ca, le toggle dans l'app changeait
    // le bg mais la status bar gardait l'ancienne couleur (issue des
    // meta media queries qui ne suivent que la pref OS, pas l'override
    // user dans l'app).
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    const color = newDark ? '#050508' : '#fafafa';
    if (themeMeta) {
      themeMeta.setAttribute('content', color);
    } else {
      const m = document.createElement('meta');
      m.name = 'theme-color';
      m.content = color;
      document.head.appendChild(m);
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

  // setSelectedPerson est le 'reset' explicite : pas de previousFilmId, le
  // bouton retour de PersonHeader retombe juste sur la grille. Seule
  // openPersonFromFilm initialise previousFilmId, ce qui garantit l'invariant
  // 'previousFilmId != null implique qu'on est venu d'une modale film'.
  setSelectedPerson: (person) => {
    set({ selectedPerson: person, searchQuery: '', previousFilmId: null });
  },

  // Appele depuis la modale film quand l'user clique sur un acteur du cast :
  // on memorise le film d'origine pour pouvoir y revenir via le bouton 'retour'.
  openPersonFromFilm: (person, fromFilmId) => {
    set({
      selectedPerson: person,
      searchQuery: '',
      previousFilmId: fromFilmId,
      currentModalMovieId: null,
    });
  },

  goBackToFilm: () => {
    const filmId = get().previousFilmId;
    set({ selectedPerson: null, previousFilmId: null });
    if (filmId !== null) {
      set({ currentModalMovieId: filmId });
    }
  },

  jumpToToday: () => {
    // "Aujourd'hui" : on retombe sur les vraies sorties du jour. Reset aussi
    // la recherche, le mode filmographie ET le previousFilmId sinon le bouton
    // ne fait rien de visible quand l'utilisateur etait dans un de ces modes,
    // et un previousFilmId stale ferait reapparaitre une vieille modale plus
    // tard via goBackToFilm.
    const ctx = getCurrentCinemaContext(get().selRegion);
    set({
      selYear: ctx.year,
      selMonth: ctx.month,
      selWeek: ctx.week,
      searchQuery: '',
      selectedPerson: null,
      previousFilmId: null,
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

  toggleWatchlist: (movie, opts) => {
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
    // opts.silent : utilise par SwipeMode ou la carte qui disparait est
    // deja un feedback visuel, le toast est redondant et couvrait les
    // boutons d'action en bas.
    if (!opts?.silent) {
      toast.success(i18n.t(wasIn ? 'watchlist.removed' : 'watchlist.added', { title: movie.title }));
    }
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

  // Marquer un film comme vu : l'ajoute a la liste 'seen' avec timestamp,
  // et le retire de la watchlist (puisque l'user l'a regarde, plus
  // d'interet pour le 'a voir'). Garde les favoris inchanges (favoris
  // = films aimes, concept distinct de 'vu').
  markAsSeen: (movie) => {
    const state = get();
    if (state.seen.some(s => s.id === movie.id)) return; // deja vu
    const seenMovie: SeenMovie = { ...movie, watchedAt: Date.now() };
    const newSeen = [...state.seen, seenMovie];
    const newWatchlist = state.watchlist.filter(f => f.id !== movie.id);
    try {
      localStorage.setItem('cinelume_seen', JSON.stringify(newSeen));
      localStorage.setItem('cinelume_watchlist', JSON.stringify(newWatchlist));
    } catch {
      // quota plein, on ignore
    }
    set({ seen: newSeen, watchlist: newWatchlist });
    toast.success(i18n.t('seen.added', { title: movie.title }));
  },

  unmarkAsSeen: (id) => {
    const target = get().seen.find(f => f.id === id);
    const newSeen = get().seen.filter(f => f.id !== id);
    try {
      localStorage.setItem('cinelume_seen', JSON.stringify(newSeen));
    } catch {
      // ignore
    }
    set({ seen: newSeen });
    if (target) {
      toast.success(i18n.t('seen.removed', { title: target.title }));
    }
  },

  isSeen: (id) => get().seen.some(f => f.id === id),

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

  setListEmoji: (id, emoji) => {
    const next = get().customLists.map(l => l.id === id ? { ...l, emoji } : l);
    persistCustomLists(next);
    set({ customLists: next });
  },

  reorderFilmInList: (listId, filmId, newIndex) => {
    const next = get().customLists.map(l => {
      if (l.id !== listId) return l;
      const films = [...l.films];
      const idx = films.findIndex(f => f.id === filmId);
      if (idx < 0) return l;
      const [item] = films.splice(idx, 1);
      const insertAt = Math.max(0, Math.min(newIndex, films.length));
      films.splice(insertAt, 0, item);
      return { ...l, films };
    });
    persistCustomLists(next);
    set({ customLists: next });
  },

  // Remplace l'array films d'une liste en un seul shot. Necessaire pour
  // les reorders multiples : appeler reorderFilmInList en boucle ne
  // converge pas pour les reordonnements complexes (ex: inverser l'ordre
  // de [A,B,C,D,E]), car chaque appel mute l'etat et fausse les indices
  // pour les iterations suivantes.
  setListFilms: (listId, films) => {
    const next = get().customLists.map(l => l.id === listId ? { ...l, films: [...films] } : l);
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
  // Favoris + Watchlist sont maintenant deux onglets d'une meme modale
  // 'Collections'. On garde 4 actions distinctes pour rester compatible
  // avec les call sites existants, mais elles ouvrent toutes la meme modale
  // en choisissant le bon onglet.
  openFavorites: () => set({ isFavOpen: true, collectionsTab: 'favorites' }),
  closeFavorites: () => set({ isFavOpen: false }),
  openWatchlist: () => set({ isFavOpen: true, collectionsTab: 'watchlist' }),
  closeWatchlist: () => set({ isFavOpen: false }),
  openSeen: () => set({ isFavOpen: true, collectionsTab: 'seen' }),
  setCollectionsTab: (tab) => set({ collectionsTab: tab }),
  openLists: () => set({ isListsOpen: true }),
  closeLists: () => set({ isListsOpen: false }),
  openSettings: () => set({ isSettingsOpen: true }),
  closeSettings: () => set({ isSettingsOpen: false }),
  openPicker: () => set({ isPickerOpen: true }),
  closePicker: () => set({ isPickerOpen: false }),
  openSwipe: () => set({ isSwipeOpen: true }),
  closeSwipe: () => set({ isSwipeOpen: false }),
  openWatchHistory: () => set({ isWatchHistoryOpen: true }),
  closeWatchHistory: () => set({ isWatchHistoryOpen: false }),
  openYearCalendar: () => set({ isYearCalendarOpen: true }),
  closeYearCalendar: () => set({ isYearCalendarOpen: false }),

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

  setNotifQuiet: (from, to) => {
    try {
      if (from === null) localStorage.removeItem('cinelume_notif_quiet_from');
      else localStorage.setItem('cinelume_notif_quiet_from', String(from));
      if (to === null) localStorage.removeItem('cinelume_notif_quiet_to');
      else localStorage.setItem('cinelume_notif_quiet_to', String(to));
    } catch {
      // ignore
    }
    set({ notifQuietFrom: from, notifQuietTo: to });
  },
}));
