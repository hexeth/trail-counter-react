#!/usr/bin/env node

/**
 * Cloudflare Workers Specific Security and Performance Testing
 * 
 * This script tests Cloudflare Workers specific concerns:
 * - Workers runtime limits (CPU time, memory usage)
 * - Durable Objects consistency and integrity
 * - Cache effectiveness and TTL validation
 * - Request handling with simulated network conditions
 */

import axios from 'axios';
import chalk from 'chalk';

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';
const TEST_TRAIL_ID = 'dccdd470-c5da-48c7-bde2-669a4bd1edc2';
const VALID_TOKEN = process.env.TEST_AUTH_TOKEN || '';

// Test results tracker
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

// Utility functions
async function logTest(testName, testFn) {
  try {
    console.log(chalk.blue(`\n🔍 Running: ${testName}`));
    await testFn();
    console.log(chalk.green(`✅ PASSED: ${testName}`));
    results.passed++;
    results.tests.push({ name: testName, status: 'passed' });
    return true;
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
    console.log(chalk.red(`❌ FAILED: ${testName}`));
    console.log(chalk.red(`   Error: ${errorMessage}`));
    if (error.response) {
      console.log(chalk.red(`   Status: ${error.response.status}`));
    }
    results.failed++;
    results.tests.push({ name: testName, status: 'failed', error: errorMessage });
    return false;
  }
}

// Test CPU-intensive operations (Workers have CPU time limits)
async function testCPUIntensiveOperations() {
  console.log(chalk.yellow('\n⚙️ Testing CPU-intensive Operations'));
  
  // Test statistics endpoint which processes many registrations
  await logTest('Statistics Endpoint Performance', async () => {
    const start = Date.now();
    const response = await axios.get(`${BASE_URL}/api/statistics`, {
      headers: VALID_TOKEN ? { Authorization: `Bearer ${VALID_TOKEN}` } : {},
      validateStatus: null
    });
    
    const duration = Date.now() - start;
    
    if (response.status !== 200 && response.status !== 401) {
      throw new Error(`Statistics endpoint returned unexpected status: ${response.status}`);
    }
    
    // Print the execution time as useful information
    console.log(chalk.blue(`   Statistics endpoint response time: ${duration}ms`));
    
    // If it takes too long, it might hit Workers CPU time limits in production
    if (duration > 5000 && response.status === 200) {
      console.log(chalk.yellow(`   ⚠️ Warning: Statistics endpoint took ${duration}ms to respond, which is close to Workers CPU time limits.`));
    }
  });
  
  // Test pagination with large datasets
  await logTest('Pagination with Large Datasets', async () => {
    // Request a large page size to test CPU and memory limits
    const response = await axios.get(`${BASE_URL}/api/statistics/registrations?limit=100`, {
      headers: VALID_TOKEN ? { Authorization: `Bearer ${VALID_TOKEN}` } : {},
      validateStatus: null
    });
    
    if (response.status !== 200 && response.status !== 401) {
      throw new Error(`Pagination endpoint returned unexpected status: ${response.status}`);
    }
    
    // If authenticated, check the response structure
    if (response.status === 200) {
      if (!response.data.pagination || !Array.isArray(response.data.data)) {
        throw new Error('Pagination response structure is invalid');
      }
      
      console.log(chalk.blue(`   Retrieved ${response.data.data.length} items out of ${response.data.pagination.totalItems} total`));
    }
  });
}

