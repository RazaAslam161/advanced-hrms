import type { AxiosAdapter, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { api } from '../../lib/api';
import { createMockResponse, ctx, type MockHandler, type MockRequest } from './jest-msw';

const toRequestUrl = (config: InternalAxiosRequestConfig): URL => {
  const requestUrl = config.url ?? '/';
  if (/^https?:\/\//i.test(requestUrl)) {
    return new URL(requestUrl);
  }

  const baseUrl = (config.baseURL ?? 'http://localhost').replace(/\/$/, '');
  const path = requestUrl.startsWith('/') ? requestUrl : `/${requestUrl}`;
  return new URL(`${baseUrl}${path}`);
};

const parseRequestBody = (data: unknown) => {
  if (typeof data !== 'string') {
    return data;
  }

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
};

const matchPath = (handlerUrl: string, requestUrl: URL) => {
  const expected = new URL(handlerUrl);
  if (expected.origin !== requestUrl.origin) {
    return null;
  }

  const expectedParts = expected.pathname.split('/').filter(Boolean);
  const actualParts = requestUrl.pathname.split('/').filter(Boolean);
  if (expectedParts.length !== actualParts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < expectedParts.length; index += 1) {
    const expectedPart = expectedParts[index];
    const actualPart = actualParts[index];

    if (expectedPart.startsWith(':')) {
      params[expectedPart.slice(1)] = actualPart;
      continue;
    }

    if (expectedPart !== actualPart) {
      return null;
    }
  }

  return params;
};

const createAxiosError = (message: string, config: InternalAxiosRequestConfig, response?: AxiosResponse): AxiosError => {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.config = config;
  error.response = response;
  error.toJSON = () => ({ message });
  return error;
};

export const setupServer = (...initialHandlers: MockHandler[]) => {
  let handlers = [...initialHandlers];
  let originalAdapter: AxiosAdapter | undefined;

  const findHandler = (method: string, url: URL) => {
    for (let index = handlers.length - 1; index >= 0; index -= 1) {
      const handler = handlers[index];
      if (handler.method !== method) {
        continue;
      }

      const params = matchPath(handler.url, url);
      if (params) {
        return { handler, params };
      }
    }

    return null;
  };

  return {
    listen: () => {
      originalAdapter = api.defaults.adapter;
      api.defaults.adapter = async (config) => {
        const method = String(config.method ?? 'get').toLowerCase();
        const url = toRequestUrl(config);
        const matched = findHandler(method, url);

        if (!matched) {
          throw createAxiosError(`Unhandled request: ${method.toUpperCase()} ${url.toString()}`, config);
        }

        const request: MockRequest = {
          url,
          params: matched.params,
          json: async <T>() => parseRequestBody(config.data) as T,
        };

        const mockResponse = await matched.handler.resolver(request, createMockResponse, ctx);
        const response: AxiosResponse = {
          data: mockResponse.data,
          status: mockResponse.status,
          statusText: String(mockResponse.status),
          headers: mockResponse.headers,
          config,
          request: {},
        };

        if (mockResponse.status >= 400) {
          throw createAxiosError(`Request failed with status code ${mockResponse.status}`, config, response);
        }

        return response;
      };
    },
    resetHandlers: () => {
      handlers = [...initialHandlers];
    },
    use: (...runtimeHandlers: MockHandler[]) => {
      handlers.push(...runtimeHandlers);
    },
    close: () => {
      api.defaults.adapter = originalAdapter;
    },
  };
};
