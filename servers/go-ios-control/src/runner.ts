import { spawn } from 'node:child_process';

export type IosRunResult = {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  parsed: unknown | null;
  timedOut: boolean;
};

export type IosRunOptions = {
  udid?: string;
  timeoutMs?: number;
};

const MAX_CAPTURE_BYTES = 8 * 1024 * 1024;

export function buildIosArgs(args: string[], udid?: string): string[] {
  const value = udid?.trim() || process.env.GO_IOS_UDID?.trim();
  return value ? [...args, `--udid=${value}`] : [...args];
}

export function parseJsonMaybe(value: string): unknown | null {
  const text = value.trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function runIos(args: string[], options: IosRunOptions = {}): Promise<IosRunResult> {
  const bin = process.env.GO_IOS_BIN?.trim() || 'ios';
  const fullArgs = buildIosArgs(args, options.udid);
  const timeoutMs = options.timeoutMs ?? 30_000;

  return await new Promise<IosRunResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;

    const child = spawn(bin, fullArgs, {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    const append = (current: string, chunk: Buffer) => {
      if (Buffer.byteLength(current) >= MAX_CAPTURE_BYTES) return current;
      return current + chunk.toString('utf8').slice(0, MAX_CAPTURE_BYTES - Buffer.byteLength(current));
    };

    child.stdout.on('data', (chunk: Buffer) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk: Buffer) => { stderr = append(stderr, chunk); });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    const finish = (exitCode: number | null, extraError?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (extraError) stderr = stderr ? `${stderr}\n${extraError}` : extraError;
      resolve({
        ok: !timedOut && exitCode === 0,
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        parsed: parseJsonMaybe(stdout),
        timedOut
      });
    };

    child.on('error', (error) => finish(null, error.message));
    child.on('close', (code) => finish(code));
  });
}

export function publicRunResult(result: IosRunResult) {
  return {
    ok: result.ok,
    exitCode: result.exitCode,
    timedOut: result.timedOut,
    data: result.parsed ?? (result.stdout || null),
    stderr: result.stderr || null
  };
}
