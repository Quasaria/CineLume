export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  original_language: string;
}

export interface MovieDetails extends Movie {
  runtime: number;
  status: string;
  budget: number;
  revenue: number;
  genres: Genre[];
  credits: {
    cast: CastMember[];
    crew: CrewMember[];
  };
  videos: {
    results: Video[];
  };
  release_dates?: {
    results: ReleaseDatesByCountry[];
  };
}

export interface ReleaseDatesByCountry {
  iso_3166_1: string;
  release_dates: ReleaseDateEntry[];
}

export interface ReleaseDateEntry {
  certification: string;
  release_date: string;
  type: number;
  note?: string;
}

export interface Genre {
  id: number;
  name: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
}

export interface Video {
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface Region {
  code: string;
  name: string;
  flag: string;
}

export interface FavoriteMovie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  // Optionnels : enrichissement pour permettre d'afficher plus d'info dans le
  // strip (synopsis, genres) sans re-fetcher TMDB. Les favoris existants
  // crees avant cette migration n'ont pas ces champs, l'UI s'adapte.
  overview?: string;
}

export type ViewMode = 'grid' | 'list';
