import { type SendEmailOptions } from '@devmoods/express-extras';

import { email, jobs, slack } from './config.js';
import { killCharging } from './services.js';

export const sendEmailJob = jobs.job(async function sendEmail(
  options: SendEmailOptions,
) {
  await email.send(options);
});

interface PostSlackMessageJobOptions {
  message: string;
}

export const postSlackMessageJob = jobs.job(function postSlackMessage({
  message,
}: PostSlackMessageJobOptions) {
  return slack.postMessage(message);
});

interface KillChargingJobOptions {
  vehicleId: string;
}

export const killChargingJob = jobs.job(async function killChargingJob({
  vehicleId,
}: KillChargingJobOptions) {
  await killCharging(vehicleId);
});
