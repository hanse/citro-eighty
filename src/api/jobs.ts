import {
  getLogger,
  sql,
  type SendEmailOptions,
} from '@devmoods/express-extras';

import { email, jobs, postgres, slack } from './config.js';
import {
  deactivateVehicle,
  getEnodeVehicles,
  killChargingAboveBatteryLevel,
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
}

export const killChargingJob = jobs.job(async function killCharging({
  vehicleId,
}: KillChargingJobOptions) {
  const vehicle = await postgres.get<{ max_charge: number; user_id: string }>(
    sql`SELECT max_charge, user_id FROM vehicles WHERE external_id = ${vehicleId}`,
  );

  const isKilled = await killChargingAboveBatteryLevel(
    vehicleId,
    vehicle.max_charge,
  );

  if (isKilled) {
    logger.info(`Killed charging for vehicle ${vehicleId}`);
    await postgres.transaction(async () => {
      await deactivateVehicle(vehicleId);
    });
    await getEnodeVehicles.clear(vehicle.user_id);
  } else {
    logger.info('Not finished charging yet', { vehicleId });
  }
});
