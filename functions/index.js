const functions = require('firebase-functions');
const cors = require('cors')({origin: true});

// Super simple test function - no authentication, no Claude API
exports.helloworld = functions
  .runWith({
    ingressSettings: 'ALLOW_ALL' // Try to allow all traffic
  })
  .https.onRequest((req, res) => {
    return cors(req, res, () => {
      res.status(200).send({
        message: 'Hello World!',
        timestamp: new Date().toISOString()
      });
    });
  });