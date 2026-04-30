import type { Movie, MovieDetails, Genre } from '@/types/movie';

const DEFAULT_KEY = '81f09aab8379105c078d67759877bc0b';
const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/w500';
export const BACK = 'https://image.tmdb.org/t/p/w1280';
export const PROF = 'https://image.tmdb.org/t/p/w185';
export const TMDB_SITE = 'https://www.themoviedb.org/movie';

function getApiKey(): string {
  return localStorage.getItem('tmdb_key') || DEFAULT_KEY;
}

export interface DiscoverParams {
  region?: string;
  genre?: string;
  startDate: string;
  endDate: string;
  page: number;
}

export async function discoverMovies(params: DiscoverParams): Promise<{ results: Movie[]; total_pages: number; total_results: number }> {
  const apiKey = getApiKey();
  const regionQ = params.region ? `&region=${params.region}` : '';
  const genreQ = params.genre ? `&with_genres=${params.genre}` : '';
  const url = `${BASE}/discover/movie?api_key=${apiKey}&language=fr-FR${regionQ}${genreQ}&primary_release_date.gte=${params.startDate}&primary_release_date.lte=${params.endDate}&with_release_type=2|3&sort_by=popularity.desc&page=${params.page}`;

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

  const url = `${BASE}/movie/${id}?api_key=${apiKey}&language=fr-FR&append_to_response=credits,videos`;
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
