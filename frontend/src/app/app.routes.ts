import { Route } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard';
import { GardenCreateComponent } from './garden-create/garden-create';
import { GardenLayoutComponent } from './garden-layout/garden-layout';
import { BedPlannerComponent } from './bed-planner/bed-planner';
import { PlantsComponent } from './plants/plants';
import { LoginComponent } from './login/login';
import { authGuard } from './services/auth.guard';

export const routes: Route[] = [
  { path: 'login', component: LoginComponent },
  { path: '', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'gardens/new', component: GardenCreateComponent, canActivate: [authGuard] },
  { path: 'gardens/:id', component: GardenLayoutComponent, canActivate: [authGuard] },
  { path: 'gardens/:id/beds/:bedId', component: BedPlannerComponent, canActivate: [authGuard] },
  { path: 'plants', component: PlantsComponent, canActivate: [authGuard] },
];
