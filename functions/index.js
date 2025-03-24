const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();

// Cloud Function to proxy calls to Claude API
exports.callClaudeAPI = functions.https.onCall(async (data, context) => {
  try {
    // You can use an environment variable or secrets manager in production
    const CLAUDE_API_KEY = 'sk-ant-api03-wYazj0X00yKvWF_TCwYGGsT6pJrW5ytBEowQ7R-OiW8TX_vnPBeUFJlkxKJDEyJ9xM88Bi9bt9ChNpsIJOvYkg-aMXNIg-ZYDQQG';

    console.log("Received request for Claude API:", {
      systemLength: data.system ? data.system.length : 0,
      messagesCount: data.messages ? data.messages.length : 0
    });
    
    // Make request to Claude API
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: "claude-3-7-sonnet-20240219",
        max_tokens: 1000,
        system: data.system,
        messages: data.messages
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    console.log("Claude API response received");
    
    // Return the Claude API response
    return response.data;
  } catch (error) {
    console.error("Error calling Claude API:", error.message);
    
    // More detailed error handling
    if (error.response) {
      console.error("Response error:", error.response.status, error.response.data);
      throw new functions.https.HttpsError(
        'unknown', 
        `Claude API error: ${error.response.status}`,
        {
          status: error.response.status,
          data: error.response.data
        }
      );
    } else if (error.request) {
      console.error("No response received");
      throw new functions.https.HttpsError('unavailable', 'No response from Claude API');
    } else {
      console.error("Request setup error:", error.message);
      throw new functions.https.HttpsError('internal', error.message);
    }
  }
});

// Separate test function
exports.testClaudeAPI = functions.https.onRequest(async (req, res) => {
  try {
    console.log("Test Claude API endpoint hit");
    
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
          'x-api-key': 'sk-ant-api03-wYazj0X00yKvWF_TCwYGGsT6pJrW5ytBEowQ7R-OiW8TX_vnPBeUFJlkxKJDEyJ9xM88Bi9bt9ChNpsIJOvYkg-aMXNIg-ZYDQQG',
          'anthropic-version': '2023-06-01'
        }
      }
    );
    
    res.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});