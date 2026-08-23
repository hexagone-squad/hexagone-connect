import { spawn } from 'node:child_process';

export interface WorkQualificationStack {
  baseUrl: string;
  stop(): void;
}

async function waitFor(url: string): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Server did not start: ${url}`);
}

function stopProcessGroup(processId: number | undefined): void {
  if (!processId) return;
  try {
    process.kill(-processId, 'SIGTERM');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
  }
}

export async function startWorkQualificationStack(
  uiPort: number,
  apiPort: number,
): Promise<WorkQualificationStack> {
  const api = spawn('pnpm', ['--filter', '@hexagone/api-gateway', 'start'], {
    detached: true,
    env: { ...process.env, PORT: String(apiPort) },
    stdio: 'ignore',
  });
  const ui = spawn(
    'pnpm',
    [
      '--filter',
      '@hexagone/admin-portal',
      'exec',
      'vite',
      '--host',
      '127.0.0.1',
      '--port',
      String(uiPort),
      '--strictPort',
    ],
    {
      detached: true,
      env: { ...process.env, VITE_API_TARGET: `http://127.0.0.1:${apiPort}` },
      stdio: 'ignore',
    },
  );
  const baseUrl = `http://127.0.0.1:${uiPort}/`;
  await Promise.all([waitFor(`${baseUrl}`), waitFor(`http://127.0.0.1:${apiPort}/health`)]);
  return {
    baseUrl,
    stop() {
      stopProcessGroup(ui.pid);
      stopProcessGroup(api.pid);
    },
  };
}
