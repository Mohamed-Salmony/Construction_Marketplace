/* Custom Next.js server with process-level error handlers to prevent crashes */
const next = require('next');
const http = require('http');

// Process-level guards: never let the process exit on unexpected errors
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[uncaughtException]', err);
});
process.on('unhandledRejection', (reason, promise) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledRejection]', reason);
});

const port = process.env.PORT || 3000;
const dev = false; // run production build
const app = next({ dev });
const handle = app.getRequestHandler();

async function start() {
  try {
    await app.prepare();
    const server = http.createServer(async (req, res) => {
      try {
        await handle(req, res);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[requestHandlerError]', err);
        try {
          res.statusCode = 500;
          res.end('Internal Server Error');
        } catch {}
      }
    });
    server.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('[serverError]', err);
    });
    server.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`> Ready on http://localhost:${port}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[serverStartError]', err);
  }
}

start();
