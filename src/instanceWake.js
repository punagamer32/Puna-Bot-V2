const http = require('http');
const https = require('https');

const SELF_URL = process.env.SELF_URL || 'https://puna-bot-v1ar.onrender.com';
const PORT = process.env.PORT || 3000;
const PING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Starts a minimal HTTP server so Render assigns a port and treats
 * the service as a healthy Web Service.
 */
function startHealthServer() {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(PORT, () => {
    console.log(`🌐 Health server listening on port ${PORT}`);
  });

  server.on('error', (err) => {
    console.error('❌ Health server error:', err.message);
  });

  return server;
}

/**
 * Pings the public Render URL once. Returns a promise that resolves
 * on any response (even 4xx/5xx) and rejects on network/timeout error.
 */
function pingOnce(url = SELF_URL) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;

    const req = lib.get(url, { timeout: REQUEST_TIMEOUT_MS }, (res) => {
      // Drain response body to free the socket
      res.resume();
      resolve({ statusCode: res.statusCode });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });

    req.on('error', (err) => reject(err));
  });
}

/**
 * Starts the recurring self-ping loop.
 */
function startKeepAliveLoop() {
  const tick = async () => {
    const timestamp = new Date().toISOString();
    try {
      const { statusCode } = await pingOnce();
      console.log(`[${timestamp}] 🔄 Self-ping OK — HTTP ${statusCode}`);
    } catch (err) {
      console.error(`[${timestamp}] ⚠️ Self-ping failed: ${err.message}`);
    }
  };

  // First ping after a short delay to let the server finish binding
  setTimeout(tick, 15_000);
  return setInterval(tick, PING_INTERVAL_MS);
}

/**
 * Entry point — call this once from index.js after the bot logs in.
 */
function startInstanceWake() {
  const server = startHealthServer();
  const interval = startKeepAliveLoop();

  // Clean shutdown
  const shutdown = () => {
    console.log('🛑 Shutting down instanceWake...');
    clearInterval(interval);
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return { server, interval };
}

module.exports = { startInstanceWake, pingOnce };
