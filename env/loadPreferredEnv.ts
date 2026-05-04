import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function readEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
}

export function loadPreferredEnv(mode?: string, root = process.cwd()): Record<string, string> {
  const files = [
    mode ? `.env.${mode}.local` : null,
    '.env.local',
    mode ? `.env.${mode}` : null,
    '.env',
  ].filter((value): value is string => Boolean(value));

  const merged: Record<string, string> = {};
  for (const relativePath of files) {
    Object.assign(merged, readEnvFile(path.join(root, relativePath)));
  }

  return merged;
}

export function applyPreferredEnvToProcessEnv(mode?: string, root = process.cwd()): void {
  const merged = loadPreferredEnv(mode, root);

  for (const [key, value] of Object.entries(merged)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function buildViteDefineEnv(
  mode?: string,
  root = process.cwd(),
): Record<string, string> {
  const merged = loadPreferredEnv(mode, root);
  const define: Record<string, string> = {};

  for (const [key, value] of Object.entries(merged)) {
    if (!key.startsWith('VITE_') && key !== 'GEMINI_API_KEY') continue;
    define[`import.meta.env.${key}`] = JSON.stringify(value);
    define[`process.env.${key}`] = JSON.stringify(value);
  }

  return define;
}
