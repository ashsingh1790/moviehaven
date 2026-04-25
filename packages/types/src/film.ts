export type Genre = {
  id: number;
  name: string;
};

export type Country = {
  iso_3166_1: string;
  name: string;
};

export type Language = {
  iso_639_1: string;
  name: string;
};

export type FilmStatus =
  | "Released"
  | "Post Production"
  | "In Production"
  | "Planned"
  | "Rumored"
  | "Cancelled";

export type Film = {
  id: number;
  tmdbId: number;
  title: string;
  originalTitle: string;
  overview: string | null;
  tagline: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  releaseYear: number | null;
  runtime: number | null;
  budget: number;
  revenue: number;
  status: FilmStatus;
  tmdbScore: number;
  tmdbVoteCount: number;
  popularity: number;
  adult: boolean;
  genres: Genre[];
  originCountries: string[];
  spokenLanguages: Language[];
  directors: string[];
  cast: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type FilmCard = {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear: number | null;
  tmdbScore: number;
  originCountries: string[];
  genres: Genre[];
  userRating?: number | null;
  streamingPlatforms?: string[];
};
