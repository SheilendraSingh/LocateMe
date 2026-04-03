#!/usr/bin/env node

/**
 * General API Rate Limiting Test Script
 * Tests the general API endpoints with higher request counts
 */

import fetch from "node-fetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function makeRequest(url, attemptNumber) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 429) {
      const data = await response.json();
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
      return true; // Success
    } else {
      console.log(
        `⚠️  Request #${attemptNumber} - ERROR (Status: ${response.status})`,
      );
      return true; // Continue trying
    }
  } catch (error) {
    console.log(
      `❌ Request #${attemptNumber} - NETWORK ERROR: ${error.message}`,
    );
    return true; // Continue trying
  }
}

async function testGeneralAPI(maxRequests = 110, delayMs = 20) {
  const endpoint = `${API_URL}/health`;

  console.log("🚀 Testing General API Rate Limiting");
  console.log(`📊 Target: ${endpoint}`);
  console.log(`🎯 Expected limit: 100 requests per 15 minutes`);
  console.log(`🔢 Testing with: ${maxRequests} requests`);
  console.log(`⏱️  Delay: ${delayMs}ms between requests`);
  console.log("─".repeat(60));

  let successCount = 0;
  let rateLimited = false;

  for (let i = 1; i <= maxRequests; i++) {
    const success = await makeRequest(endpoint, i);

    if (success) {
      successCount++;
    } else {
      rateLimited = true;
      console.log(`\n🎯 Rate limit triggered on request #${i}!`);
      break;
    }

    // Add delay between requests
    if (i < maxRequests && !rateLimited) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("📈 GENERAL API TEST RESULTS");
  console.log("=".repeat(60));
  console.log(`✅ Successful requests: ${successCount}`);
  console.log(`🚫 Rate limited: ${rateLimited ? "YES" : "NO"}`);
  console.log(
    `📊 Success rate: ${((successCount / maxRequests) * 100).toFixed(1)}%`,
  );
  console.log(`🎯 Expected limit: 100 requests per 15 minutes`);

  if (rateLimited) {
    console.log("\n🎉 General API rate limiting is working correctly!");
    console.log(
      `💡 The limit was triggered after ${successCount} successful requests`,
    );
  } else {
    console.log("\n⚠️  General API rate limiting did not trigger");
    console.log("💡 This could mean:");
    console.log("   - The limit is higher than tested");
    console.log("   - Rate limiting is not applied to this endpoint");
    console.log("   - The time window hasn't been reached yet");
  }
}

// Command line arguments
const args = process.argv.slice(2);
const maxRequests = parseInt(args[0]) || 110;
const delayMs = parseInt(args[1]) || 20;

testGeneralAPI(maxRequests, delayMs).catch(console.error);
