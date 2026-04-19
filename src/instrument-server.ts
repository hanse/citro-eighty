import { addDefaultLoggerOutput, metrics } from '@devmoods/express-extras';
import {
  initSentry,
  SentryLoggerAdapter,
  SentryMetricsAdapter,
} from '@devmoods/sentry';

await initSentry();

addDefaultLoggerOutput(new SentryLoggerAdapter());
metrics.subscribe(new SentryMetricsAdapter());
