import { Route } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { GardenCreateComponent } from './garden-create/garden-create';
import { GardenLayoutComponent } from './garden-layout/garden-layout';
import { BedPlannerComponent } from './bed-planner/bed-planner';
import { PlantsComponent } from './plants/plants';

export const routes: Route[] = [
  { path: '', component: DashboardComponent },
  { path: 'gardens/new', component: GardenCreateComponent },
  { path: 'gardens/:id', component: GardenLayoutComponent },
  { path: 'gardens/:id/beds/:bedId', component: BedPlannerComponent },
  { path: 'plants', component: PlantsComponent },
];
