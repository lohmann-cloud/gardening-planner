import { Route } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { GardenCreateComponent } from './garden-create/garden-create';
import { GardenLayoutComponent } from './garden-layout/garden-layout';

export const appRoutes: Route[] = [
  { path: '', component: DashboardComponent },
  { path: 'gardens/new', component: GardenCreateComponent },
  { path: 'gardens/:id', component: GardenLayoutComponent },
];