// Test Durable Objects consistency
async function testDurableObjectsConsistency() {
  console.log(chalk.yellow('\n💾 Testing Durable Objects Consistency'));
  
  if (!VALID_TOKEN) {
    console.log(chalk.yellow('⚠️ Skipping Durable Objects consistency tests - no auth token provided'));
    results.skipped += 3; // Adjust based on number of tests below
    return;
  }
  
  // Test creating and then immediately retrieving a trail
  await logTest('Trail Creation and Retrieval Consistency', async () => {
    // Create a new trail with a unique identifier in the name
    const uniqueId = Date.now().toString();
    const trailName = `Test Trail ${uniqueId}`;
    
    // Create the trail
    const createResponse = await axios.post(`${BASE_URL}/api/trails`, {
      name: trailName,
      location: 'Test Location',
      description: 'Created during Durable Objects consistency testing',
      active: true
    }, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` }
    });
    
    if (createResponse.status !== 200) {
      throw new Error(`Failed to create test trail: ${createResponse.status}`);
    }
    
    const newTrailId = createResponse.data.id;
    
    // Immediately try to retrieve it - testing Durable Object consistency
    const getResponse = await axios.get(`${BASE_URL}/api/trails/${newTrailId}`, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` }
    });
    
    if (getResponse.status !== 200) {
      throw new Error(`Failed to retrieve newly created trail: ${getResponse.status}`);
    }
    
    // Verify the data is consistent
    if (getResponse.data.name !== trailName) {
      throw new Error(`Data inconsistency: Expected name "${trailName}" but got "${getResponse.data.name}"`);
    }
    
    // Clean up - delete the test trail
    await axios.delete(`${BASE_URL}/api/trails/${newTrailId}`, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` }
    });
  });
  
  // Test cache invalidation after updates
  await logTest('Cache Invalidation after Updates', async () => {
    // Create a new trail
    const uniqueId = Date.now().toString();
    const trailName = `Cache Test Trail ${uniqueId}`;
    
    const createResponse = await axios.post(`${BASE_URL}/api/trails`, {
      name: trailName,
      location: 'Cache Test Location',
      active: true
    }, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` }
    });
    
    const newTrailId = createResponse.data.id;
    
    // Update the trail name
    const updatedName = `Updated ${trailName}`;
    await axios.put(`${BASE_URL}/api/trails/${newTrailId}`, {
      name: updatedName
    }, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` }
    });
    
    // Immediately retrieve it - should have the updated name if cache was properly invalidated
    const getResponse = await axios.get(`${BASE_URL}/api/trails/${newTrailId}`, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` }
    });
    
    if (getResponse.data.name !== updatedName) {
      throw new Error(`Cache invalidation failed: Expected updated name "${updatedName}" but got "${getResponse.data.name}"`);
    }
    
    // Clean up
    await axios.delete(`${BASE_URL}/api/trails/${newTrailId}`, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` }
    });
  });
  
  // Test concurrent modifications
  await logTest('Concurrent Modification Handling', async () => {
    // Create a new trail
    const uniqueId = Date.now().toString();
    const trailName = `Concurrency Test Trail ${uniqueId}`;
    
    const createResponse = await axios.post(`${BASE_URL}/api/trails`, {
      name: trailName,
      location: 'Concurrency Test Location',
      active: true
    }, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` }
    });
    
    const newTrailId = createResponse.data.id;
    
    try {
      // Send 5 concurrent update requests
      const concurrentPromises = [];
      for (let i = 1; i <= 5; i++) {
        concurrentPromises.push(
          axios.put(`${BASE_URL}/api/trails/${newTrailId}`, {
            name: `Concurrent Update ${i} - ${trailName}`
          }, {
            headers: { Authorization: `Bearer ${VALID_TOKEN}` }
          })
        );
      }
      
      // Wait for all concurrent updates to complete
      await Promise.all(concurrentPromises);
      
      // Verify the trail was updated and is in a consistent state
      const getResponse = await axios.get(`${BASE_URL}/api/trails/${newTrailId}`, {
        headers: { Authorization: `Bearer ${VALID_TOKEN}` }
      });
      
      if (!getResponse.data.name.includes('Concurrent Update')) {
        throw new Error(`Trail name wasn't updated by any concurrent request: ${getResponse.data.name}`);
      }
    } finally {
      // Clean up
      await axios.delete(`${BASE_URL}/api/trails/${newTrailId}`, {
        headers: { Authorization: `Bearer ${VALID_TOKEN}` }
      });
    }
  });
}

// Test Workers runtime limits
async function testWorkersLimits() {
  console.log(chalk.yellow('\n🚧 Testing Workers Runtime Limits'));
  
  // Test response streaming
  await logTest('Response Streaming with Large Data', async () => {
    // Request all trails to get a potentially large response
    const response = await axios.get(`${BASE_URL}/api/trails`, {
      headers: VALID_TOKEN ? { Authorization: `Bearer ${VALID_TOKEN}` } : {},
      timeout: 10000, // Set a longer timeout for this test
    });
    
    if (response.status !== 200 && response.status !== 401) {
      throw new Error(`Trails endpoint returned unexpected status: ${response.status}`);
    }
    
    // If authenticated, check that we got valid data back
    if (response.status === 200) {
      if (!Array.isArray(response.data)) {
        throw new Error('Expected array response from trails endpoint');
      }
      
      console.log(chalk.blue(`   Retrieved ${response.data.length} trails successfully`));
    }
  });
  
  // Test subrequest limits by requesting nested data
  await logTest('Nested Subrequests Handling', async () => {
    if (!VALID_TOKEN) {
      console.log(chalk.yellow('   ⚠️ Skipping nested subrequests test - no auth token provided'));
      return;
    }
    
    // Get statistics which requires many subrequests to Durable Objects
    const response = await axios.get(`${BASE_URL}/api/statistics`, {
      headers: { Authorization: `Bearer ${VALID_TOKEN}` }
    });
    
    if (!response.data.totalTrails && !response.data.totalRegistrations) {
      throw new Error('Statistics endpoint returned incomplete data');
    }
    
    console.log(chalk.blue(`   Statistics retrieved ${response.data.totalTrails} trails and ${response.data.totalRegistrations} registrations`));
  });
}

