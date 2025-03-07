import 'dotenv/config';

import { getLogger, sql } from '@devmoods/express-extras';

import { cache, config, postgres } from './config.js';
import { Enode } from './enode.js';

const logger = getLogger();

export const enode = new Enode({
  clientId: config.value.ENODE_CLIENT_ID,
  clientSecret: config.value.ENODE_CLIENT_SECRET,
  apiUrl: config.value.ENODE_API_URL,
  oauthUrl: config.value.ENODE_OAUTH_URL,
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

export async function getVehicleSettings(vehicleIds?: string[]) {
  const query = sql`SELECT external_id, max_charge, is_active FROM vehicles`;

  if (vehicleIds != null) {
    query.append(sql` WHERE external_id = ANY(${vehicleIds})`);
  }

  const vehicles = await postgres.all<{
    external_id: string;
    max_charge: number;
    is_active: boolean;
  }>(query);

  return Object.fromEntries(
    vehicles.map((vehicle) => [
      vehicle.external_id,
      { maxCharge: vehicle.max_charge, isActive: vehicle.is_active },
    ]),
  );
}

interface VehicleSettings {
  maxCharge: number;
  isActive: boolean;
}

export async function saveVehicle(
  userId: string,
  vehicleId: string,
  settings: Partial<VehicleSettings>,
) {
  await postgres.query(
    sql`SELECT * FROM vehicles WHERE external_id = ${vehicleId} FOR UPDATE`,
  );

  const updates = {
    user_id: userId,
    max_charge: settings.maxCharge,
    is_active: settings.isActive,
    updated_at: new Date(),
  };

  await postgres.query(sql`
    INSERT INTO vehicles ${sql.spreadInsert({
      external_id: vehicleId,
      ...updates,
    })}
    ON CONFLICT (external_id) DO UPDATE
    SET ${sql.spreadUpdate(updates)}
  `);
}

export async function deactivateVehicle(vehicleId: string) {
  await postgres.query(sql`
    UPDATE vehicles
    SET is_active = FALSE, updated_at = ${new Date()}
    WHERE external_id = ${vehicleId}
  `);
}

export const getEnodeVehicles = cache.decorate(
  { expiresMs: 60 * 1000 },
  (userId: string) => enode.vehicles.listByUser(userId),
);
