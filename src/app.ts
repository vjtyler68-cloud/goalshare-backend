import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import router from './app/routes';
import path from 'path';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { StripeWebHook } from './app/utils/StripeUtils';
const app: Application = express();

app.post(
  '/api/v1/stripe/webhook',
  express.raw({ type: 'application/json' }),
  StripeWebHook,
);

app.use(
  cors({
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
      'Cache-Control',
      'X-CSRF-Token',
      'User-Agent',
      'Content-Length',
    ],
    credentials: true,
  }),
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  keyGenerator: (req: any) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipArray = forwardedFor ? forwardedFor.split(/\s*,\s*/) : [];
    const ipAddress =
      ipArray.length > 0 ? ipArray[0] : req.connection.remoteAddress;
    return ipAddress;
  },
  message: {
    success: false,
    message:
      'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

//parser
app.use(express.json());
app.use(cookieParser());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

app.get('/', (req: Request, res: Response) => {
  res.send({
    Message: 'The server is running. . .',
  });
});

app.use('/api/v1', apiLimiter, router);

app.use(globalErrorHandler);
app.use('/upload', express.static(path.join(__dirname, 'app', 'upload')));
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'API NOT FOUND!',
    error: {
      path: req.originalUrl,
      message: 'Your requested path is not found!',
    },
  });
});

export default app;
