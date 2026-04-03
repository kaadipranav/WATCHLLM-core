import type { Env } from './types/env';

export default {
  async fetch(_request: Request, env: Env): Promise<Response> {
    console.log('watchllm-chaos not implemented', {
      environment: env.ENVIRONMENT,
    });

    return Response.json(
      {
        data: null,
        error: {
          message: 'Not implemented',
          code: 501,
        },
      },
      {
        status: 501,
      },
    );
  },
};
