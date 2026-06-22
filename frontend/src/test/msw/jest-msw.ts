type MockMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface MockRequest {
  url: URL;
  params: Record<string, string>;
  json: <T>() => Promise<T>;
}

export interface MockResponse {
  status: number;
  data?: unknown;
  headers: Record<string, string>;
}

export type MockResolver = (
  req: MockRequest,
  res: (...transforms: Array<(response: MockResponse) => MockResponse>) => MockResponse,
  ctx: typeof ctx,
) => MockResponse | Promise<MockResponse>;

export interface MockHandler {
  method: MockMethod;
  url: string;
  resolver: MockResolver;
}

const createHandler =
  (method: MockMethod) =>
  (url: string, resolver: MockResolver): MockHandler => ({
    method,
    url,
    resolver,
  });

export const rest = {
  get: createHandler('get'),
  post: createHandler('post'),
  put: createHandler('put'),
  patch: createHandler('patch'),
  delete: createHandler('delete'),
};

export const ctx = {
  status:
    (status: number) =>
    (response: MockResponse): MockResponse => ({
      ...response,
      status,
    }),
  json:
    (data: unknown) =>
    (response: MockResponse): MockResponse => ({
      ...response,
      data,
      headers: {
        ...response.headers,
        'content-type': 'application/json',
      },
    }),
  cookie:
    (name: string, value: string) =>
    (response: MockResponse): MockResponse => ({
      ...response,
      headers: {
        ...response.headers,
        'set-cookie': `${name}=${value}`,
      },
    }),
};

export const createMockResponse = (
  ...transforms: Array<(response: MockResponse) => MockResponse>
): MockResponse =>
  transforms.reduce<MockResponse>(
    (response, transform) => transform(response),
    {
      status: 200,
      data: undefined,
      headers: {},
    },
  );

