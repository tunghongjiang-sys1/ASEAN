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
  food?: string;
  stay?: string;
  transport?: string;
  gettingAround?: string;
  costPerDay?: string;
  openingHours?: string;
  emergencyNumbers?: string;
  hospitals?: string;
  waterSource?: string;
  shops?: string;
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
  country?: string;
  city?: string;
  airport?: string;
};

export type NoteItem = {
  placeId: string;
  addedAt: string;
  body?: string;
  updatedAt?: string;
};

export type AttractionPreference = string;

export type TravellerProfile = {
  mode: 'solo' | 'group';
  groupSize?: number;
  hasElderly?: boolean;
  hasChildren?: boolean;
  specialNeeds?: string;
  transportPreference?: string;
  foodAllergies?: string;
  placeTypes?: string[];
};

export type PlaceReview = {
  author: string;
  source: 'google' | 'reddit' | 'curated';
  rating: number;
  text: string;
  date: string;
};

export type SeasonalFestival = {
  name: string;
  country: string;
  month: number;
  description: string;
  location: string;
};

export type ShopVoucher = {
  id: string;
  category: 'attraction' | 'food' | 'hotel' | 'transport' | 'ridehailing' | 'tour';
  title: string;
  description: string;
  points: number;
  country: string;
};

export type RedeemedVoucher = {
  voucherId: string;
  title: string;
  category: ShopVoucher['category'];
  pointsSpent: number;
  redeemedAt: string;
  code: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type PlaceInfo = {
  name: string;
  address: string;
  rating: number | null;
  userRatingsTotal: number | null;
  website: string | null;
  mapsUrl: string | null;
  photoUrl: string | null;
  lat: number | null;
  lng: number | null;
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
  price?: number | null;
  currency?: string | null;
};

export type FlightReply = {
  flights: FlightInfo[];
  live: boolean;
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
