import {
  createFaktoryWorker,
  setGlobalLoggerContext,
  useJobId,
} from '@devmoods/express-extras';

import { jobs, redis } from './api/config.js';
import * as appJobs from './api/jobs.js';

setGlobalLoggerContext(() => ({
  jobId: useJobId(),
}));

const worker = await createFaktoryWorker({
  jobs: Object.values(appJobs),
  queueName: jobs.queueName,
});

await redis.connect();
await worker.start();
