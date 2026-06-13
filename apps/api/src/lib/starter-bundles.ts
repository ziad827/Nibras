import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { resolveRepoDirStorageKey } from './cs106l';

function shouldExcludeRelativePath(relativePath: string): boolean {
  const segments = relativePath.split('/').filter(Boolean);
  return segments.includes('solutions') || segments.includes('.git');
}

async function addDirectoryToZip(
  zip: JSZip,
  sourceDir: string,
  prefix = '',
): Promise<void> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (shouldExcludeRelativePath(relativePath)) {
      continue;
    }
    const absolutePath = path.join(sourceDir, entry.name);
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, absolutePath, relativePath);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    zip.file(relativePath, await fs.readFile(absolutePath));
  }
}

export async function buildStarterBundleFromStorageKey(
  storageKey: string,
): Promise<Buffer> {
  const sourceDir = resolveRepoDirStorageKey(storageKey);
  const stats = await fs.stat(sourceDir);
  if (!stats.isDirectory()) {
    throw new Error(`Starter bundle source is not a directory: ${storageKey}`);
  }

  const zip = new JSZip();
  await addDirectoryToZip(zip, sourceDir);
  return zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
}
