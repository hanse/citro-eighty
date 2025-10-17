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

await redis.connect();

const worker = await createFaktoryWorker({
  jobs: Object.values(appJobs),
  queues: jobs.queues,
});

await worker.start();
await redis.quit();
