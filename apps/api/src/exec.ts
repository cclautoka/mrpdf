/** Helper to run external CLI tools (LibreOffice, Ghostscript, qpdf, ...). */
import { spawn } from 'node:child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * Run a command, rejecting on a non-zero exit code.
 *
 * @param command  Executable name (resolved via PATH).
 * @param args     Argument list (never shell-interpolated, so it is injection-safe).
 * @param options  Working directory and timeout.
 */
export function run(
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {},
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd });
    let stdout = '';
    let stderr = '';
    const timer = options.timeoutMs
      ? setTimeout(() => {
          child.kill('SIGKILL');
          reject(new Error(`${command} timed out after ${options.timeoutMs}ms`));
        }, options.timeoutMs)
      : null;

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(new Error(`Failed to start ${command}: ${err.message}`));
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with code ${code}: ${stderr || stdout}`));
    });
  });
}
