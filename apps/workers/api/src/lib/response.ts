import type { ApiError, ApiSuccess } from '@watchllm/types';

export function ok<T>(data: T): ApiSuccess<T> {
  return { data, error: null };
}

export function err(message: string, code: number): ApiError {
  return { data: null, error: { message, code } };
}
