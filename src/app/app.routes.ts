import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { siteAuthGuard } from './guards/site-auth.guard';
import { churchMemberGuard } from './guards/church-member.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    canActivate: [siteAuthGuard]
  },
  {
    path: 'info',
    loadComponent: () => import('./pages/info/info.component').then(m => m.InfoComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [siteAuthGuard, adminGuard],
    data: { preload: true } // Hint for preloading strategy if implemented
  },
  {
    path: 'presentation',
    loadComponent: () => import('./pages/presentation/presentation.component').then(m => m.PresentationComponent),
    canActivate: [siteAuthGuard, churchMemberGuard],
    data: { preload: false }
  },
  {
    path: 'privacy',
    loadComponent: () => import('./pages/privacy/privacy.component').then(m => m.PrivacyComponent)
  },
  {
    path: 'support',
    loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

// Configure router to scroll to top on navigation and disable scroll position restoration
export const routerConfig = {
  scrollPositionRestoration: 'top' as const,
  scrollOffset: [0, 0] as [number, number]
};
