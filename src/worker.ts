import {
  createFaktoryWorker,
  setGlobalLoggerContext,
  useJobId,
} from '@devmoods/express-extras';

import { jobs } from './api/config.js';
import * as appJobs from './api/jobs.js';

setGlobalLoggerContext(() => ({
  jobId: useJobId(),
}));

const worker = await createFaktoryWorker({
  jobs: Object.values(appJobs),
  queueName: jobs.queueName,
});

await worker.start();
