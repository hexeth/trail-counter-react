/**
 * Script to generate synthetic trail registration data for testing
 * 
 * This script creates a year's worth of horse count data for all trails in the system.
 */

// Use node-fetch if needed (in Node.js environments before v18)
import nodeFetch from 'node-fetch';
import { createInterface } from 'readline';

// Configuration - Customize these values as needed
const CONFIG = {
  // API endpoint - default for local development server
  apiEndpoint: process.env.API_ENDPOINT || 'http://localhost:5173',
  
  // Authentication token - read from environment variable
  // Set this with: export TRAIL_AUTH_TOKEN=your_token_here
  authToken: process.env.TRAIL_AUTH_TOKEN || '',
  
  // Number of registrations to generate per trail
  registrationsPerTrail: 50,
  
  // Date range (past year from current date)
  startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
  endDate: new Date(),
  
  // Horse count range
  minHorseCount: 1,
  maxHorseCount: 5,
  
  // Default rider name (since it's required by the API)
  defaultRiderName: 'Test Rider',
  
  // Whether to show verbose logging
  verbose: false,
  
  // Delay between requests (ms) to prevent overwhelming the server
  requestDelay: 20,
  
  // Batch size - how many registrations to create before pausing to check token
  batchSize: 10,
  
  // Allow interactive token refresh
  allowTokenRefresh: true,
};