// Test cache headers and TTL values
async function testCacheConfiguration() {
  console.log(chalk.yellow('\n📦 Testing Cache Configuration'));
  
  // Test public endpoints for correct cache headers
  await logTest('Public Endpoint Cache Headers', async () => {
    const response = await axios.get(`${BASE_URL}/api/public/trails/${TEST_TRAIL_ID}`, {
      validateStatus: null
    });
    
    // Check for cache control headers
    const cacheControl = response.headers['cache-control'];
    if (!cacheControl) {
      console.log(chalk.yellow('   ⚠️ Warning: No Cache-Control header on public endpoint'));
    } else {
      console.log(chalk.blue(`   Cache-Control: ${cacheControl}`));
      
      // Public endpoints should have some form of caching strategy
      if (!cacheControl.includes('max-age') && !cacheControl.includes('s-maxage')) {
        console.log(chalk.yellow('   ⚠️ Warning: Cache-Control header doesn\'t specify TTL'));
      }
    }
  });
  
  // Test protected endpoints for no-cache headers
  await logTest('Protected Endpoint Cache Headers', async () => {
    const response = await axios.get(`${BASE_URL}/api/trails`, {
      headers: VALID_TOKEN ? { Authorization: `Bearer ${VALID_TOKEN}` } : {},
      validateStatus: null
    });
    
    // Check for cache control headers
    const cacheControl = response.headers['cache-control'];
    if (!cacheControl) {
      console.log(chalk.yellow('   ⚠️ Warning: No Cache-Control header on protected endpoint'));
    } else {
      console.log(chalk.blue(`   Cache-Control: ${cacheControl}`));
      
      // Protected endpoints should generally not be cached by CDNs
      if (!cacheControl.includes('private') && !cacheControl.includes('no-store')) {
        console.log(chalk.yellow('   ⚠️ Warning: Protected endpoints should use private or no-store cache settings'));
      }
    }
  });
}

// Test error handling and resilience
async function testErrorHandling() {
  console.log(chalk.yellow('\n🛡️ Testing Error Handling and Resilience'));
  
  // Test invalid IDs
  await logTest('Invalid ID Error Handling', async () => {
    const invalidIds = [
      'not-a-valid-uuid',
      '00000000-0000-0000-0000-000000000000',
      `${TEST_TRAIL_ID}invalid-suffix`,
      '<script>alert(1)</script>'
    ];
    
    for (const invalidId of invalidIds) {
      const response = await axios.get(`${BASE_URL}/api/public/trails/${invalidId}`, {
        validateStatus: null
      });
      
      if (response.status !== 404) {
        throw new Error(`Invalid ID ${invalidId} returned ${response.status} instead of 404`);
      }
    }
  });
  
  // Test malformed request bodies
  await logTest('Malformed Request Body Handling', async () => {
    const response = await axios.post(`${BASE_URL}/api/public/registrations`, 
      "This is not valid JSON",
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: null
      }
    );
    
    // Should return 400 Bad Request for malformed JSON
    if (response.status !== 400 && response.status !== 422) {
      throw new Error(`Malformed JSON body returned ${response.status} instead of 400/422`);
    }
  });
  
  // Test very large request bodies (Workers have limits)
  await logTest('Large Request Body Handling', async () => {
    // Generate a large request body (about 1MB)
    const largeString = 'X'.repeat(1000000);
    
    const response = await axios.post(`${BASE_URL}/api/public/registrations`, 
      {
        trailId: TEST_TRAIL_ID,
        riderName: 'Test Rider',
        horseCount: 2,
        notes: largeString // Very large notes field
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: null,
        timeout: 10000 // Longer timeout for this test
      }
    );
    
    // Should either succeed or fail with appropriate error (not crash or timeout)
    if (response.status !== 200 && response.status !== 413 && response.status !== 400) {
      throw new Error(`Large request body returned unexpected status: ${response.status}`);
    }
    
    console.log(chalk.blue(`   Large request body test returned status: ${response.status}`));
  });
}

// Run tests
async function runTests() {
  console.log(chalk.cyan('🚀 Cloudflare Workers-Specific Tests'));
  console.log(chalk.cyan('===================================================='));
  console.log(`🌐 Testing against: ${BASE_URL}`);
  
  const startTime = Date.now();
  
  try {
    await testCPUIntensiveOperations();
    await testDurableObjectsConsistency();
    await testWorkersLimits();
    await testCacheConfiguration();
    await testErrorHandling();
    
    // Print summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(chalk.cyan('\n===================================================='));
    console.log(chalk.cyan(`🔍 Test Summary (${duration}s):`));
    console.log(chalk.green(`✅ Passed: ${results.passed}`));
    console.log(chalk.red(`❌ Failed: ${results.failed}`));
    console.log(chalk.yellow(`⚠️ Skipped: ${results.skipped}`));
    
    if (results.failed > 0) {
      console.log(chalk.red('\n⚠️ CLOUDFLARE WORKERS ISSUES DETECTED ⚠️'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n✅ All Cloudflare Workers tests passed!'));
      process.exit(0);
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Testing error: ${error.message}`));
    process.exit(1);
  }
}

runTests();