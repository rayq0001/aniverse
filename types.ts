
export type Language = 'ar' | 'en';

export interface Manhwa {
  id: string;
  title: string;
  titleEn?: string; // English Title
  originalTitle?: string;
  description: string;
  descriptionEn?: string; // English Description
  author: string;
  artist: string;
  rating: number;
  status: 'ongoing' | 'completed' | 'hiatus';
  genres: string[];
  coverImage: string;
  bannerImage: string;
  chapters: Chapter[];
  releaseDate: string;
  updateDay?: number; // 0-6 (Sunday-Saturday)
  publisher?: string;
  releaseSchedule?: string[]; // e.g. ['mon', 'thu']
  staffIds?: string[]; // user IDs of assigned staff
  staffName?: string;
  anilistId?: number;
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  releaseDate: string;
  pages: string[];
}

export interface Comment {
  id: string;
  manhwaId: string;
  userId?: string; // ID of the user who commented
  userName: string;
  userAvatar?: string;
  text: string;
  timestamp: number;
  likes: number;
  dislikes: number;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  type: 'like' | 'dislike' | 'reply';
  fromUserName: string;
  fromUserAvatar?: string;
  manhwaId: string;
  manhwaTitle: string;
  commentId: string;
  timestamp: number;
  read: boolean;
}

export interface User {
  name: string;
  email: string;
  provider?: string;
  avatar?: string;
}

export enum Genre {
  Action = 'أكشن',
  Fantasy = 'فانتازيا',
  Romance = 'رومانسي',
  Comedy = 'كوميدي',
  Drama = 'دراما',
  Isekai = 'إيسيكاي',
  Adventure = 'مغامرة',
  MartialArts = 'فنون قتالية',
  Magic = 'سحر'
}

// Helper to map genres to English
export const GenreEn: Record<string, string> = {
  'أكشن': 'Action',
  'فانتازيا': 'Fantasy',
  'رومانسي': 'Romance',
  'كوميدي': 'Comedy',
  'دراما': 'Drama',
  'إيسيكاي': 'Isekai',
  'مغامرة': 'Adventure',
  'فنون قتالية': 'Martial Arts',
  'سحر': 'Magic'
};
