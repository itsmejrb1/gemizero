#!/usr/bin/env node
import { createApp } from '../src/server.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

const app = await createApp();
const server = app.listen(PORT, () => {
  console.log(`gemizero API running on http://localhost:${PORT}/v1`);
});

function shutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
