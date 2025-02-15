-- Migration users created Fri Feb 14 2025 17:18:59 GMT+0100 (Central European Standard Time)

CREATE TABLE users (
  id text primary key,
  email text not null unique CHECK (char_length(email) <= 255),
  email_verified_at timestamptz,
  is_superuser boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

CREATE TABLE vehicles (
  id bigserial primary key,
  external_id text not null unique,
  user_id text not null references users(id),
  max_charge integer not null,
  is_active boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- ROLLBACK --

DROP TABLE vehicles;
DROP TABLE users;