const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });
const fetch = require("node-fetch");

exports.claudeProxy = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to use this feature."
    );
  }

  try {
    // Get Claude API key from environment
    const apiKey = functions.config().claude.api_key;
    
    if (!apiKey) {
      throw new Error("Claude API key not configured");
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-7-sonnet-20240307",
        max_tokens: 1000,
        system: data.system,
        messages: data.messages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Claude API error: ${response.status}`, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error in claudeProxy:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});