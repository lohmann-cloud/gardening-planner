import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

const API = 'http://localhost:3000/api';

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

  createGarden(data: {
    name: string;
    description?: string;
    widthM: number;
    lengthM: number;
  }) {
    return this.http.post<Garden>(`${API}/gardens`, data);
  }

  updateGarden(
    id: string,
    data: Partial<Pick<Garden, 'name' | 'description' | 'widthM' | 'lengthM'>>
  ) {
    return this.http.patch<Garden>(`${API}/gardens/${id}`, data);
  }

  deleteGarden(id: string) {
    return this.http.delete(`${API}/gardens/${id}`);
  }

  // Beds
  getBeds(gardenId: string) {
    return this.http.get<GardenBed[]>(`${API}/gardens/${gardenId}/beds`);
  }

  createBed(
    gardenId: string,
    data: {
      name: string;
      xM: number;
      yM: number;
      widthM: number;
      lengthM: number;
    }
  ) {
    return this.http.post<GardenBed>(`${API}/gardens/${gardenId}/beds`, data);
  }

  updateBed(gardenId: string, id: string, data: Partial<GardenBed>) {
    return this.http.patch<GardenBed>(
      `${API}/gardens/${gardenId}/beds/${id}`,
      data
    );
  }

  deleteBed(gardenId: string, id: string) {
    return this.http.delete(`${API}/gardens/${gardenId}/beds/${id}`);
  }

  // Obstacles
  getObstacles(gardenId: string) {
    return this.http.get<Obstacle[]>(`${API}/gardens/${gardenId}/obstacles`);
  }

  createObstacle(
    gardenId: string,
    data: {
      label: string;
      xM: number;
      yM: number;
      widthM: number;
      lengthM: number;
    }
  ) {
    return this.http.post<Obstacle>(
      `${API}/gardens/${gardenId}/obstacles`,
      data
    );
  }

  updateObstacle(gardenId: string, id: string, data: Partial<Obstacle>) {
    return this.http.patch<Obstacle>(
      `${API}/gardens/${gardenId}/obstacles/${id}`,
      data
    );
  }

  deleteObstacle(gardenId: string, id: string) {
    return this.http.delete(`${API}/gardens/${gardenId}/obstacles/${id}`);
  }
}
