// server/index.js
const express = require('express');
const emailWebhookRouter = require('./email-webhook');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Enable CORS for local development
app.use(cors());

// Parse JSON requests
app.use(express.json());

// Mount the email webhook router
app.use('/api/emails', emailWebhookRouter);

// Add Claude API proxy for local development
app.use('/api/claude', async (req, res) => {
  const claudeApiUrl = `https://europe-west1-parentload-ba995.cloudfunctions.net/claude`;
  
  try {
    console.log(`Proxying request to Claude API: ${req.method} ${claudeApiUrl}`);
    
    // Test endpoint just returns success
    if (req.path === '/test') {
      return res.json({ success: true, message: "Claude API proxy is working" });
    }
    
    // Forward the request to the actual Firebase Function
    const response = await axios({
      method: req.method,
      url: claudeApiUrl,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization headers if needed
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
      }
    });
    
    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying to Claude API:', error.message);
    return res.status(500).json({ 
      error: 'Error connecting to Claude API',
      details: error.message
    });
  }
});

// Simple test endpoint
app.get('/api/claude/test', (req, res) => {
  res.json({ success: true, message: "Claude API proxy is working" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});