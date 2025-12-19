import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Card Type -->
    <div *ngIf="type === 'card'" class="w-full space-y-4">
      <div 
        *ngFor="let i of getCountArray()" 
        class="prayer-card bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700"
        style="min-height: 200px"
      >
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <div class="flex-1">
            <div class="skeleton h-6 w-3/4 mb-2"></div>
            <div class="skeleton h-4 w-1/2"></div>
          </div>
          <div class="skeleton h-8 w-24 rounded-full"></div>
        </div>
        
        <!-- Content -->
        <div class="space-y-2 mb-4">
          <div class="skeleton h-4 w-full"></div>
          <div class="skeleton h-4 w-5/6"></div>
          <div class="skeleton h-4 w-4/6"></div>
        </div>
        
        <!-- Footer -->
        <div class="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="skeleton h-4 w-32"></div>
        </div>
      </div>
    </div>

    <!-- List Type -->
    <div *ngIf="type === 'list'" class="w-full space-y-3">
      <div *ngFor="let i of getCountArray()" class="skeleton h-16 w-full"></div>
    </div>

    <!-- Header Type -->
    <div *ngIf="type === 'header'" class="w-full mb-6">
      <div class="skeleton h-8 w-64 mb-2"></div>
      <div class="skeleton h-4 w-96"></div>
    </div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(
        90deg,
        rgb(229, 231, 235) 25%,
        rgb(243, 244, 246) 50%,
        rgb(229, 231, 235) 75%
      );
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      border-radius: 0.375rem;
    }

    :host-context(.dark) .skeleton {
      background: linear-gradient(
        90deg,
        rgb(55, 65, 81) 25%,
        rgb(75, 85, 99) 50%,
        rgb(55, 65, 81) 75%
      );
      background-size: 200% 100%;
    }

    @keyframes loading {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
  `]
})
export class SkeletonLoaderComponent {
  @Input() count = 3;
  @Input() type: 'card' | 'list' | 'header' = 'card';

  getCountArray(): number[] {
    return Array.from({ length: this.count }, (_, i) => i);
  }
}
