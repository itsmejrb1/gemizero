#!/usr/bin/env node
import { createApp } from '../src/server.js';

const PORT = parseInt(process.env.PORT || '5000', 10);

const app = await createApp();
app.listen(PORT, () => {
  console.log(`gemizero API running on http://localhost:${PORT}/v1`);
});
