import { describe, it, expect } from 'vitest';
import { routes } from './app.routes';

describe('AppRoutes', () => {
  it('should have routes defined', () => {
    expect(routes).toBeDefined();
    expect(Array.isArray(routes)).toBe(true);
  });

  it('should have a root route', () => {
    const rootRoute = routes.find(r => r.path === '');
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.loadComponent).toBeDefined();
  });

  it('should have a login route', () => {
    const loginRoute = routes.find(r => r.path === 'login');
    expect(loginRoute).toBeDefined();
    expect(loginRoute?.loadComponent).toBeDefined();
  });

  it('should have an admin route', () => {
    const adminRoute = routes.find(r => r.path === 'admin');
    expect(adminRoute).toBeDefined();
    expect(adminRoute?.loadComponent).toBeDefined();
  });

  it('should have a presentation route', () => {
    const presentationRoute = routes.find(r => r.path === 'presentation');
    expect(presentationRoute).toBeDefined();
    expect(presentationRoute?.loadComponent).toBeDefined();
  });

  it('should have a wildcard redirect route', () => {
    const wildcardRoute = routes.find(r => r.path === '**');
    expect(wildcardRoute).toBeDefined();
    expect(wildcardRoute?.redirectTo).toBe('');
  });

  it('should protect root route with siteAuthGuard', () => {
    const rootRoute = routes.find(r => r.path === '');
    expect(rootRoute?.canActivate).toBeDefined();
    expect(rootRoute?.canActivate?.length).toBeGreaterThan(0);
  });

  it('should protect admin route with guards', () => {
    const adminRoute = routes.find(r => r.path === 'admin');
    expect(adminRoute?.canActivate).toBeDefined();
    expect(adminRoute?.canActivate?.length).toBeGreaterThan(0);
  });

  it('should protect presentation route with siteAuthGuard', () => {
    const presentationRoute = routes.find(r => r.path === 'presentation');
    expect(presentationRoute?.canActivate).toBeDefined();
    expect(presentationRoute?.canActivate?.length).toBeGreaterThan(0);
  });

  it('should not protect login route', () => {
    const loginRoute = routes.find(r => r.path === 'login');
    expect(loginRoute?.canActivate).toBeUndefined();
  });

  it('should lazy load home component', () => {
    const rootRoute = routes.find(r => r.path === '');
    expect(rootRoute?.loadComponent).toBeInstanceOf(Function);
  });

  it('should lazy load login component', () => {
    const loginRoute = routes.find(r => r.path === 'login');
    expect(loginRoute?.loadComponent).toBeInstanceOf(Function);
  });

  it('should lazy load admin component', () => {
    const adminRoute = routes.find(r => r.path === 'admin');
    expect(adminRoute?.loadComponent).toBeInstanceOf(Function);
  });

  it('should lazy load presentation component', () => {
    const presentationRoute = routes.find(r => r.path === 'presentation');
    expect(presentationRoute?.loadComponent).toBeInstanceOf(Function);
  });

  it('should have all essential routes', () => {
    // Verify that all essential routes exist without hard-coding the count
    const essentialPaths = ['', 'login', 'admin', 'presentation', '**'];
    const routePaths = routes.map(r => r.path);
    
    essentialPaths.forEach(path => {
      expect(routePaths).toContain(path);
    });
  });

  it('should have admin route with preload hint', () => {
    const adminRoute = routes.find(r => r.path === 'admin');
    expect(adminRoute?.data).toBeDefined();
    expect(adminRoute?.data?.preload).toBe(true);
  });

  it('should have presentation route with no preload', () => {
    const presentationRoute = routes.find(r => r.path === 'presentation');
    expect(presentationRoute?.data).toBeDefined();
    expect(presentationRoute?.data?.preload).toBe(false);
  });
});
