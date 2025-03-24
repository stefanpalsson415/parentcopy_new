// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

app.post('/api/claude', async (req, res) => {
  try {
    console.log('Received request to proxy Claude API call');
    
    // Extract the Claude API key from environment variables
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Claude API key not configured on server' });
    }
    
    // Forward the request to Claude API
    const response = await axios.post('https://api.anthropic.com/v1/messages', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    
    console.log('Successfully received response from Claude API');
    res.json(response.data);
  } catch (error) {
    console.error('Error calling Claude API:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message
    });
  }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Proxy server is running!' });
});

app.listen(PORT, () => {
  console.log(`Claude API Proxy Server running on port ${PORT}`);
});