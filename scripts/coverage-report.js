#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

try {
  // Coverage is already printed by Vitest via the 'text' reporter
  // This script is a no-op since Vitest handles coverage reporting
  // (This file is kept for backwards compatibility with npm scripts)
  process.exit(0);
  
} catch (error) {
  console.error('Error reading coverage report:', error.message);
  process.exit(1);
}
