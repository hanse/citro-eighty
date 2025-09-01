/**
 * TypeScript definitions for database tables
 * Auto-generated from database schema
 */

/**
 * Users table interface
 */
export interface Users {
  /** id */
  id: string;
  /** email */
  email: string;
  /** email_verified_at */
  email_verified_at: Date | null;
  /** is_superuser */
  is_superuser: boolean;
  /** created_at */
  created_at: Date | null;
  /** updated_at */
  updated_at: Date | null;
}

/**
 * Vehicles table interface
 */
export interface Vehicles {
  /** id */
  id: string;
  /** external_id */
  external_id: string;
  /** user_id */
  user_id: string;
  /** max_charge */
  max_charge: number;
  /** is_active */
  is_active: boolean;
  /** created_at */
  created_at: Date | null;
  /** updated_at */
  updated_at: Date | null;
  /** action_id */
  action_id: string | null;
}

/**
 * Database schema interface
 * Maps table names to their respective interfaces
 */
export interface DB {
  users: Users;
  vehicles: Vehicles;
}
