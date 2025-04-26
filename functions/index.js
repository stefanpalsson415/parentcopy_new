const functions = require('firebase-functions');
const express = require('express');
const axios = require('axios');
const cors = require('cors');

// Create a single Express app for all Claude-related endpoints
const app = express();

// Apply CORS middleware with more explicit configuration
const corsOptions = {
  origin: ['https://checkallie.com', 'https://www.checkallie.com', 'http://localhost:3000'],
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
      return res.status(500).json({
        status: 'error',
        message: 'Server is not properly configured: Missing API key'
      });
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

    // CRITICAL: Log and verify the actual response structure
    console.log('Claude API response structure check:', 
      Object.keys(claudeResponse.data).join(', '), 
      claudeResponse.data.content ? `Has content array with ${claudeResponse.data.content.length} items` : 'No content array'
    );

    // Validate response structure and handle various API versions
    if (!claudeResponse.data) {
      throw new Error('Empty response from Claude API');
    }

    // Handle different possible Claude API response formats
    if (claudeResponse.data.content && Array.isArray(claudeResponse.data.content)) {
      // Current format - content array with objects having 'text' property
      if (claudeResponse.data.content.length > 0) {
        if (claudeResponse.data.content[0].text === undefined) {
          // Content exists but no text property, try to repair
          claudeResponse.data.content[0] = { 
            text: typeof claudeResponse.data.content[0] === 'string' 
              ? claudeResponse.data.content[0]
              : JSON.stringify(claudeResponse.data.content[0])
          };
        }
      } else {
        // Empty content array, add a default item
        claudeResponse.data.content = [{ text: "I don't have a specific response for that. Can you rephrase your question?" }];
      }
    } else if (claudeResponse.data.completion) {
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

    // Send back the properly formatted Claude API response
    return res.status(200).json(claudeResponse.data);
  } catch (error) {
    console.error('Error calling Claude API:', error);
    
    // Create a safe fallback response the client can handle
    const fallbackResponse = {
      content: [{ 
        text: "I'm having trouble connecting to my language processing system. Please try again in a moment." 
      }],
      model: req.body.model || 'claude-3-sonnet-20240229',
      id: 'error-fallback'
    };
    
    // Handle different types of errors
    if (error.response) {
      // The request was made and the server responded with an error status
      const status = error.response.status || 500;
      console.error(`Claude API returned status ${status}:`, 
        error.response.data ? JSON.stringify(error.response.data).substring(0, 200) : 'No response data'
      );
      
      // For recoverable errors, return the fallback response with 200 status
      // This prevents client-side errors while still logging the issue server-side
      return res.status(200).json(fallbackResponse);
    } else {
      // Connection or other errors - return fallback
      return res.status(200).json(fallbackResponse);
    }
  }
});

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