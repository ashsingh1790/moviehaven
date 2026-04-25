export type User = {
  id: string;
  clerkId: string;
  email: string;
  username: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type Rating = {
  id: number;
  userId: string;
  filmId: number;
  score: number;
  review: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type List = {
  id: number;
  userId: string;
  name: string;
  description: string | null;
  isWatchlist: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ListItem = {
  id: number;
  listId: number;
  filmId: number;
  position: number;
  note: string | null;
  addedAt: Date;
};
