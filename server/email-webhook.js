// server/email-webhook.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { db } = require('../src/services/firebase');
const EmailIngestService = require('../src/services/EmailIngestService');

const router = express.Router();

// Middleware
router.use(cors());
router.use(bodyParser.json({ limit: '10mb' }));

/**
 * Handle incoming email webhook
 * This endpoint receives notifications from your email service provider
 * when an email is sent to an Allie address
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('Email webhook received', { 
      sender: req.body.from,
      subject: req.body.subject,
      hasAttachments: (req.body.attachments || []).length > 0
    });
    
    // Validate webhook request
    if (!req.body.from || !req.body.textContent) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid webhook data' 
      });
    }
    
    // Process the email asynchronously, don't wait for it to complete
    // to avoid webhook timeout
    EmailIngestService.processIncomingEmail(req.body)
      .then(result => {
        console.log('Email processed:', result);
      })
      .catch(error => {
        console.error('Error processing email:', error);
      });
    
    // Return successful response immediately to acknowledge receipt
    res.status(200).json({ 
      success: true, 
      message: 'Email received and queued for processing' 
    });
  } catch (error) {
    console.error('Error handling email webhook:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

/**
 * Endpoint to get personalized email address for a family
 */
router.get('/family-email/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    
    if (!familyId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Family ID is required' 
      });
    }
    
    const email = await EmailIngestService.getPersonalizedEmailAddress(familyId);
    
    res.status(200).json({ 
      success: true, 
      email 
    });
  } catch (error) {
    console.error('Error getting family email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

module.exports = router;