import 'dotenv/config';

import { getLogger } from '@devmoods/express-extras';

import { redis } from './config.js';
import { Enode } from './enode.js';

const logger = getLogger();

export const enode = new Enode({
  clientId: process.env.ENODE_CLIENT_ID!,
  clientSecret: process.env.ENODE_CLIENT_SECRET!,
  apiUrl: process.env.ENODE_API_URL!,
  oauthUrl: process.env.ENODE_OAUTH_URL!,
});

export async function killChargingAboveBatteryLevel(
  vehicleId: string,
  desiredBatteryLevel: number,
): Promise<boolean> {
  const vehicle = await enode.vehicles.get(vehicleId);
  const chargeState = vehicle.chargeState;

  if (!chargeState.isCharging || !chargeState.batteryLevel) {
    return false;
  }

  if (chargeState.batteryLevel < desiredBatteryLevel) {
    return false;
  }

  try {
    const data = await enode.vehicles.charge(vehicle.id, { action: 'STOP' });
    logger.info('Stopped charging', data);
    return true;
  } catch (error: any) {
    logger.error(error);
  }

  return false;
}

export async function getVehicleSettings(vehicleIds: string[]) {
  const settingsByVehicleId = Object.fromEntries(
    await Promise.all(
      vehicleIds.map(async (vehicleId) => {
        const settings = (await redis.get(
          `vehicle:${vehicleId}:settings`,
        )) as string;
        return [
          vehicleId,
          JSON.parse(settings || '{}') as {
            maxCharge: number;
            chargeKillerEnabled: boolean;
          },
        ] as const;
      }),
    ),
  );
  return settingsByVehicleId;
}

interface VehicleSettings {
  maxCharge: number;
  chargeKillerEnabled: boolean;
}

export async function updateVehicleSettings(
  vehicleId: string,
  settings: VehicleSettings | ((prev: VehicleSettings) => VehicleSettings),
) {
  const current = await getVehicleSettings([vehicleId]);
  await redis.set(
    `vehicle:${vehicleId}:settings`,
    JSON.stringify(
      typeof settings === 'function' ? settings(current[vehicleId]) : settings,
    ),
  );
  await redis.sAdd('vehicles', vehicleId);
  return settings;
}
