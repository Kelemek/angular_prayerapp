import { describe, it, expect } from 'vitest';
import { bundleAnalysis } from './bundle-analysis';

describe('bundle-analysis', () => {
  describe('getCurrentOptimizations', () => {
    it('should return optimization categories', () => {
      const result = bundleAnalysis.getCurrentOptimizations();

      expect(result).toHaveProperty('implemented');
      expect(result).toHaveProperty('inProgress');
      expect(result).toHaveProperty('recommended');
    });

    it('should return implemented optimizations as array', () => {
      const result = bundleAnalysis.getCurrentOptimizations();

      expect(Array.isArray(result.implemented)).toBe(true);
      expect(result.implemented.length).toBeGreaterThan(0);
    });

    it('should include lazy loading in implemented optimizations', () => {
      const result = bundleAnalysis.getCurrentOptimizations();

      expect(result.implemented).toContain('Lazy loading for admin portal routes');
      expect(result.implemented).toContain('Lazy loading for main application routes');
    });

    it('should include tree-shaking in implemented optimizations', () => {
      const result = bundleAnalysis.getCurrentOptimizations();

      expect(result.implemented).toContain('Tree-shaking enabled in production build');
    });

    it('should return inProgress optimizations as array', () => {
      const result = bundleAnalysis.getCurrentOptimizations();

      expect(Array.isArray(result.inProgress)).toBe(true);
      expect(result.inProgress.length).toBeGreaterThan(0);
    });

    it('should include image optimization in inProgress', () => {
      const result = bundleAnalysis.getCurrentOptimizations();

      expect(result.inProgress).toContain('Image optimization and compression');
    });

    it('should return recommended optimizations as array', () => {
      const result = bundleAnalysis.getCurrentOptimizations();

      expect(Array.isArray(result.recommended)).toBe(true);
      expect(result.recommended.length).toBeGreaterThan(0);
    });

    it('should include service worker in recommended optimizations', () => {
      const result = bundleAnalysis.getCurrentOptimizations();

      expect(result.recommended).toContain('Service Worker caching strategy');
    });
  });

  describe('analyzeServiceSizes', () => {
    it('should return service size information as object', () => {
      const result = bundleAnalysis.analyzeServiceSizes();

      expect(typeof result).toBe('object');
      expect(Object.keys(result).length).toBeGreaterThan(0);
    });

    it('should include admin-data.service information', () => {
      const result = bundleAnalysis.analyzeServiceSizes();

      expect(result).toHaveProperty('admin-data.service');
      expect(result['admin-data.service']).toHaveProperty('size');
      expect(result['admin-data.service']).toHaveProperty('imports');
    });

    it('should include prayer.service information', () => {
      const result = bundleAnalysis.analyzeServiceSizes();

      expect(result).toHaveProperty('prayer.service');
      expect(result['prayer.service'].size).toBe(12000);
    });

    it('should include supabase.service information', () => {
      const result = bundleAnalysis.analyzeServiceSizes();

      expect(result).toHaveProperty('supabase.service');
      expect(Array.isArray(result['supabase.service'].imports)).toBe(true);
    });

    it('should include analytics.service information', () => {
      const result = bundleAnalysis.analyzeServiceSizes();

      expect(result).toHaveProperty('analytics.service');
    });

    it('should include email-notification.service information', () => {
      const result = bundleAnalysis.analyzeServiceSizes();

      expect(result).toHaveProperty('email-notification.service');
    });

    it('should include prompt.service information', () => {
      const result = bundleAnalysis.analyzeServiceSizes();

      expect(result).toHaveProperty('prompt.service');
    });

    it('should return valid size numbers for all services', () => {
      const result = bundleAnalysis.analyzeServiceSizes();

      Object.values(result).forEach(service => {
        expect(typeof service.size).toBe('number');
        expect(service.size).toBeGreaterThan(0);
      });
    });

    it('should return valid imports arrays for all services', () => {
      const result = bundleAnalysis.analyzeServiceSizes();

      Object.values(result).forEach(service => {
        expect(Array.isArray(service.imports)).toBe(true);
        expect(service.imports.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getTreeShakingOpportunities', () => {
    it('should return array of opportunities', () => {
      const result = bundleAnalysis.getTreeShakingOpportunities();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return opportunities with required properties', () => {
      const result = bundleAnalysis.getTreeShakingOpportunities();

      result.forEach(opportunity => {
        expect(opportunity).toHaveProperty('category');
        expect(opportunity).toHaveProperty('opportunity');
        expect(opportunity).toHaveProperty('estimatedSavings');
      });
    });

    it('should include RxJS operators opportunity', () => {
      const result = bundleAnalysis.getTreeShakingOpportunities();

      const rxjsOpportunity = result.find(o => o.category === 'Imports');
      expect(rxjsOpportunity).toBeDefined();
      expect(rxjsOpportunity!.opportunity).toContain('RxJS');
    });

    it('should include lodash opportunity', () => {
      const result = bundleAnalysis.getTreeShakingOpportunities();

      const lodashOpportunity = result.find(o => o.category === 'Lodash');
      expect(lodashOpportunity).toBeDefined();
    });

    it('should include polyfills opportunity', () => {
      const result = bundleAnalysis.getTreeShakingOpportunities();

      const polyfillsOpportunity = result.find(o => o.category === 'Polyfills');
      expect(polyfillsOpportunity).toBeDefined();
    });

    it('should include components opportunity', () => {
      const result = bundleAnalysis.getTreeShakingOpportunities();

      const componentsOpportunity = result.find(o => o.category === 'Components');
      expect(componentsOpportunity).toBeDefined();
    });

    it('should have estimated savings for all opportunities', () => {
      const result = bundleAnalysis.getTreeShakingOpportunities();

      result.forEach(opportunity => {
        expect(opportunity.estimatedSavings).toBeTruthy();
        expect(typeof opportunity.estimatedSavings).toBe('string');
      });
    });
  });

  describe('getPerformanceBudget', () => {
    it('should return array of metrics', () => {
      const result = bundleAnalysis.getPerformanceBudget();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return metrics with required properties', () => {
      const result = bundleAnalysis.getPerformanceBudget();

      result.forEach(metric => {
        expect(metric).toHaveProperty('metric');
        expect(metric).toHaveProperty('current');
        expect(metric).toHaveProperty('target');
        expect(metric).toHaveProperty('priority');
      });
    });

    it('should include initial bundle metric', () => {
      const result = bundleAnalysis.getPerformanceBudget();

      const initialBundle = result.find(m => m.metric === 'Initial Bundle (gzipped)');
      expect(initialBundle).toBeDefined();
      expect(initialBundle!.priority).toBe('high');
    });

    it('should include vendor bundle metric', () => {
      const result = bundleAnalysis.getPerformanceBudget();

      const vendorBundle = result.find(m => m.metric === 'Vendor Bundle (gzipped)');
      expect(vendorBundle).toBeDefined();
    });

    it('should include time to interactive metric', () => {
      const result = bundleAnalysis.getPerformanceBudget();

      const tti = result.find(m => m.metric === 'Time to Interactive');
      expect(tti).toBeDefined();
    });

    it('should include FCP metric', () => {
      const result = bundleAnalysis.getPerformanceBudget();

      const fcp = result.find(m => m.metric === 'First Contentful Paint');
      expect(fcp).toBeDefined();
      expect(fcp!.priority).toBe('critical');
    });

    it('should include LCP metric', () => {
      const result = bundleAnalysis.getPerformanceBudget();

      const lcp = result.find(m => m.metric === 'Largest Contentful Paint');
      expect(lcp).toBeDefined();
      expect(lcp!.priority).toBe('critical');
    });

    it('should have valid priority values', () => {
      const result = bundleAnalysis.getPerformanceBudget();

      result.forEach(metric => {
        expect(['critical', 'high', 'medium']).toContain(metric.priority);
      });
    });
  });

  describe('getOptimizationRoadmap', () => {
    it('should return array of phases', () => {
      const result = bundleAnalysis.getOptimizationRoadmap();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return phases with required properties', () => {
      const result = bundleAnalysis.getOptimizationRoadmap();

      result.forEach(phase => {
        expect(phase).toHaveProperty('phase');
        expect(phase).toHaveProperty('tasks');
        expect(Array.isArray(phase.tasks)).toBe(true);
      });
    });

    it('should include Phase 1: Lazy Loading', () => {
      const result = bundleAnalysis.getOptimizationRoadmap();

      const phase1 = result.find(p => p.phase.includes('Phase 1'));
      expect(phase1).toBeDefined();
      expect(phase1!.phase).toContain('COMPLETED');
    });

    it('should include Phase 2: Image Optimization', () => {
      const result = bundleAnalysis.getOptimizationRoadmap();

      const phase2 = result.find(p => p.phase.includes('Phase 2'));
      expect(phase2).toBeDefined();
      expect(phase2!.phase).toContain('IN PROGRESS');
    });

    it('should include Phase 3: Caching Strategy', () => {
      const result = bundleAnalysis.getOptimizationRoadmap();

      const phase3 = result.find(p => p.phase.includes('Phase 3'));
      expect(phase3).toBeDefined();
    });

    it('should include Phase 4: Code Splitting', () => {
      const result = bundleAnalysis.getOptimizationRoadmap();

      const phase4 = result.find(p => p.phase.includes('Phase 4'));
      expect(phase4).toBeDefined();
      expect(phase4!.phase).toContain('RECOMMENDED');
    });

    it('should include Phase 5: Service Worker', () => {
      const result = bundleAnalysis.getOptimizationRoadmap();

      const phase5 = result.find(p => p.phase.includes('Phase 5'));
      expect(phase5).toBeDefined();
      expect(phase5!.phase).toContain('OPTIONAL');
    });

    it('should have tasks with required properties', () => {
      const result = bundleAnalysis.getOptimizationRoadmap();

      result.forEach(phase => {
        phase.tasks.forEach(task => {
          expect(task).toHaveProperty('task');
          expect(task).toHaveProperty('estimatedSavings');
          expect(task).toHaveProperty('effort');
          expect(task).toHaveProperty('impact');
        });
      });
    });

    it('should have non-empty tasks for each phase', () => {
      const result = bundleAnalysis.getOptimizationRoadmap();

      result.forEach(phase => {
        expect(phase.tasks.length).toBeGreaterThan(0);
      });
    });
  });

  describe('getMemoryOptimizations', () => {
    it('should return array of optimizations', () => {
      const result = bundleAnalysis.getMemoryOptimizations();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return optimizations with required properties', () => {
      const result = bundleAnalysis.getMemoryOptimizations();

      result.forEach(optimization => {
        expect(optimization).toHaveProperty('area');
        expect(optimization).toHaveProperty('issue');
        expect(optimization).toHaveProperty('solution');
        expect(optimization).toHaveProperty('estimatedSavings');
      });
    });

    it('should include component lifecycle optimization', () => {
      const result = bundleAnalysis.getMemoryOptimizations();

      const lifecycle = result.find(o => o.area === 'Component Lifecycle');
      expect(lifecycle).toBeDefined();
      expect(lifecycle!.issue).toContain('memory leaks');
    });

    it('should include change detection optimization', () => {
      const result = bundleAnalysis.getMemoryOptimizations();

      const changeDetection = result.find(o => o.area === 'Change Detection');
      expect(changeDetection).toBeDefined();
      expect(changeDetection!.solution).toContain('OnPush');
    });

    it('should include service instances optimization', () => {
      const result = bundleAnalysis.getMemoryOptimizations();

      const services = result.find(o => o.area === 'Service Instances');
      expect(services).toBeDefined();
    });

    it('should include DOM size optimization', () => {
      const result = bundleAnalysis.getMemoryOptimizations();

      const dom = result.find(o => o.area === 'DOM Size');
      expect(dom).toBeDefined();
      expect(dom!.solution).toContain('virtual scrolling');
    });

    it('should include cache size optimization', () => {
      const result = bundleAnalysis.getMemoryOptimizations();

      const cache = result.find(o => o.area === 'Cache Size');
      expect(cache).toBeDefined();
    });
  });

  describe('getLoadTimeBenchmarks', () => {
    it('should return array of benchmarks', () => {
      const result = bundleAnalysis.getLoadTimeBenchmarks();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return benchmarks with required properties', () => {
      const result = bundleAnalysis.getLoadTimeBenchmarks();

      result.forEach(benchmark => {
        expect(benchmark).toHaveProperty('metric');
        expect(benchmark).toHaveProperty('baseline');
        expect(benchmark).toHaveProperty('target');
        expect(benchmark).toHaveProperty('tools');
        expect(Array.isArray(benchmark.tools)).toBe(true);
      });
    });

    it('should include FCP benchmark', () => {
      const result = bundleAnalysis.getLoadTimeBenchmarks();

      const fcp = result.find(b => b.metric === 'First Contentful Paint (FCP)');
      expect(fcp).toBeDefined();
      expect(fcp!.tools).toContain('Chrome DevTools');
    });

    it('should include LCP benchmark', () => {
      const result = bundleAnalysis.getLoadTimeBenchmarks();

      const lcp = result.find(b => b.metric === 'Largest Contentful Paint (LCP)');
      expect(lcp).toBeDefined();
    });

    it('should include CLS benchmark', () => {
      const result = bundleAnalysis.getLoadTimeBenchmarks();

      const cls = result.find(b => b.metric === 'Cumulative Layout Shift (CLS)');
      expect(cls).toBeDefined();
    });

    it('should include TTI benchmark', () => {
      const result = bundleAnalysis.getLoadTimeBenchmarks();

      const tti = result.find(b => b.metric === 'Time to Interactive (TTI)');
      expect(tti).toBeDefined();
    });

    it('should include FID benchmark', () => {
      const result = bundleAnalysis.getLoadTimeBenchmarks();

      const fid = result.find(b => b.metric === 'First Input Delay (FID)');
      expect(fid).toBeDefined();
    });

    it('should include API response time benchmark', () => {
      const result = bundleAnalysis.getLoadTimeBenchmarks();

      const apiResponse = result.find(b => b.metric === 'API Response Time');
      expect(apiResponse).toBeDefined();
    });

    it('should have non-empty tools array for each benchmark', () => {
      const result = bundleAnalysis.getLoadTimeBenchmarks();

      result.forEach(benchmark => {
        expect(benchmark.tools.length).toBeGreaterThan(0);
      });
    });
  });
});
