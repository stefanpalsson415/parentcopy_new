// functions/index.js
const functions = require('firebase-functions');
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Create a single Express app for all Claude-related endpoints
const app = express();

// Apply CORS middleware with more permissive configuration
const corsOptions = {
  origin: '*',  // Allow all origins - you can restrict this in production
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'anthropic-version'],
  credentials: true
};

app.use(cors(corsOptions));

// You'll need the Anthropic API key - store it in Firebase environment config
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 
                          functions.config().anthropic?.apikey;

// Claude API endpoint
const CLAUDE_API_ENDPOINT = 'https://api.anthropic.com/v1/messages';

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Received request`);
  next();
});

// Test endpoint route - handle both /test and /api/claude/test
app.get(['/test', '/api/claude/test'], (req, res) => {
  // Add explicit content type to prevent browser misinterpreting
  res.set('Content-Type', 'application/json');
  console.log('Test endpoint called successfully');
  
  res.status(200).json({
    status: 'success',
    message: 'Claude API proxy is working',
    timestamp: new Date().toISOString()
  });
});

// Main Claude API route - handle both / and /api/claude
app.post(['/', '/api/claude'], async (req, res) => {
  try {
    // Set content type explicitly
    res.set('Content-Type', 'application/json');
    
    // Log the incoming request for debugging
    console.log('Received request to Claude API proxy');
    
    // Make sure we have the API key
    if (!ANTHROPIC_API_KEY) {
      console.error('Anthropic API key is not configured');
      const fallbackResponse = createFallbackResponse(
        "I'm sorry, my language processing system is not properly configured right now.",
        req.body.model
      );
      return res.status(200).json(fallbackResponse);
    }

    // Get the request body from the client
    const { model, max_tokens, temperature, messages, system } = req.body;

    // Validate the messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid or empty messages array in request');
      const fallbackResponse = createFallbackResponse(
        "I couldn't understand your message. Please try again.",
        model
      );
      return res.status(200).json(fallbackResponse);
    }

    // Prepare the request for Anthropic API
    const claudeRequest = {
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: max_tokens || 4000,
      temperature: temperature || 0.7,
      messages: messages,
      system: system || ''
    };

    console.log('Making request to Claude API', { 
      model: claudeRequest.model, 
      messagesCount: messages?.length,
      lastMessagePreview: messages[messages.length-1]?.content?.substring(0, 50) + '...' || '[No content]'
    });

    // Forward the request to Anthropic with timeout
    const claudeResponse = await axios.post(CLAUDE_API_ENDPOINT, claudeRequest, {
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      timeout: 45000 // 45 second timeout
    });

    // CRITICAL: Log and verify the actual response structure
    console.log('Claude API response structure check:', 
      Object.keys(claudeResponse.data).join(', '), 
      claudeResponse.data.content ? `Has content array with ${claudeResponse.data.content.length} items` : 'No content array'
    );

    // Validate response structure and handle various API versions
    if (!claudeResponse.data) {
      console.error('Empty response data from Claude API');
      throw new Error('Empty response from Claude API');
    }

    // Enhanced handling of different Claude API response formats
    if (claudeResponse.data.content && Array.isArray(claudeResponse.data.content)) {
      // Current format - content array with objects having 'text' property
      if (claudeResponse.data.content.length > 0) {
        if (claudeResponse.data.content[0].text === undefined) {
          console.warn('Missing text property in content[0], attempting repair');
          // Content exists but no text property, try to repair
          if (typeof claudeResponse.data.content[0] === 'string') {
            claudeResponse.data.content[0] = { text: claudeResponse.data.content[0] };
          } else if (typeof claudeResponse.data.content[0] === 'object') {
            claudeResponse.data.content[0] = { 
              text: JSON.stringify(claudeResponse.data.content[0]) 
            };
          } else {
            claudeResponse.data.content[0] = { 
              text: "I processed your request but couldn't format a proper response. Please try again." 
            };
          }
        }
      } else {
        console.warn('Empty content array, adding default item');
        // Empty content array, add a default item
        claudeResponse.data.content = [{ 
          text: "I don't have a specific response for that. Can you rephrase your question?" 
        }];
      }
    } else if (claudeResponse.data.completion) {
      console.log('Converting old API format (completion) to new format');
      // Old API format - convert to expected structure
      claudeResponse.data = {
        content: [{ text: claudeResponse.data.completion }],
        model: claudeRequest.model,
        id: claudeResponse.data.id || 'converted-response'
      };
    } else {
      // Unknown format, create a standardized structure
      console.warn('Unknown Claude API response format:', Object.keys(claudeResponse.data));
      
      // Create a valid response with whatever data we can find
      const responseText = claudeResponse.data.answer || 
                          claudeResponse.data.message || 
                          claudeResponse.data.response ||
                          "I received your message but couldn't generate a proper response. Please try again.";
      
      claudeResponse.data = {
        content: [{ text: responseText }],
        model: claudeRequest.model,
        id: 'reformatted-response'
      };
    }

    // Final validation to ensure we're returning a valid response structure
    if (!claudeResponse.data.content || !Array.isArray(claudeResponse.data.content) || claudeResponse.data.content.length === 0) {
      console.error('Final validation failed - content array is invalid. Forcing fallback response.');
      
      // Create a standard valid response structure the client can handle
      claudeResponse.data = createFallbackResponse(
        "I'm having trouble processing your request right now. Please try again in a moment.",
        claudeRequest.model
      );
    }

    // Ensure text property exists in first content item
    if (claudeResponse.data.content[0] && (claudeResponse.data.content[0].text === undefined || claudeResponse.data.content[0].text === null)) {
      console.error('Text property missing in content[0]. Fixing:', claudeResponse.data.content[0]);
      claudeResponse.data.content[0].text = "I'm having trouble processing your request. Please try again.";
    }

    // Final check to ensure text is not empty
    if (claudeResponse.data.content[0] && (!claudeResponse.data.content[0].text || claudeResponse.data.content[0].text.trim() === '')) {
      console.error('Empty text in content[0]. Providing fallback text.');
      claudeResponse.data.content[0].text = "I processed your request but couldn't generate a response. Please try a different question.";
    }

    // Log the final response for debugging
    console.log('Sending response to client:', {
      modelUsed: claudeResponse.data.model || claudeRequest.model,
      contentLength: claudeResponse.data.content[0]?.text?.length || 0,
      contentPreview: claudeResponse.data.content[0]?.text?.substring(0, 50) + '...' || '[No content]'
    });

    // Send back the properly formatted Claude API response
    return res.status(200).json(claudeResponse.data);
  } catch (error) {
    console.error('Error calling Claude API:', error.message || 'Unknown error');
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
    
    // Create a safe fallback response the client can handle
    const fallbackResponse = createFallbackResponse(
      "I'm having trouble connecting to my language processing system. Please try again in a moment.",
      req.body.model
    );
    
    // Handle different types of errors
    if (error.response) {
      // The request was made and the server responded with an error status
      const status = error.response.status || 500;
      console.error(`Claude API returned status ${status}:`, 
        error.response.data ? JSON.stringify(error.response.data).substring(0, 200) : 'No response data'
      );
      
      // Add more detailed error info to the fallback response for specific status codes
      if (status === 429) {
        fallbackResponse.content[0].text = "I'm currently handling too many requests. Please try again in a moment.";
      } else if (status >= 500) {
        fallbackResponse.content[0].text = "My language processing system is experiencing issues. Please try again later.";
      }
      
      // For recoverable errors, return the fallback response with 200 status
      // This prevents client-side errors while still logging the issue server-side
      return res.status(200).json(fallbackResponse);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from Claude API');
      fallbackResponse.content[0].text = "I couldn't reach my language processing system. Please check your connection and try again.";
      return res.status(200).json(fallbackResponse);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error setting up request to Claude API:', error.message);
      // Return a generic fallback
      return res.status(200).json(fallbackResponse);
    }
  }
});

// Helper function to create consistent fallback responses
function createFallbackResponse(message, model) {
  return {
    content: [{ text: message }],
    model: model || 'claude-3-sonnet-20240229',
    id: 'error-fallback'
  };
}

// Add a catch-all route for debugging
app.all('*', (req, res) => {
  console.log(`Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({
    status: 'error',
    message: `Unhandled route: ${req.method} ${req.path}`
  });
});

// Export the Express app as a single Firebase Function
exports.claude = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
    invoker: 'public'
  })
  .https.onRequest(app);