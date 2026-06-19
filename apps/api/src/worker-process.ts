/** Standalone queue worker entry point (for running workers in a separate container). */
import { createConnection, createWorker } from './queue.js';
import { startPurgeLoop } from './storage.js';

const worker = createWorker(createConnection());
const stopPurge = startPurgeLoop();

worker.on('completed', (job) => console.log(`Completed job ${job.id}`));
worker.on('failed', (job, err) => console.error(`Failed job ${job?.id}:`, err.message));

const shutdown = async () => {
  stopPurge();
  await worker.close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('PDF worker started.');
