
export enum BusinessType {
  CAFE = 'CAFE',
  SALON = 'SALON',
  RESTAURANT = 'RESTAURANT'
}

export enum Tone {
  EMOTIONAL = 'EMOTIONAL',
  CASUAL = 'CASUAL',
  PROFESSIONAL = 'PROFESSIONAL'
}

export enum Purpose {
  VISIT = 'VISIT',
  RESERVATION = 'RESERVATION',
  NEW_MENU = 'NEW_MENU',
  EVENT = 'EVENT'
}

export interface GeneratedPost {
  id: string;
  caption: string;
  hashtags: string[];
  storyPhrases: string[];
  engagementQuestion: string;
  createdAt: number;
  businessType: BusinessType;
}

export interface User {
  isLoggedIn: boolean;
  plan: 'Free' | 'Basic';
  remainingCredits: number;
}
