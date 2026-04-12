import { betterAuth } from 'better-auth';
import type { Env } from '../types/env';

export function createAuth(env: Env) {
  const isDevelopment = env.ENVIRONMENT === 'development';

  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: isDevelopment ? 'http://localhost:8787' : 'https://api.watchllm.dev',
    basePath: '/api/v1/auth',
    trustedOrigins: isDevelopment
      ? ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:8787']
      : ['https://watchllm.dev', 'https://www.watchllm.dev', 'https://watchllm-web.pages.dev'],
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        scope: ['read:user', 'user:email'],
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;