/**
 * Prayer Management Module
 * 
 * This module structure is prepared for future modularization of admin portal sections.
 * Currently, the admin component is kept as a single lazy-loaded unit for simplicity.
 * 
 * Future Enhancement: Can be activated to split admin into child routes:
 * - Prayer approval and management
 * - Lazy loads only when admin accesses this section
 * - Further reduces initial bundle size
 */

import { Routes } from '@angular/router';

export const PRAYER_MANAGEMENT_ROUTES: Routes = [];

