import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Garden {
  id: string;
  name: string;
  description?: string;
  widthM: number;
  lengthM: number;
  gridResolutionM: number;
  createdAt: string;
  updatedAt: string;
  beds: GardenBed[];
  obstacles: Obstacle[];
}

export interface GardenBed {
  id: string;
  gardenId: string;
  name: string;
  xM: number;
  yM: number;
  widthM: number;
  lengthM: number;
  rotationDeg: number;
}

export interface Obstacle {
  id: string;
  gardenId: string;
  label: string;
  xM: number;
  yM: number;
  widthM: number;
  lengthM: number;
}

export type NutrientDemand = 'HEAVY' | 'MEDIUM' | 'LIGHT';

export interface Plant {
  id: string;
  name: string;
  botanicalName?: string;
  category: string;
  family?: string;
  seasons: string[];
  sunRequirement: string;
  waterRequirement: string;
  spacingCm: number;
  rowSpacingCm?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  nutrientDemand?: NutrientDemand;
  rotationYears?: number;
  daysToMaturity?: number;
  iconEmoji?: string;
  colorHex?: string;
}

export interface PlantingCell {
  id: string;
  plantingPlanId: string;
  plantId: string;
  col: number;
  row: number;
  plantedAt?: string;
  notes?: string;
  plant: Plant;
}

export interface PlantingZone {
  id: string;
  plantingPlanId: string;
  plantId: string;
  minCol: number;
  minRow: number;
  maxCol: number;
  maxRow: number;
  spacingFactor: number;
  plant: Plant;
}

export interface PlantingPlan {
  id: string;
  gardenBedId: string;
  year: number;
  cells: PlantingCell[];
  zones: PlantingZone[];
}

export type GardenRole = 'OWNER' | 'COLLABORATOR' | 'VIEWER';

export interface Membership {
  id: string;
  userId: string;
  email: string;
  name: string;
  pictureUrl?: string;
  role: GardenRole;
  createdAt: string;
  pending: boolean;
}

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  // Gardens
  getGardens() {
    return this.http.get<Garden[]>(`${API}/gardens`);
  }

  getGarden(id: string) {
    return this.http.get<Garden>(`${API}/gardens/${id}`);
  }

  createGarden(data: { name: string; description?: string; widthM: number; lengthM: number }) {
    return this.http.post<Garden>(`${API}/gardens`, data);
  }

  updateGarden(id: string, data: Partial<Pick<Garden, 'name' | 'description' | 'widthM' | 'lengthM'>>) {
    return this.http.patch<Garden>(`${API}/gardens/${id}`, data);
  }

  deleteGarden(id: string) {
    return this.http.delete(`${API}/gardens/${id}`);
  }

  // Beds
  getBeds(gardenId: string) {
    return this.http.get<GardenBed[]>(`${API}/gardens/${gardenId}/beds`);
  }

  createBed(gardenId: string, data: { name: string; xM: number; yM: number; widthM: number; lengthM: number }) {
    return this.http.post<GardenBed>(`${API}/gardens/${gardenId}/beds`, data);
  }

  updateBed(gardenId: string, id: string, data: Partial<GardenBed>) {
    return this.http.patch<GardenBed>(`${API}/gardens/${gardenId}/beds/${id}`, data);
  }

  deleteBed(gardenId: string, id: string) {
    return this.http.delete(`${API}/gardens/${gardenId}/beds/${id}`);
  }

  // Obstacles
  getObstacles(gardenId: string) {
    return this.http.get<Obstacle[]>(`${API}/gardens/${gardenId}/obstacles`);
  }

  createObstacle(gardenId: string, data: { label: string; xM: number; yM: number; widthM: number; lengthM: number }) {
    return this.http.post<Obstacle>(`${API}/gardens/${gardenId}/obstacles`, data);
  }

  updateObstacle(gardenId: string, id: string, data: Partial<Obstacle>) {
    return this.http.patch<Obstacle>(`${API}/gardens/${gardenId}/obstacles/${id}`, data);
  }

  deleteObstacle(gardenId: string, id: string) {
    return this.http.delete(`${API}/gardens/${gardenId}/obstacles/${id}`);
  }

  // Plants
  getPlants() {
    return this.http.get<Plant[]>(`${API}/plants`);
  }

  getPlant(id: string) {
    return this.http.get<Plant>(`${API}/plants/${id}`);
  }

  // Planting Plans
  getPlantingPlan(gardenId: string, bedId: string, year: number) {
    return this.http.get<PlantingPlan>(`${API}/gardens/${gardenId}/beds/${bedId}/plantings/${year}`);
  }

  addPlantingCell(gardenId: string, bedId: string, year: number, data: { plantId: string; col: number; row: number }) {
    return this.http.post<PlantingCell>(`${API}/gardens/${gardenId}/beds/${bedId}/plantings/${year}/cells`, data);
  }

  removePlantingCell(gardenId: string, bedId: string, year: number, cellId: string) {
    return this.http.delete(`${API}/gardens/${gardenId}/beds/${bedId}/plantings/${year}/cells/${cellId}`);
  }

  addPlantingZone(gardenId: string, bedId: string, year: number, data: { plantId: string; minCol: number; minRow: number; maxCol: number; maxRow: number; spacingFactor: number }) {
    return this.http.post<PlantingZone>(`${API}/gardens/${gardenId}/beds/${bedId}/plantings/${year}/zones`, data);
  }

  removePlantingZone(gardenId: string, bedId: string, year: number, zoneId: string) {
    return this.http.delete(`${API}/gardens/${gardenId}/beds/${bedId}/plantings/${year}/zones/${zoneId}`);
  }

  // Memberships
  getMemberships(gardenId: string) {
    return this.http.get<Membership[]>(`${API}/gardens/${gardenId}/memberships`);
  }

  inviteMember(gardenId: string, data: { email: string; role?: GardenRole }) {
    return this.http.post<Membership>(`${API}/gardens/${gardenId}/memberships`, data);
  }

  removeMember(gardenId: string, userId: string) {
    return this.http.delete(`${API}/gardens/${gardenId}/memberships/${userId}`);
  }
}
