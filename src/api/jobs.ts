import { getLogger, type SendEmailOptions } from '@devmoods/express-extras';

import { email, jobs, slack } from './config.js';
import {
  killChargingAboveBatteryLevel,
  updateVehicleSettings,
} from './services.js';

const logger = getLogger();

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
  maxCharge: number;
}

export const killChargingJob = jobs.job(async function killCharging({
  vehicleId,
  maxCharge,
}: KillChargingJobOptions) {
  const isKilled = await killChargingAboveBatteryLevel(vehicleId, maxCharge);

  if (isKilled) {
    logger.info(`Killed charging for vehicle ${vehicleId}`);
    await updateVehicleSettings(vehicleId, (prev) => ({
      ...prev,
      chargeKillerEnabled: false,
    }));
  } else {
    logger.info('Not finished charging yet', { vehicleId });
  }
});
