import { betterAuth } from 'better-auth';
import type { Env } from '../types/env';

const PASSWORD_SCHEME = 'pbkdf2-sha256';
const PASSWORD_ITERATIONS = 60_000;
const PASSWORD_BYTES = 32;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    diff |= left ^ right;
  }
  return diff === 0;
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const normalizedSalt = new Uint8Array(salt);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password.normalize('NFKC')),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: normalizedSalt,
    },
    keyMaterial,
    PASSWORD_BYTES * 8
  );

  return new Uint8Array(bits);
}

async function hashCredentialPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);
  return `${PASSWORD_SCHEME}:${PASSWORD_ITERATIONS}:${bytesToBase64(salt)}:${bytesToBase64(digest)}`;
}

async function verifyCredentialPassword(data: { hash: string; password: string }): Promise<boolean> {
  const [scheme, iterationPart, saltPart, digestPart] = data.hash.split(':');
  if (!scheme || !iterationPart || !saltPart || !digestPart) {
    return false;
  }

  if (scheme !== PASSWORD_SCHEME) {
    return false;
  }

  const iterations = Number.parseInt(iterationPart, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const salt = base64ToBytes(saltPart);
  const expectedDigest = base64ToBytes(digestPart);
  const actualDigest = await derivePasswordHash(data.password, salt, iterations);
  return constantTimeEquals(actualDigest, expectedDigest);
}

export function createAuth(env: Env) {
  const isDevelopment = env.ENVIRONMENT === 'development';
  const socialProviders: {
    github: {
      clientId: string;
      clientSecret: string;
      scope: string[];
    };
    google?: {
      clientId: string;
      clientSecret: string;
      scope: string[];
    };
  } = {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      scope: ['read:user', 'user:email'],
    },
  };

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      scope: ['openid', 'email', 'profile'],
    };
  }

  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: isDevelopment ? 'http://localhost:8787' : 'https://api.watchllm.dev',
    basePath: '/api/v1/auth',
    trustedOrigins: isDevelopment
      ? ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8787']
      : ['https://watchllm.dev', 'https://www.watchllm.dev', 'https://watchllm-web.pages.dev'],
    emailAndPassword: {
      enabled: true,
      password: {
        hash: hashCredentialPassword,
        verify: verifyCredentialPassword,
      },
    },
    socialProviders,
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;