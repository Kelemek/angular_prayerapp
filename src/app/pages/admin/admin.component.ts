import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <div class="w-full max-w-6xl mx-auto px-4 py-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
          <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Admin Portal
          </h2>
          <p class="text-gray-600 dark:text-gray-400">
            Admin features are being migrated to Angular.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AdminComponent {
}
