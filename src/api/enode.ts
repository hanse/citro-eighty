import { getLogger } from '@devmoods/express-extras';
import { createFetch } from '@devmoods/fetch';

import { config } from './config.js';

const logger = getLogger();

interface EnodeOptions {
  clientId: string;
  clientSecret: string;
  apiUrl: string;
  oauthUrl: string;
}

export class Enode {
  #clientId: string;
  #clientSecret: string;

  fetch: ReturnType<typeof createFetch>;
  fetchOauth: ReturnType<typeof createFetch>;

  accessToken: string | null;
  accessTokenExpiresAt: Date | null;

  constructor({ clientId, clientSecret, apiUrl, oauthUrl }: EnodeOptions) {
    this.#clientId = clientId;
    this.#clientSecret = clientSecret;
    this.fetch = createFetch({
      getRootUrl: () => apiUrl,
    });

    this.fetch.intercept({
      response: (response) => {
        logger.info('enode api response', {
          code: response.status,
          data: response.jsonData,
        });
      },
    });

    this.fetchOauth = createFetch({
      getRootUrl: () => oauthUrl,
    });

    this.fetchOauth.intercept({
      response: (response) => {
        logger.info('enode oauth response', {
          code: response.status,
          data: response.jsonData,
        });
      },
    });

    this.accessToken = null;
    this.accessTokenExpiresAt = null;
  }

  async getAccessToken() {
    if (
      this.accessToken &&
      this.accessTokenExpiresAt &&
      this.accessTokenExpiresAt > new Date(Date.now() + 15 * 60 * 1000)
    ) {
      return this.accessToken;
    }

    const credentials = btoa(`${this.#clientId}:${this.#clientSecret}`);

    const data = new FormData();
    data.append('grant_type', 'client_credentials');

    const response = await this.fetchOauth<{
      access_token: string;
      expires_in: number;
    }>('/oauth2/token', {
      method: 'POST',
      body: data,
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    const { access_token: accessToken, expires_in: expiresIn } =
      response.jsonData!;

    this.accessToken = accessToken;
    this.accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    return this.accessToken;
  }

  vehicles = new Vehicles(this);
  users = new Users(this);
}

class Vehicles {
  constructor(private readonly enode: Enode) {}

  async listByUser(userId: string) {
    const accessToken = await this.enode.getAccessToken();

    const response = await this.enode.fetch<PaginatedResponse<VehicleRecord>>(
      `/users/${userId}/vehicles`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.jsonData!;
  }

  async get(vehicleId: string) {
    const accessToken = await this.enode.getAccessToken();

    const response = await this.enode.fetch<VehicleRecord>(
      `/vehicles/${vehicleId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return response.jsonData!;
  }

  async charge(vehicleId: string, payload: { action: 'START' | 'STOP' }) {
    const accessToken = await this.enode.getAccessToken();

    const response = await this.enode.fetch<VehicleChargeResponse>(
      `/vehicles/${vehicleId}/charging`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      },
    );

    return response.jsonData!;
  }
}

interface UsersLinkResponse {
  linkUrl: string;
  linkToken: string;
}

class Users {
  constructor(private readonly enode: Enode) {}
  async link(
    userId: string,
    {
      redirectUri = config.value.ENODE_LINK_REDIRECT_URI,
    }: { redirectUri?: string } = {},
  ) {
    const accessToken = await this.enode.getAccessToken();

    try {
      const response = await this.enode.fetch<UsersLinkResponse>(
        `/users/${userId}/link`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            vendorType: 'vehicle',
            scopes: [
              'vehicle:read:data',
              'vehicle:read:location',
              'vehicle:control:charging',
            ],
            language: 'en-US',
            redirectUri,
          }),
        },
      );

      return response.jsonData!;
    } catch (error: any) {
      logger.warn('link failed', { data: error?.response?.jsonData });
      throw error;
    }
  }
}

export interface VehicleRecord {
  id: string;
  userId: string;
  vendor: string;
  isReachable: boolean | null;
  lastSeen: string;
  information: {
    displayName: string;
    vin: string;
    brand: string;
    model: string;
    year: number;
  };
  chargeState: {
    chargeRate: number | null;
    isFullyCharged: boolean;
    isCharging: boolean;
    batteryLevel: number | null;
    batteryCapacity: 60;
    lastUpdated: string;
    powerDeliveryState: string;
  };
  smartChargingPolicy: Record<string, any>;
  location: Record<string, any>;
}

export interface VehicleChargeResponse {
  id: string;
  userId: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  targetId: string;
  targetType: string;
  kind: string;
  failureReason: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    after: string | null;
    before: string | null;
  };
}
