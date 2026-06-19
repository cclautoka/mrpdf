/** Fastify HTTP server exposing the job API for heavy PDF tools. */
import { createReadStream, createWriteStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import Fastify from 'fastify';
import { nanoid } from 'nanoid';
import { config } from './config.js';
import { createConnection, createQueue, createWorker, type JobData } from './queue.js';
import { createJobDirs, removeJob, startPurgeLoop } from './storage.js';
import { fileOptionalEndpoints, getRunner } from './tools/index.js';
import { join } from 'node:path';

async function main() {
  const app = Fastify({ logger: true, bodyLimit: config.maxUploadBytes });
  await app.register(cors, { origin: config.corsOrigin });
  await app.register(multipart, { limits: { fileSize: config.maxUploadBytes } });

  const connection = createConnection();
  const queue = createQueue(connection);
  const worker = config.inlineWorker ? createWorker(createConnection()) : null;
  worker?.on('failed', (job, err) =>
    app.log.error({ jobId: job?.id, err: err.message }, 'job failed'),
  );
  const stopPurge = startPurgeLoop();

  app.get('/health', async () => ({ ok: true }));

  // Create a job: accepts multipart files + an `options` JSON field.
  app.post('/jobs/:endpoint', async (req, reply) => {
    const endpoint = (req.params as { endpoint: string }).endpoint;
    if (!getRunner(endpoint)) return reply.code(404).send({ error: `Unknown tool: ${endpoint}` });

    const id = nanoid();
    const { input } = await createJobDirs(id);
    let options: Record<string, unknown> = {};
    let fileCount = 0;
    let index = 0;

    for await (const part of req.parts()) {
      if (part.type === 'file') {
        const safe = `${String(index++).padStart(3, '0')}-${sanitize(part.filename || 'file')}`;
        await pipeline(part.file, createWriteStream(join(input, safe)));
        fileCount++;
      } else if (part.fieldname === 'options') {
        try {
          options = JSON.parse(String(part.value));
        } catch {
          options = {};
        }
      }
    }

    if (fileCount === 0 && !fileOptionalEndpoints.has(endpoint)) {
      await removeJob(id);
      return reply.code(400).send({ error: 'No files uploaded.' });
    }

    await queue.add(endpoint, { endpoint, options } satisfies JobData, {
      jobId: id,
      removeOnComplete: false,
      removeOnFail: false,
    });
    return reply.send({ id });
  });

  // Poll job status.
  app.get('/jobs/:id', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const job = await queue.getJob(id);
    if (!job) return reply.code(404).send({ error: 'Job not found.' });
    const state = await job.getState();
    const result = job.returnvalue;
    return reply.send({
      id,
      state,
      progress: typeof job.progress === 'number' ? job.progress / 100 : 0,
      error: job.failedReason,
      resultName: result?.resultName,
      resultMime: result?.resultMime,
    });
  });

  // Download the produced file.
  app.get('/jobs/:id/result', async (req, reply) => {
    const id = (req.params as { id: string }).id;
    const job = await queue.getJob(id);
    if (!job || !job.returnvalue) return reply.code(404).send({ error: 'Result not ready.' });
    const { resultPath, resultName, resultMime } = job.returnvalue;
    await stat(resultPath).catch(() => {
      throw new Error('Result file is no longer available (it may have been purged).');
    });
    reply.header('Content-Type', resultMime);
    reply.header('Content-Disposition', `attachment; filename="${resultName}"`);
    return reply.send(createReadStream(resultPath));
  });

  const close = async () => {
    stopPurge();
    await worker?.close();
    await queue.close();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  await app.listen({ port: config.port, host: config.host });
}

/** Strip path separators and control characters from an uploaded filename. */
function sanitize(name: string): string {
  return (
    name
      .replace(/[/\\]/g, '_')
      .replace(/[^\w.\- ]/g, '')
      .slice(0, 120) || 'file'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