// Create readline interface for token refresh
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promise-based readline question
function question(query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// Check for auth token at startup
if (!CONFIG.authToken) {
  console.warn('\nWarning: No auth token found in environment variable TRAIL_AUTH_TOKEN');
  console.warn('Protected API endpoints will likely fail without authentication.');
  console.warn('Set the token with: export TRAIL_AUTH_TOKEN=your_token_here\n');
}

/**
 * Helper functions
 */
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Distribution of registrations by day of week (more on weekends)
const dayWeights = [
  1,    // Monday
  1,    // Tuesday
  1.2,  // Wednesday
  1.5,  // Thursday
  2,    // Friday
  3,    // Saturday
  2.5   // Sunday
];

// Generate dates with more registrations on weekends
function getWeightedRandomDate(start, end) {
  const randomDate = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  
  const dayOfWeek = randomDate.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weight = dayWeights[dayIndex];
  
  if (Math.random() <= weight / 3) {
    return randomDate;
  }
  
  return getWeightedRandomDate(start, end);
}

/**
 * Prompt for a new auth token interactively
 */
async function refreshAuthToken() {
  if (!CONFIG.allowTokenRefresh) {
    console.error('Token refresh is disabled. Script will exit.');
    process.exit(1);
  }
  
  console.log('\n===========================================================');
  console.log('⚠️  Your authentication token has expired.');
  console.log('Please get a new token from the admin UI at:');
  console.log(`${CONFIG.apiEndpoint}/admin/get-token`);
  console.log('===========================================================\n');
  
  const newToken = await question('Enter your new token: ');
  
  if (!newToken || newToken.trim() === '') {
    console.error('No token provided. Script will exit.');
    process.exit(1);
  }
  
  // Update the token in CONFIG
  CONFIG.authToken = newToken.trim();
  console.log('\nToken updated. Resuming operation...\n');
  
  return CONFIG.authToken;
}

/**
 * Create a single registration with required fields
 */
async function createSingleRegistration(trailId) {
  try {
    // Generate registration data with required fields
    const registrationData = {
      trailId,
      riderName: CONFIG.defaultRiderName, // Required by the API
      horseCount: getRandomInt(CONFIG.minHorseCount, CONFIG.maxHorseCount),
      timestamp: getWeightedRandomDate(CONFIG.startDate, CONFIG.endDate).toISOString()
    };
    
    // Prepare headers with authentication token if provided
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authentication token if configured
    if (CONFIG.authToken) {
      headers.Authorization = `Bearer ${CONFIG.authToken}`;
    }
    
    // Call the API to create the registration
    const fetch = globalThis.fetch || nodeFetch;
    const response = await fetch(`${CONFIG.apiEndpoint}/api/registrations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(registrationData)
    });
    
    // Check for token expiration (401 Unauthorized)
    if (response.status === 401) {
      // Try to refresh the token and retry the request
      await refreshAuthToken();
      return createSingleRegistration(trailId); // Retry with new token
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to create registration: ${errorText}`);
      return false;
    }
    
    const data = await response.json();
    
    if (CONFIG.verbose) {
      console.log(`Created registration: ${JSON.stringify(data)}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating registration:', error);
    return false;
  }
}

/**
 * Fetch trails with token refresh support
 */
async function fetchTrails() {
  try {
    // Prepare headers with authentication token if provided
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authentication token if configured
    if (CONFIG.authToken) {
      headers.Authorization = `Bearer ${CONFIG.authToken}`;
    }
    
    const fetch = globalThis.fetch || nodeFetch;
    const response = await fetch(`${CONFIG.apiEndpoint}/api/trails`, {
      headers
    });
    
    // Check for token expiration (401 Unauthorized)
    if (response.status === 401) {
      // Try to refresh the token and retry the request
      await refreshAuthToken();
      return fetchTrails(); // Retry with new token
    }
    
    if (!response.ok) {
      const statusCode = response.status;
      const errorText = await response.text();
      
      console.error(`Failed to fetch trails: ${errorText}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching trails:', error);
    return null;
  }
}

/**
 * Process a batch of registrations with token refresh capability
 */
async function processBatch(trail, startIndex, endIndex) {
  console.log(`Processing batch: ${startIndex}-${endIndex} for trail: ${trail.name}`);
  
  for (let i = startIndex; i < endIndex; i++) {
    // Check if we've reached the requested number of registrations
    if (i >= CONFIG.registrationsPerTrail) break;
    
    const success = await createSingleRegistration(trail.id);
    
    if (success) {
      // Small delay to prevent overwhelming the server
      await new Promise(resolve => setTimeout(resolve, CONFIG.requestDelay));
    }
  }
}

/**
 * Main function to generate test data
 */
async function generateTestData() {
  try {
    console.log('Fetching available trails...');
    
    const trails = await fetchTrails();
    
    if (!trails || !Array.isArray(trails) || trails.length === 0) {
      console.error('No trails found. Please create some trails first.');
      return;
    }
    
    console.log(`Found ${trails.length} trails. Generating ${CONFIG.registrationsPerTrail} registrations per trail...`);
    
    // Track success count
    let successCount = 0;
    let failCount = 0;
    
    // Create registrations for each trail
    for (const trail of trails) {
      console.log(`Generating registrations for trail: ${trail.name} (${trail.id})`);
      
      // Process in batches to check token validity periodically
      for (let batchStart = 0; batchStart < CONFIG.registrationsPerTrail; batchStart += CONFIG.batchSize) {
        const batchEnd = Math.min(batchStart + CONFIG.batchSize, CONFIG.registrationsPerTrail);
        
        // Process this batch
        await processBatch(trail, batchStart, batchEnd);
        
        // Update progress
        const currentRegistrationsCount = Math.min(batchEnd, CONFIG.registrationsPerTrail);
        console.log(`Progress for ${trail.name}: ${currentRegistrationsCount}/${CONFIG.registrationsPerTrail} registrations`);
      }
    }
    
    console.log(`\nCompleted! Created registrations for ${trails.length} trails`);
  } catch (error) {
    console.error('Error in generateTestData:', error);
  } finally {
    // Clean up readline interface
    rl.close();
  }
}

// Execute the main function
generateTestData().then(() => {
  console.log('Script execution finished.');
}).catch(error => {
  console.error('Unhandled error:', error);
}).finally(() => {
  // Ensure readline is closed
  rl.close();
});

/**
 * ==========================================================================
 * HOW TO USE THIS SCRIPT
 * ==========================================================================
 * 
 * This script generates synthetic trail registration data for testing purposes.
 * It creates a year's worth of registration data with random horse counts
 * for all trails in your system.
 * 
 * Steps to run:
 * 
 * 1. Make sure your development server is running (on port 5173 by default)
 * 2. Get an authentication token from your app at /admin/get-token
 * 3. Set the authentication token as an environment variable:
 *    
 *    export TRAIL_AUTH_TOKEN=your_token_here
 *    
 * 4. Run the script with Node.js:
 *    
 *    cd /home/matthewsorensen/trail-counter-react/my-react-router-app
 *    node scripts/generate-clean-data.js
 *    
 * Configuration options in the script:
 * 
 * - Change the 'registrationsPerTrail' value to generate more or fewer registrations
 * - Adjust 'minHorseCount' and 'maxHorseCount' to change the range of horses per registration
 * - Modify 'startDate' and 'endDate' to change the timespan of registrations
 * - Change API endpoint with the environment variable: export API_ENDPOINT=http://your-server
 * - Update 'defaultRiderName' if needed (required by the API)
 * - Set 'batchSize' to control how many registrations to create before checking token validity
 * 
 * If your token expires during execution:
 * 
 * The script will automatically pause and prompt you to enter a new token.
 * Simply go to /admin/get-token in your app, get a new token, and paste it
 * when prompted. The script will then continue where it left off.
 * 
 * The script automatically:
 * - Distributes registrations across the past year
 * - Creates more registrations on weekends than weekdays
 * - Varies horse counts randomly within your specified range
 * - Uses a default rider name instead of unique rider names
 * - Handles token expiration by prompting for a new token
 * 
 * Note: Although we wanted to exclude rider names completely, the API requires
 * this field. The script uses a generic value for all registrations.
 * ==========================================================================
 */