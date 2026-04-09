export type PlantCategory =
  | 'vegetable'
  | 'fruit'
  | 'herb'
  | 'flower'
  | 'tree'
  | 'shrub';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type SunRequirement = 'full-sun' | 'partial-shade' | 'full-shade';

export type WaterRequirement = 'low' | 'medium' | 'high';

export interface Plant {
  id: string;
  name: string;
  scientificName?: string;
  category: PlantCategory;
  seasons: Season[];
  sunRequirement: SunRequirement;
  waterRequirement: WaterRequirement;
  spacingCm: number;
  daysToMaturity?: number;
  companionPlants?: string[];
  incompatiblePlants?: string[];
  notes?: string;
}

export interface GardenBed {
  id: string;
  name: string;
  widthM: number;
  lengthM: number;
  cells: GardenCell[][];
}

export interface GardenCell {
  row: number;
  col: number;
  plantId?: string;
  plantedAt?: string;
}

export interface Garden {
  id: string;
  name: string;
  userId: string;
  beds: GardenBed[];
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: string;
}

export interface CreateGardenDto {
  name: string;
  beds?: Omit<GardenBed, 'id'>[];
}

export interface UpdateGardenDto {
  name?: string;
  beds?: GardenBed[];
}

export interface CreatePlantDto {
  name: string;
  scientificName?: string;
  category: PlantCategory;
  seasons: Season[];
  sunRequirement: SunRequirement;
  waterRequirement: WaterRequirement;
  spacingCm: number;
  daysToMaturity?: number;
  companionPlants?: string[];
  incompatiblePlants?: string[];
  notes?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
