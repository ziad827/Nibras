/* eslint-disable @typescript-eslint/no-explicit-any */
import boxen from 'boxen';
import picocolors from 'picocolors';

export type BoxKind = 'success' | 'error' | 'info' | 'warning';

const ICONS: Record<BoxKind, string> = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
  warning: '⚠',
};

const COLORS: Record<BoxKind, (s: string) => string> = {
  success: picocolors.green,
  error: picocolors.red,
  info: picocolors.cyan,
  warning: picocolors.yellow,
};

const BORDER_COLORS: Record<BoxKind, string> = {
  success: 'green',
  error: 'red',
  info: 'cyan',
  warning: 'yellow',
};

function formatValue(value: string): string {
  const leadingSpaces = value.match(/^\s*/)?.[0] ?? '';
  const content = value.slice(leadingSpaces.length);
  if (!content) {
    return value;
  }
  return `${leadingSpaces}${picocolors.white(content)}`;
}

function formatInstruction(line: string): string {
  const leadingSpaces = line.match(/^\s*/)?.[0] ?? '';
  const trimmed = line.slice(leadingSpaces.length);
  if (!trimmed) {
    return '';
  }
  if (trimmed.endsWith(':')) {
    return picocolors.dim(line);
  }

  const divider = trimmed.indexOf('—');
  if (divider !== -1) {
    const command = trimmed.slice(0, divider).trimEnd();
    const description = trimmed.slice(divider + 1).trim();
    return `${leadingSpaces}${picocolors.cyan(command)} ${picocolors.dim('—')} ${picocolors.dim(description)}`;
  }

  if (/^(cd|nibras|gh|git|npm|node|fly|curl)\b/.test(trimmed)) {
    return `${leadingSpaces}${picocolors.cyan(trimmed)}`;
  }

  return picocolors.dim(line);
}

export function printBox(
  title: string,
  lines: string[],
  kind: BoxKind,
  plain: boolean,
): void {
  if (plain) {
    console.log(`[${kind.toUpperCase()}] ${title}`);
    for (const line of lines) {
      if (line) console.log(`  ${line}`);
    }
    return;
  }

  const colorFn = COLORS[kind];
  const icon = ICONS[kind];
  const header = colorFn(`${icon}  ${title}`);

  const body = lines
    .map((line) => {
      if (!line) return '';
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0 && colonIdx < 22) {
        const label = picocolors.dim(line.slice(0, colonIdx + 1));
        const value = line.slice(colonIdx + 1);
        return `${label}${formatValue(value)}`;
      }
      return formatInstruction(line);
    })
    .join('\n');

  const content = body.trim() ? `${header}\n\n${body}` : header;

  // boxen v5: options object — use any cast to avoid strict type errors on borderColor
  const opts: any = {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    margin: { top: 1, bottom: 1, left: 0, right: 0 },
    borderStyle: 'round',
    borderColor: BORDER_COLORS[kind],
  };

  console.log(boxen(content, opts));
}
