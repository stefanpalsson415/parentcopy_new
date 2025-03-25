// simple-proxy.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/claude', async (req, res) => {
  try {
    console.log('Received request to Claude proxy');
    
    // If you have an API key, use it here
    const apiKey = 'YOUR_CLAUDE_API_KEY'; // Replace with your key
    
    // For testing without an actual API call:
    res.json({
      content: [{ text: "This is a mock Claude response for testing purposes. Your message was: " + req.body.messages[0].content }]
    });
    
    // Uncomment this for real API calls once the proxy is working:
    /*
    const response = await axios.post('https://api.anthropic.com/v1/messages', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      }
    });
    res.json(response.data);
    */
  } catch (error) {
    console.error('Error in Claude proxy:', error);
    res.status(500).json({ error: 'Proxy server error', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Simple Claude proxy running on http://localhost:${PORT}`);
});