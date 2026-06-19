/** Backend tool runner contract. */

export interface RunnerContext {
  /** Absolute paths to uploaded input files. */
  inputFiles: string[];
  /** Absolute directory where the runner must write its output. */
  outputDir: string;
  /** Tool options forwarded from the client (already JSON-parsed). */
  options: Record<string, unknown>;
  /** Report progress (0..1). */
  progress: (fraction: number) => void;
}

export interface RunnerOutput {
  /** Absolute path to the produced file. */
  path: string;
  /** Suggested download filename. */
  name: string;
  /** MIME type for the response. */
  mime: string;
}

export type Runner = (ctx: RunnerContext) => Promise<RunnerOutput>;
