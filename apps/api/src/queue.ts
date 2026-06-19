/** BullMQ queue, worker, and job processor wiring. */
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Queue, Worker, type Job, type Processor } from 'bullmq';
import IORedis from 'ioredis';
import { config } from './config.js';
import { getRunner } from './tools/index.js';
import { jobDir } from './storage.js';

export const QUEUE_NAME = 'pdf-jobs';

export interface JobData {
  endpoint: string;
  options: Record<string, unknown>;
}

export interface JobResult {
  resultPath: string;
  resultName: string;
  resultMime: string;
}

/** Shared Redis connection (BullMQ requires maxRetriesPerRequest: null). */
export function createConnection(): IORedis {
  return new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
}

export function createQueue(connection: IORedis): Queue<JobData, JobResult> {
  return new Queue<JobData, JobResult>(QUEUE_NAME, { connection });
}

/** Processor: locate the runner, gather input files, and execute it. */
const processor: Processor<JobData, JobResult> = async (job: Job<JobData, JobResult>) => {
  const { endpoint, options } = job.data;
  const runner = getRunner(endpoint);
  if (!runner) throw new Error(`Unknown endpoint: ${endpoint}`);

  const root = jobDir(job.id!);
  const inputDir = join(root, 'input');
  const outputDir = join(root, 'output');
  const entries = await readdir(inputDir).catch(() => [] as string[]);
  const inputFiles = entries.sort().map((name) => join(inputDir, name));

  const result = await runner({
    inputFiles,
    outputDir,
    options,
    progress: (fraction) => void job.updateProgress(Math.round(fraction * 100)),
  });

  return { resultPath: result.path, resultName: result.name, resultMime: result.mime };
};

/** Start a worker bound to the processor. */
export function createWorker(connection: IORedis): Worker<JobData, JobResult> {
  return new Worker<JobData, JobResult>(QUEUE_NAME, processor, {
    connection,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 2),
  });
}
