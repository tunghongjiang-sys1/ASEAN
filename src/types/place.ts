export type Place = {
  id: string;
  country: string;
  category: string;
  location: string;
  primaryActivities: string;
  howToGetThere: string;
  paymentMethods: string;
  visaEntry: string;
  cultureEtiquette: string;
  dressCode: string;
  accessNeeded: string;
  navigationTips: string;
  lat: number;
  lng: number;
  airport: string;
  image: string;
  amenities: string[];
  funFacts: string[];
};

export type UserLocation = {
  lat: number;
  lng: number;
  label: string;
};

export type NoteItem = {
  placeId: string;
  addedAt: string;
};

export type AttractionPreference = string;

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type FlightInfo = {
  flightNumber: string;
  airline: string;
  from: string;
  to: string;
  departure: string;
  arrival: string;
  status: string;
  terminal?: string;
};

export type MinigameType =
  | 'runner'
  | 'feed'
  | 'match'
  | 'log'
  | 'mix'
  | 'timer'
  | 'rotate'
  | 'explore'
  | 'stack'
  | 'swing'
  | 'navigate'
  | 'sequence'
  | 'build'
  | 'layout'
  | 'pattern'
  | 'glow'
  | 'cycle'
  | 'connect'
  | 'guide'
  | 'dive'
  | 'puzzle'
  | 'protect'
  | 'dance'
  | 'restore'
  | 'climb'
  | 'float'
  | 'assemble'
  | 'perform'
  | 'carve'
  | 'panorama'
  | 'erode'
  | 'jungle'
  | 'trade'
  | 'bridge'
  | 'boat'
  | 'rebuild'
  | 'tunnel'
  | 'terrace'
  | 'manage'
  | 'call'
  | 'fire'
  | 'nest'
  | 'lantern'
  | 'defend';

export type Minigame = {
  id: number;
  placeHints: string[];
  country: string;
  title: string;
  category: string;
  type: MinigameType;
  description: string;
  rules: string;
  facts: string[];
};
