module.exports = (req, res) => {
  try {
    const app = require('../server.js');
    return app(req, res);
  } catch (err) {
    console.error('SERVERLESS ENTRY ERROR:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({
      error: 'Failed to execute serverless function',
      message: err.message,
      stack: err.stack
    }));
  }
};
