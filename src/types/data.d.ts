declare module '*/data' {
  export const places: any[];
  export const categories: string[];
  export function getPlaceById(id: string): any;
  export function filterPlacesByCategories(selected: string[]): any[];
  export function filterPlacesByProfile(selectedCategories: string[], profile: any | null): any[];
}

declare module '*/data/minigames' {
  export const minigames: any[];
}

declare module '../../data' {
  export const places: any[];
  export const categories: string[];
  export function getPlaceById(id: string): any;
  export function filterPlacesByCategories(selected: string[]): any[];
  export function filterPlacesByProfile(selectedCategories: string[], profile: any | null): any[];
}

declare module '../../data/minigames' {
  export const minigames: any[];
}

declare module '../data' {
  export const places: any[];
  export const categories: string[];
  export function getPlaceById(id: string): any;
  export function filterPlacesByCategories(selected: string[]): any[];
  export function filterPlacesByProfile(selectedCategories: string[], profile: any | null): any[];
}

declare module '../data/minigames' {
  export const minigames: any[];
}
