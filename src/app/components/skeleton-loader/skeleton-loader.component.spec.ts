import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { SkeletonLoaderComponent } from './skeleton-loader.component';

describe('SkeletonLoaderComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(SkeletonLoaderComponent, {
      componentProperties: {
        count: 3,
        type: 'card'
      }
    });
    
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('default properties', () => {
    it('should have default count of 3', async () => {
      const { fixture } = await render(SkeletonLoaderComponent);
      
      expect(fixture.componentInstance.count).toBe(3);
    });

    it('should have default type of card', async () => {
      const { fixture } = await render(SkeletonLoaderComponent);
      
      expect(fixture.componentInstance.type).toBe('card');
    });
  });

  describe('getCountArray', () => {
    it('should return an array of length equal to count', async () => {
      const { fixture } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          count: 5
        }
      });
      
      const result = fixture.componentInstance.getCountArray();
      expect(result).toHaveLength(5);
      expect(result).toEqual([0, 1, 2, 3, 4]);
    });

    it('should return an empty array when count is 0', async () => {
      const { fixture } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          count: 0
        }
      });
      
      const result = fixture.componentInstance.getCountArray();
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should return a single element array when count is 1', async () => {
      const { fixture } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          count: 1
        }
      });
      
      const result = fixture.componentInstance.getCountArray();
      expect(result).toHaveLength(1);
      expect(result).toEqual([0]);
    });
  });

  describe('card type rendering', () => {
    it('should render card type with default count', async () => {
      const { container } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'card',
          count: 3
        }
      });
      
      const cards = container.querySelectorAll('.prayer-card');
      expect(cards).toHaveLength(3);
    });

    it('should render card type with custom count', async () => {
      const { container } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'card',
          count: 5
        }
      });
      
      const cards = container.querySelectorAll('.prayer-card');
      expect(cards).toHaveLength(5);
    });

    it('should render card with skeleton elements', async () => {
      const { container } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'card',
          count: 1
        }
      });
      
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('list type rendering', () => {
    it('should render list type with default count', async () => {
      const { container } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'list',
          count: 3
        }
      });
      
      const listItems = container.querySelectorAll('.skeleton.h-16');
      expect(listItems).toHaveLength(3);
    });

    it('should render list type with custom count', async () => {
      const { container } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'list',
          count: 7
        }
      });
      
      const listItems = container.querySelectorAll('.skeleton.h-16');
      expect(listItems).toHaveLength(7);
    });

    it('should not render card elements when type is list', async () => {
      const { container } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'list',
          count: 3
        }
      });
      
      const cards = container.querySelectorAll('.prayer-card');
      expect(cards).toHaveLength(0);
    });
  });

  describe('header type rendering', () => {
    it('should render header type', async () => {
      const { container } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'header',
          count: 1
        }
      });
      
      const skeletons = container.querySelectorAll('.skeleton');
      expect(skeletons.length).toBeGreaterThanOrEqual(2);
    });

    it('should render header with h-8 and h-4 skeleton elements', async () => {
      const { container } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'header',
          count: 1
        }
      });
      
      const h8Skeleton = container.querySelector('.skeleton.h-8');
      const h4Skeleton = container.querySelector('.skeleton.h-4');
      
      expect(h8Skeleton).toBeTruthy();
      expect(h4Skeleton).toBeTruthy();
    });

    it('should not render card or list elements when type is header', async () => {
      const { container } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'header',
          count: 1
        }
      });
      
      const cards = container.querySelectorAll('.prayer-card');
      const listItems = container.querySelectorAll('.skeleton.h-16');
      
      expect(cards).toHaveLength(0);
      expect(listItems).toHaveLength(0);
    });
  });

  describe('input property bindings', () => {
    it('should accept and use count input', async () => {
      const { fixture } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          count: 10
        }
      });
      
      expect(fixture.componentInstance.count).toBe(10);
    });

    it('should accept and use type input', async () => {
      const { fixture } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'list'
        }
      });
      
      expect(fixture.componentInstance.type).toBe('list');
    });

    it('should update when count changes', async () => {
      const { fixture, rerender } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          count: 3
        }
      });
      
      expect(fixture.componentInstance.count).toBe(3);
      
      await rerender({
        componentProperties: {
          count: 5
        }
      });
      
      expect(fixture.componentInstance.count).toBe(5);
    });

    it('should update when type changes', async () => {
      const { fixture, rerender } = await render(SkeletonLoaderComponent, {
        componentProperties: {
          type: 'card'
        }
      });
      
      expect(fixture.componentInstance.type).toBe('card');
      
      await rerender({
        componentProperties: {
          type: 'list'
        }
      });
      
      expect(fixture.componentInstance.type).toBe('list');
    });
  });
});
