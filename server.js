// Production entry: serves the web export and the API routes from `npx expo export --platform web`.
// No compression middleware: it would buffer the NDJSON stream from /api/cards.
const path = require('path');
const express = require('express');
const { createRequestHandler } = require('expo-server/adapter/express');

const CLIENT_DIR = path.join(process.cwd(), 'dist/client');
const SERVER_DIR = path.join(process.cwd(), 'dist/server');

const app = express();
app.disable('x-powered-by');
// Behind Fly's proxy; lets the rate limiter see the client IP from X-Forwarded-For.
app.set('trust proxy', true);

app.use(express.static(CLIENT_DIR));
app.all(
  '/{*all}',
  createRequestHandler({ build: SERVER_DIR, environment: process.env.NODE_ENV })
);

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(JSON.stringify({ event: 'listening', port }));
});
