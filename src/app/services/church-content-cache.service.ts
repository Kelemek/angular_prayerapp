import { Injectable } from '@angular/core';
import { CacheService } from './cache.service';
import { clearChurchContentStorage } from '../lib/church-content-cache';

@Injectable({ providedIn: 'root' })
export class ChurchContentCacheService {
  private readonly memoryClearers: Array<() => void> = [];

  constructor(private readonly cache: CacheService) {}

  registerMemoryClearer(clear: () => void): void {
    this.memoryClearers.push(clear);
  }

  clear(): void {
    clearChurchContentStorage(this.cache);
    for (const clear of this.memoryClearers) {
      clear();
    }
  }
}
