const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();


// Add this to the top of your existing functions/index.js
console.log("Firebase Functions initialized");

// Make sure your callClaudeAPI function has proper logging:
exports.callClaudeAPI = functions.https.onCall(async (data, context) => {
  try {
    console.log("callClaudeAPI function called!");
    // Log the incoming data (but truncate it to avoid massive logs)
    console.log("Data received:", JSON.stringify({
      system: data.system ? data.system.substring(0, 100) + "..." : null,
      messages: data.messages ? data.messages.length + " messages" : null
    }));

    // Your existing code...

// Cloud Function to proxy calls to Claude API
exports.callClaudeAPI = functions.https.onCall(async (data, context) => {
  try {
    // You can use an environment variable or secrets manager in production
    const CLAUDE_API_KEY = 'sk-ant-api03-wYazj0X00yKvWF_TCwYGGsT6pJrW5ytBEowQ7R-OiW8TX_vnPBeUFJlkxKJDEyJ9xM88Bi9bt9ChNpsIJOvYkg-aMXNIg-ZYDQQG';

    console.log("Received request for Claude API");
    
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


    // In functions/index.js, add:
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
    console.log("Claude API response received");
    
    // Return the Claude API response
    return response.data;
  } catch (error) {
    console.error("Error calling Claude API:", error);
    
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