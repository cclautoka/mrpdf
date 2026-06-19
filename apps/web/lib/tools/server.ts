/** Helper to define a server-backed tool that proxies to a backend job endpoint. */
import { processOnServer } from '../api';
import type { ToolDefinition } from './types';

/** Build a tool definition whose work runs on the backend at `endpoint`. */
export function serverTool(
  def: Omit<ToolDefinition, 'execution' | 'run'> & { endpoint: string },
): ToolDefinition {
  const { endpoint, ...rest } = def;
  return {
    ...rest,
    execution: 'server',
    async run({ files, options, onProgress }) {
      const results = await processOnServer(endpoint, files, options, onProgress);
      return { files: results };
    },
  };
}
