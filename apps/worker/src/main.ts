import { QueueEvents } from 'bullmq';
const redis = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
// Foundation only: observe the queue; do not consume jobs before handlers exist.
const events = new QueueEvents('presqio-jobs', { connection: {
  host: redis.hostname, port: Number(redis.port || 6379),
  username: redis.username ? decodeURIComponent(redis.username) : undefined,
  password: redis.password ? decodeURIComponent(redis.password) : undefined,
  db: Number(redis.pathname.slice(1) || 0),
  ...(redis.protocol === 'rediss:' ? { tls: {} } : {}),
} });
events.on('error', () => console.error('Worker Redis connection unavailable'));
events.waitUntilReady().then(() => console.log('Queue observer ready; export, notification and retention handlers are pending.')).catch(() => { process.exitCode = 1; });
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { await events.close(); process.exit(0); });
