// simple-proxy.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');
const app = express();
const PORT = 3001;


// Load environment variables from .env file
dotenv.config();

app.use(cors());
app.use(express.json());

app.post('/api/claude', async (req, res) => {
  try {
    console.log('Received request to Claude proxy');
    
    // Get API key from environment variables
    const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
    
    // Check if API key is provided
    if (!apiKey) {
      console.log('No API key found in environment variables, returning mock response');
      return res.json({
        content: [{ text: "This is a mock Claude response for testing purposes. Your message was: " + req.body.messages[0].content }]
      });
    }
    
    console.log('Making real API call to Claude with API key from .env file');
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    
    console.log('Claude API response received successfully');
    res.json(response.data);
  } catch (error) {
    console.error('Error in Claude proxy:', error.response ? error.response.data : error.message);
    res.status(500).json({ 
      error: 'Proxy server error', 
      details: error.response ? error.response.data : error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Simple Claude proxy running on http://localhost:${PORT}`);
  console.log(`API key environment variable ${process.env.REACT_APP_CLAUDE_API_KEY ? 'is set' : 'is NOT set'}`);
});



// Add this to simple-proxy.js
app.get('/api/claude/test', (req, res) => {
  console.log('Received test request to Claude proxy');
  
  // Check if API key is set
  const apiKey = process.env.REACT_APP_CLAUDE_API_KEY;
  const keyStatus = apiKey ? 'API key is set' : 'No API key found';
  
  res.json({
    status: 'ok',
    message: 'Claude proxy is running',
    keyStatus: keyStatus,
    timestamp: new Date().toISOString()
  });
});