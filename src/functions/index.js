const functions = require('firebase-functions');
const axios = require('axios');

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