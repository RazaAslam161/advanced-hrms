export const createApp = (): express.Express => {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(morgan('dev', { stream: { write: (message) => logger.http(message.trim()) } }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(mongoSanitize());

  app.get('/health', (_req, res) => {
    res.status(200).json({
      success: true,
      message: 'Service is healthy',
      data: { uptime: process.uptime() },
    });
  });

  app.use(generalRateLimiter);

  app.use(
    '/uploads',
    express.static(path.resolve(env.UPLOAD_DIR), {
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );

  app.use('/api/v1', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
