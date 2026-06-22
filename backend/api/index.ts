type HeaderValue = string | string[] | undefined;

interface VercelLikeRequest {
  method?: string;
  url?: string;
  headers: Record<string, HeaderValue>;
}

interface VercelLikeResponse {
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelLikeResponse;
  json: (body: unknown) => void;
}

const getRailwayUrl = () => process.env.RAILWAY_BACKEND_URL ?? process.env.RAILWAY_PUBLIC_DOMAIN ?? '';

export default function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  const railwayUrl = getRailwayUrl();

  res.setHeader('Cache-Control', 'no-store');

  res.status(200).json({
    success: true,
    message: 'NEXUS HRMS backend is served from Railway. This Vercel project is a compatibility placeholder.',
    data: {
      method: req.method ?? 'GET',
      path: req.url ?? '/',
      railwayBackendUrl: railwayUrl || null,
      note: railwayUrl
        ? 'Use the configured Railway backend URL for API requests.'
        : 'Set RAILWAY_BACKEND_URL in this Vercel project if you want the placeholder to expose the live Railway API URL.',
    },
  });
}
