const functions = require('firebase-functions');
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Create Express apps for both functions
const testApp = express();
const claudeApp = express();

// Apply CORS middleware
testApp.use(cors({ origin: true }));
claudeApp.use(cors({ origin: true }));

// You'll need the Anthropic API key - store it in Firebase environment config
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 
                          functions.config().anthropic?.apikey;

// Claude API endpoint
const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Test endpoint route
testApp.get('/*', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Claude API test endpoint is working',
    timestamp: new Date().toISOString()
  });
});

// Main Claude API routes
claudeApp.get('/test', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Claude API proxy is working',
    timestamp: new Date().toISOString()
  });
});

claudeApp.post('/', async (req, res) => {
  try {
    // Make sure we have the API key
    if (!ANTHROPIC_API_KEY) {
      console.error('Anthropic API key is not configured');
      res.status(500).json({
        status: 'error',
        message: 'Server is not properly configured.'
      });
      return;
    }

    // Get the request body from the client
    const { model, max_tokens, temperature, messages, system } = req.body;

    // Prepare the request for Anthropic API
    const claudeRequest = {
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: max_tokens || 4000,
      temperature: temperature || 0.7,
      messages: messages || [],
      system: system || ''
    };

    console.log('Making request to Claude API', { model, messagesCount: messages?.length });

    // Forward the request to Anthropic
    const claudeResponse = await axios.post(CLAUDE_API_ENDPOINT, claudeRequest, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });

    // Send back the Claude API response
    res.status(200).json(claudeResponse.data);
  } catch (error) {
    console.error('Error calling Claude API:', error);
    
    // Handle different types of errors
    if (error.response) {
      // The request was made and the server responded with an error status
      const status = error.response.status || 500;
      const errorData = error.response.data || { error: 'Unknown error' };
      
      res.status(status).json({
        status: 'error',
        message: 'Error from Claude API',
        details: errorData
      });
    } else if (error.request) {
      // The request was made but no response was received
      res.status(504).json({
        status: 'error',
        message: 'Timeout or no response from Claude API'
      });
    } else {
      // Something else caused the error
      res.status(500).json({
        status: 'error',
        message: error.message || 'Unknown error occurred'
      });
    }
  }
});

// Export the Express apps as Firebase Functions
// Specify europe-west1 region since you're in Sweden
exports.claudeTest = functions.region('europe-west1').https.onRequest(testApp);
exports.claude = functions.region('europe-west1').https.onRequest(claudeApp);