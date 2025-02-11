import { sentryOptions } from '@devmoods/express-extras';
import * as Sentry from '@sentry/node';

Sentry.init(sentryOptions());
