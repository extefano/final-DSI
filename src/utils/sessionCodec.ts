import type { ProgressState, ThemeMode } from '../types/dsi';

interface CompactSessionPayload {
  v: 1;
  c: string[]; // completedIds
  r: Record<string, number>; // reviewQueue
  s: number; // streak
  b: number; // bestStreak
  a: number; // totalAttempts
  ok: number; // totalCorrect
  t?: ThemeMode;
}

const CODE_PREFIX = 'DSI-';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const normalized = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function compressWithStream(
  inputBytes: Uint8Array,
  format: 'deflate-raw' | 'deflate'
): Promise<Uint8Array> {
  const copy = new Uint8Array(inputBytes.byteLength);
  copy.set(inputBytes);
  const compressedStream = new Blob([copy])
    .stream()
    .pipeThrough(new CompressionStream(format));
  const buffer = await new Response(compressedStream).arrayBuffer();
  return new Uint8Array(buffer);
}

async function decompressWithStream(
  bytes: Uint8Array,
  format: 'deflate-raw' | 'deflate'
): Promise<string> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const decompressedStream = new Blob([copy])
    .stream()
    .pipeThrough(new DecompressionStream(format));
  return new Response(decompressedStream).text();
}

export async function encodeSessionCode(
  progress: ProgressState,
  theme: ThemeMode
): Promise<string> {
  const payload: CompactSessionPayload = {
    v: 1,
    c: progress.completedIds,
    r: progress.reviewQueue,
    s: progress.streak,
    b: progress.bestStreak,
    a: progress.totalAttempts,
    ok: progress.totalCorrect,
    t: theme,
  };

  const json = JSON.stringify(payload);
  const inputBytes = new TextEncoder().encode(json);

  if (typeof CompressionStream !== 'undefined') {
    for (const [flag, format] of [
      ['z', 'deflate-raw'],
      ['d', 'deflate'],
    ] as const) {
      try {
        const compressed = await compressWithStream(inputBytes, format);
        return `${CODE_PREFIX}${flag}${bytesToBase64Url(compressed)}`;
      } catch {
        // Try next compression format or raw fallback
      }
    }
  }

  return `${CODE_PREFIX}r${bytesToBase64Url(inputBytes)}`;
}

export function extractSessionCode(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';

  const hashMatch = trimmed.match(/#s=([^&\s]+)/i);
  if (hashMatch?.[1]) {
    try {
      return decodeURIComponent(hashMatch[1]).trim();
    } catch {
      return hashMatch[1].trim();
    }
  }

  return trimmed;
}

export async function decodeSessionCode(rawInput: string): Promise<
  | { ok: true; progress: ProgressState; theme?: ThemeMode }
  | { ok: false; error: string }
> {
  try {
    const code = extractSessionCode(rawInput);
    if (!code.startsWith(CODE_PREFIX) || code.length < CODE_PREFIX.length + 3) {
      return {
        ok: false,
        error: 'El código debe comenzar con "DSI-" (o ser un enlace #s=DSI-...).',
      };
    }

    const body = code.slice(CODE_PREFIX.length);
    const modeFlag = body[0];
    const encoded = body.slice(1);
    const bytes = base64UrlToBytes(encoded);

    let jsonText: string;
    if (modeFlag === 'z') {
      jsonText = await decompressWithStream(bytes, 'deflate-raw');
    } else if (modeFlag === 'd') {
      jsonText = await decompressWithStream(bytes, 'deflate');
    } else if (modeFlag === 'r') {
      jsonText = new TextDecoder().decode(bytes);
    } else {
      jsonText = await decompressWithStream(base64UrlToBytes(body), 'deflate-raw');
    }

    const parsed = JSON.parse(jsonText) as Partial<CompactSessionPayload>;
    if (parsed.v !== 1 || !Array.isArray(parsed.c) || typeof parsed.r !== 'object' || !parsed.r) {
      return {
        ok: false,
        error: 'El código tiene un formato incompatible o está incompleto.',
      };
    }

    const sanitizedReview: Record<string, number> = {};
    for (const [key, val] of Object.entries(parsed.r)) {
      if (typeof key === 'string' && typeof val === 'number' && val >= 0 && val < 2) {
        sanitizedReview[key] = Math.floor(val);
      }
    }

    return {
      ok: true,
      progress: {
        completedIds: Array.from(new Set(parsed.c.filter((id) => typeof id === 'string'))),
        reviewQueue: sanitizedReview,
        streak: typeof parsed.s === 'number' && parsed.s >= 0 ? parsed.s : 0,
        bestStreak: typeof parsed.b === 'number' && parsed.b >= 0 ? parsed.b : 0,
        totalAttempts: typeof parsed.a === 'number' && parsed.a >= 0 ? parsed.a : 0,
        totalCorrect: typeof parsed.ok === 'number' && parsed.ok >= 0 ? parsed.ok : 0,
        lastUpdated: Date.now(),
      },
      theme: parsed.t === 'dark' || parsed.t === 'light' ? parsed.t : undefined,
    };
  } catch {
    return {
      ok: false,
      error: 'No se pudo descomprimir el código. Verificá que lo hayas copiado completo.',
    };
  }
}

export function buildSessionShareUrl(code: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#s=${encodeURIComponent(code)}`;
}
