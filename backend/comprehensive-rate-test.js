#!/usr/bin/env node

/**
 * Comprehensive Rate Limiting Test Script
 * Tests different endpoints with different rate limits
 */

import fetch from "node-fetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const TEST_ENDPOINTS = {
  "auth-tracking": {
    url: `${API_URL}/auth/tracking-status`,
    headers: { Authorization: "Bearer test-token" },
    limit: 5, // 5 requests per 15 minutes
    description: "Auth endpoint (stricter limits)",
  },
  "health-check": {
    url: `${API_URL}/health`,
    headers: {},
    limit: 100, // 100 requests per 15 minutes
    description: "General API endpoint",
  },
  "root-health": {
    url: "http://localhost:5000/",
    headers: {},
    limit: 100, // 100 requests per 15 minutes
    description: "Root endpoint",
  },
};

async function makeRequest(endpoint, attemptNumber) {
  try {
    const response = await fetch(endpoint.url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...endpoint.headers,
      },
    });

    let data;
    try {
      data = await response.json();
    } catch {
      data = { message: "No JSON response" };
    }

    if (response.status === 429) {
      console.log(
        `🚫 ${endpoint.description} - Request #${attemptNumber} - RATE LIMITED!`,
      );
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${data.message}`);
      console.log(`   Retry After: ${data.retryAfter} seconds`);
      if (data.clientIP) {
        console.log(`   Client IP: ${data.clientIP}`);
      }
      return false; // Rate limited
    } else if (response.ok) {
      console.log(
        `✅ ${endpoint.description} - Request #${attemptNumber} - SUCCESS`,
      );
      return true; // Success
    } else {
      console.log(
        `⚠️  ${endpoint.description} - Request #${attemptNumber} - ERROR`,
      );
      console.log(`   Status: ${response.status}`);
      console.log(`   Message: ${data.message || "Unknown error"}`);
      return true; // Continue trying
    }
  } catch (error) {
    console.log(
      `❌ ${endpoint.description} - Request #${attemptNumber} - NETWORK ERROR`,
    );
    console.log(`   Error: ${error.message}`);
    return true; // Continue trying
  }
}

async function testEndpoint(endpoint, maxRequests = 10, delayMs = 100) {
  console.log(`\n🔍 Testing: ${endpoint.description}`);
  console.log(`📊 URL: ${endpoint.url}`);
  console.log(`🎯 Expected limit: ${endpoint.limit} requests per 15 minutes`);
  console.log(`🔢 Testing with: ${maxRequests} requests`);
  console.log("─".repeat(60));

  let successCount = 0;
  let rateLimited = false;

  for (let i = 1; i <= maxRequests; i++) {
    const success = await makeRequest(endpoint, i);

    if (success) {
      successCount++;
    } else {
      rateLimited = true;
      console.log(
        `\n🎯 Rate limit triggered on request #${i} for ${endpoint.description}!`,
      );
      break;
    }

    // Add delay between requests
    if (i < maxRequests && !rateLimited) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { successCount, rateLimited, total: maxRequests };
}

async function runComprehensiveTest() {
  console.log("🚀 Starting Comprehensive Rate Limiting Test");
  console.log(`📅 ${new Date().toISOString()}`);
  console.log("═".repeat(80));

  const results = {};

  // Test auth endpoint (stricter limits)
  results.auth = await testEndpoint(TEST_ENDPOINTS["auth-tracking"], 8, 200);

  // Test general API endpoint
  results.health = await testEndpoint(TEST_ENDPOINTS["health-check"], 15, 100);

  // Test root endpoint
  results.root = await testEndpoint(TEST_ENDPOINTS["root-health"], 15, 100);

  // Summary
  console.log("\n" + "═".repeat(80));
  console.log("📈 COMPREHENSIVE TEST RESULTS");
  console.log("═".repeat(80));

  Object.entries(results).forEach(([name, result]) => {
    const endpoint = TEST_ENDPOINTS[name];
    if (endpoint) {
      console.log(`\n${endpoint.description}:`);
      console.log(`  ✅ Successful requests: ${result.successCount}`);
      console.log(`  🚫 Rate limited: ${result.rateLimited ? "YES" : "NO"}`);
      console.log(
        `  📊 Success rate: ${((result.successCount / result.total) * 100).toFixed(1)}%`,
      );
      console.log(
        `  🎯 Expected limit: ${endpoint.limit} requests per 15 minutes`,
      );
    }
  });

  const allRateLimited = Object.values(results).every((r) => r.rateLimited);
  const anyRateLimited = Object.values(results).some((r) => r.rateLimited);

  console.log("\n" + "═".repeat(80));
  if (allRateLimited) {
    console.log("🎉 ALL ENDPOINTS: Rate limiting is working perfectly!");
  } else if (anyRateLimited) {
    console.log(
      "⚠️  PARTIAL: Some endpoints have rate limiting, others may need adjustment",
    );
  } else {
    console.log(
      "❌ NONE: Rate limiting may not be active or limits are too high",
    );
  }
  console.log("═".repeat(80));
}

// Command line arguments
const args = process.argv.slice(2);
const maxRequests = parseInt(args[0]) || 10;
const delayMs = parseInt(args[1]) || 100;

runComprehensiveTest().catch(console.error);
