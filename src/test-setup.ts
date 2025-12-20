import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Mock environment variables
globalThis.ngDevMode = true;

// Initialize TestBed with necessary modules
TestBed.initTestEnvironment(
  [NoopAnimationsModule],
  undefined,
  {
    teardown: { destroyAfterEach: true }
  }
);



