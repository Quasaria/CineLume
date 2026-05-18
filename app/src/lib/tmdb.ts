import type { Movie, MovieDetails, Genre } from '@/types/movie';

const ENV_KEY = import.meta.env.VITE_TMDB_KEY as string | undefined;
const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/w500';
export const BACK = 'https://image.tmdb.org/t/p/w1280';
export const PROF = 'https://image.tmdb.org/t/p/w185';
export const TMDB_SITE = 'https://www.themoviedb.org/movie';

function getApiKey(): string {
  return localStorage.getItem('tmdb_key') || ENV_KEY || '';
}

export interface DiscoverParams {
  region?: string;
  genre?: string;
  startDate: string;
  endDate: string;
  page: number;
  releaseMode?: 'theater' | 'platform' | 'all';
  provider?: string;
}

export interface Provider {
  id: string;
  name: string;
  color: string;
}

export const PROVIDERS: Provider[] = [
  { id: '8', name: 'Netflix', color: '#e50914' },
  { id: '119', name: 'Prime Video', color: '#00a8e1' },
  { id: '337', name: 'Disney+', color: '#0e47a1' },
  { id: '350', name: 'Apple TV+', color: '#a1a1a1' },
  { id: '1899', name: 'Max', color: '#002be7' },
  { id: '531', name: 'Paramount+', color: '#0064ff' },
  { id: '381', name: 'Canal+', color: '#000000' },
];

export async function discoverMovies(params: DiscoverParams): Promise<{ results: Movie[]; total_pages: number; total_results: number }> {
  const apiKey = getApiKey();
  const region = params.region || 'FR';
  const mode = params.releaseMode || 'theater';
  const genreQ = params.genre ? `&with_genres=${params.genre}` : '';

  let releaseTypeQ = '';
  let providerQ = '';
  if (mode === 'theater') {
    releaseTypeQ = '&with_release_type=1|2|3';
  } else if (mode === 'platform') {
    releaseTypeQ = '&with_release_type=4|6';
    if (params.provider) {
      providerQ = `&with_watch_providers=${params.provider}&watch_region=${region}`;
    }
  }

  const url = `${BASE}/discover/movie?api_key=${apiKey}&language=fr-FR&region=${region}${genreQ}${releaseTypeQ}${providerQ}&release_date.gte=${params.startDate}&release_date.lte=${params.endDate}&sort_by=popularity.desc&page=${params.page}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur de connexion TMDB');
  return res.json();
}

export async function searchMovies(query: string, page: number): Promise<{ results: Movie[]; total_pages: number; total_results: number }> {
  const apiKey = getApiKey();
  const url = `${BASE}/search/movie?api_key=${apiKey}&language=fr-FR&query=${encodeURIComponent(query)}&page=${page}&include_adult=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur de recherche TMDB');
  return res.json();
}

export async function getMovieDetails(id: number): Promise<MovieDetails> {
  const apiKey = getApiKey();
  const cacheKey = `md_${id}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.exp > Date.now()) return parsed.data;
    } catch {}
  }

  const url = `${BASE}/movie/${id}?api_key=${apiKey}&language=fr-FR&append_to_response=credits,videos,release_dates`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur de chargement des détails');
  const data = await res.json();
  
  localStorage.setItem(cacheKey, JSON.stringify({ data, exp: Date.now() + 1800000 }));
  return data;
}

export async function getGenres(): Promise<Genre[]> {
  const apiKey = getApiKey();
  const cacheKey = 'genres_cache';
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed.exp > Date.now()) return parsed.data;
    } catch {}
  }

  const url = `${BASE}/genre/movie/list?api_key=${apiKey}&language=fr-FR`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur de chargement des genres');
  const data = await res.json();
  
  localStorage.setItem(cacheKey, JSON.stringify({ data: data.genres, exp: Date.now() + 86400000 }));
  return data.genres;
}
