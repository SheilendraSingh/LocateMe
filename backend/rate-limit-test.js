#!/usr/bin/env node

/**
 * Rate Limiting Test Script
 * Makes multiple requests from the same IP to test rate limiting
 */

import fetch from "node-fetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Test endpoint - using a simple GET request that should be rate limited
const TEST_ENDPOINT = `${API_URL}/auth/tracking-status`;

async function makeRequest(attemptNumber) {
  try {
    console.log(`📤 Making request #${attemptNumber}...`);

    const response = await fetch(TEST_ENDPOINT, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add a fake Authorization header to simulate authenticated requests
        Authorization: "Bearer test-token",
      },
    });

    const data = await response.json();

    if (response.status === 429) {
      console.log(`🚫 Request #${attemptNumber} - RATE LIMITED!`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${data.message}`);
      console.log(`   Retry After: ${data.retryAfter} seconds`);
      if (data.clientIP) {
        console.log(`   Client IP: ${data.clientIP}`);
      }
      return false; // Rate limited
    } else if (response.ok) {
      console.log(`✅ Request #${attemptNumber} - SUCCESS`);
      console.log(`   Status: ${response.status}`);
      return true; // Success
    } else {
      console.log(`⚠️  Request #${attemptNumber} - ERROR`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${data.message || "Unknown error"}`);
      return true; // Continue trying
    }
  } catch (error) {
    console.log(`❌ Request #${attemptNumber} - NETWORK ERROR`);
    console.log(`   Error: ${error.message}`);
    return true; // Continue trying
  }
}

async function testRateLimiting(maxRequests = 20, delayMs = 100) {
  console.log("🚀 Starting Rate Limiting Test");
  console.log(`📊 Target: ${TEST_ENDPOINT}`);
  console.log(`🔢 Max Requests: ${maxRequests}`);
  console.log(`⏱️  Delay between requests: ${delayMs}ms`);
  console.log("─".repeat(50));

  let successCount = 0;
  let rateLimited = false;

  for (let i = 1; i <= maxRequests; i++) {
    const success = await makeRequest(i);

    if (success) {
      successCount++;
    } else {
      rateLimited = true;
      console.log(`\n🎯 Rate limit triggered on request #${i}!`);
      break;
    }

    // Add delay between requests (except for the last one)
    if (i < maxRequests && !rateLimited) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📈 TEST RESULTS");
  console.log("=".repeat(50));
  console.log(`✅ Successful requests: ${successCount}`);
  console.log(`🚫 Rate limited: ${rateLimited ? "YES" : "NO"}`);
  console.log(
    `📊 Success rate: ${((successCount / maxRequests) * 100).toFixed(1)}%`,
  );

  if (rateLimited) {
    console.log("\n🎉 Rate limiting is working correctly!");
  } else {
    console.log("\n⚠️  Rate limiting may not be active or limits are too high");
  }
}

// Command line arguments
const args = process.argv.slice(2);
const maxRequests = parseInt(args[0]) || 20;
const delayMs = parseInt(args[1]) || 100;

testRateLimiting(maxRequests, delayMs).catch(console.error);
