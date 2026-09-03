import { Hono } from 'hono';

const app = new Hono();

app.get('/spike-health', (c) => c.json({ status: 'ok', spike: true }));

export default app;
