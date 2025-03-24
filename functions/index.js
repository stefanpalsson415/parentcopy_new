// FIXED CODE - replace entire functions/index.js file with this:
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const axios = require('axios');

// Initialize Firebase Admin
initializeApp();

// Get the Claude API key from environment variable or use a fallback for development
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'sk-ant-api03-wYazj0X00yKvWF_TCwYGGsT6pJrW5ytBEowQ7R-OiW8TX_vnPBeUFJlkxKJDEyJ9xM88Bi9bt9ChNpsIJOvYkg-aMXNIg-ZYDQQG';

// Simple Hello World function for testing using v2 API
exports.helloWorld = onCall({ region: 'europe-west1' }, (request) => {
  logger.info("Hello world function called with data:", request.data);
  
  return {
    message: "Hello from Firebase!",
    timestamp: new Date().toISOString(),
    receivedData: request.data
  };
});

// Cloud Function to proxy calls to Claude API using v2 API
exports.callClaudeAPI = onCall({ region: 'europe-west1' }, async (request) => {
  try {
    logger.info("Received request for Claude API:", {
      systemLength: request.data.system ? request.data.system.length : 0,
      messagesCount: request.data.messages ? request.data.messages.length : 0
    });
    
    // Make request to Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-7-sonnet-20240219",
        max_tokens: 1000,
        system: request.data.system,
        messages: request.data.messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    logger.info("Claude API response received");
    
    // Return the Claude API response
    return response.data;
  } catch (error) {
    logger.error("Error calling Claude API:", error.message);
    
    // More detailed error handling
    if (error.response) {
      logger.error("Response error:", error.response.status, error.response.data);
      throw new HttpsError(
        'unknown', 
        `Claude API error: ${error.response.status}`,
        {
          status: error.response.status,
          data: error.response.data
        }
      );
    } else if (error.request) {
      logger.error("No response received");
      throw new HttpsError('unavailable', 'No response from Claude API');
    } else {
      logger.error("Request setup error:", error.message);
      throw new HttpsError('internal', error.message);
    }
  }
});

// HTTP endpoint for testing Claude API directly (browser accessible)
exports.testClaudeAPI = onRequest({ region: 'europe-west1' }, async (req, res) => {
  try {
    logger.info("Test Claude API endpoint hit");
    
    // Make a simple call to Claude
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-7-sonnet-20240219",
        max_tokens: 100,
        system: "You are a helpful assistant.",
        messages: [{ role: "user", content: "Hello!" }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    logger.error("Error in test endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});