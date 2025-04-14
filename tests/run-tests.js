#!/usr/bin/env node

/**
 * Test runner script that loads environment variables from .env.test
 * before running tests
 */

import { config } from 'dotenv';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables from .env.test
const envPath = join(rootDir, '.env.test');
if (existsSync(envPath)) {
  console.log(`Loading test environment from ${envPath}`);
  config({ path: envPath });
} else {
  console.warn(`No .env.test file found at ${envPath}`);
  console.warn('Using default test configuration');
}

// Get the test to run from command line arguments
const args = process.argv.slice(2);
const testScript = args[0] || 'all';

// Map of test script names to file paths
const testScripts = {
  'api': 'tests/security/api-pentesting.js',
  'web': 'tests/security/web-pentesting.js',
  'workers': 'tests/security/workers-specific-tests.js',
  'all': null // Special case to run all tests
};

// Function to run a test script
function runTest(scriptPath) {
  console.log(`Running test: ${scriptPath}`);
  const result = spawnSync('node', [scriptPath], {
    stdio: 'inherit',
    env: process.env
  });
  return result.status === 0;
}

// Run the specified test(s)
if (testScript === 'all') {
  console.log('Running all tests...');
  const apiResult = runTest(join(rootDir, testScripts.api));
  const webResult = runTest(join(rootDir, testScripts.web));
  const workersResult = runTest(join(rootDir, testScripts.workers));
  
  if (!apiResult || !webResult || !workersResult) {
    process.exit(1);
  }
} else if (testScripts[testScript]) {
  const success = runTest(join(rootDir, testScripts[testScript]));
  if (!success) {
    process.exit(1);
  }
} else {
  console.error(`Unknown test script: ${testScript}`);
  console.error(`Available test scripts: ${Object.keys(testScripts).join(', ')}`);
  process.exit(1);
}