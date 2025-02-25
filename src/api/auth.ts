import * as crypto from 'node:crypto';

import {
  createAuth,
  DoesNotExistError,
  PasswordlessAuthProvider,
  RedisTokenStorage,
  sql,
} from '@devmoods/express-extras';
import { snakeToCamelCase } from '@devmoods/fetch';

import { config, postgres, redis } from './config.js';
import { sendEmailJob } from './jobs.js';

const sha256 = (input: string) =>
  crypto.createHash('sha256').update(input).digest('hex');

type User = Awaited<ReturnType<typeof getUserById>>;

export const filterUser = (u: User) => ({
  id: u.id,
  email: u.email,
});

async function getUserById(id: string) {
  const user = await postgres.get<{
    id: string;
    email: string;
    is_superuser: boolean;
  }>(sql`SELECT id, email, is_superuser FROM users WHERE id = ${id}`);

  return snakeToCamelCase(user);
}

export const auth = createAuth({
  tokenStorage: new RedisTokenStorage(redis),
  getUserById,
  filterUser,
  providers: [
    PasswordlessAuthProvider({
      getUserByEmail: async (email) => {
        return postgres.transaction(async () => {
          const userId = sha256(email);
          try {
            return await getUserById(userId);
          } catch (error) {
            if (error instanceof DoesNotExistError) {
              await postgres.insert(
                sql`INSERT INTO users ${sql.spreadInsert({ id: userId, email })}`,
              );
              return await getUserById(userId);
            }
            throw error;
          }
        });
      },
      onLoginRequest: async (user, temporaryToken, otp) => {
        await sendEmailJob.delay({
          to: user.email,
          subject: 'Your login to Citro 80.',
          message: passwordlessLoginTemplate(user, temporaryToken, otp),
        });
      },
    }),
  ],
});

function passwordlessLoginTemplate(
  user: User,
  temporaryToken: string,
  otp: string,
) {
  return `
Hi!

Your OTP for Citro 80 is:

${otp}

The code is valid for 5 minutes.

---

On the web, you can also use this link:

${config.value.PUBLIC_URL}/auth/magic-link/${temporaryToken}

The link will expire in 1 hour.
  `;
}
