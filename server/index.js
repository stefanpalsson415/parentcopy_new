// server/index.js
const express = require('express');
const emailWebhookRouter = require('./email-webhook');

const app = express();

// Other middleware and setup

// Mount the email webhook router
app.use('/api/emails', emailWebhookRouter);

// Other routes

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});