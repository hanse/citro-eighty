import {
  Alert,
  Button,
  Input,
  Loader,
  requiredProp,
  Stack,
  useMutation,
  useQuery,
} from '@devmoods/ui';
import { createContext, use, useRef, type ReactNode } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';

import { fetch } from './fetch.js';

export function useSendVerificationEmailMutation(
  email: string | null | undefined,
) {
  return useMutation(async () => {
    if (!email) {
      throw new Error('Email is required');
    }
    return fetch('/auth/verify-email-request', {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    });
  });
}

export function VerifyEmail() {
  const [queryParams] = useSearchParams();
  const tokenParam = queryParams.get('token') ?? '';
  const [token, email] = atob(tokenParam).split(':');

  const result = useQuery(
    async (signal) => {
      return fetch(`/auth/verify-email`, {
        signal,
        headers: {
          'Content-type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ token, email }),
      });
    },
    [token, email],
  );

  const sendVerificationEmailMutation = useSendVerificationEmailMutation(email);

  if (result.error) {
    return (
      <Stack>
        <Alert intent="error" title="Invalid token">
          The token is invalid or has expired.
        </Alert>
        <Button
          onClick={sendVerificationEmailMutation.mutate}
          isPending={sendVerificationEmailMutation.isPending}
        >
          Send new verification email
        </Button>
      </Stack>
    );
  }

  if (result.loading || result.data == null) {
    return (
      <div>
        <Loader />
      </div>
    );
  }

  return (
    <Stack>
      <Alert intent="success" title="Account verified!">
        Your account is now verified.
      </Alert>
      <Button as="a" href="/">
        Login now
      </Button>
    </Stack>
  );
}

export function MagicLinkLoginForm() {
  const emailRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation(({ email }: { email: string }) => {
    return fetch('/auth/passwordless/request-token', {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    });
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await mutation.mutate({
      email: emailRef.current?.value ?? '',
    });
  };

  return (
    <Stack as="form" onSubmit={handleSubmit} className="dmk-margin-top-m">
      {mutation.resolvedCount > 0 && (
        <Alert
          intent="success"
          title="Check your email"
          onClose={mutation.reset}
        >
          We've sent a link to your email.
        </Alert>
      )}
      {mutation.error && (
        <Alert intent="error" title="Not valid" onClose={mutation.reset} />
      )}
      <Input ref={emailRef} name="email" type="text" label="Email" required />
      <Stack horizontal>
        <Button type="submit" disabled={mutation.isPending}>
          Send link
        </Button>
      </Stack>
    </Stack>
  );
}

type User = NonNullable<(typeof window)['store']['user']>;

const AuthContext = createContext<User | undefined>(undefined);
export function AuthProvider({
  currentUser,
  children,
}: {
  currentUser: User | undefined;
  children: ReactNode;
}) {
  return <AuthContext value={currentUser}>{children}</AuthContext>;
}

export function useCurrentUser() {
  return use(AuthContext);
}

export function SignedIn({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  if (!currentUser) {
    return null;
  }
  return children;
}

/**
 * Redirect to `redirect` or render `null` if the user is already signed in.
 */
export function SignedOut({
  children,
  redirectSignedInTo = false,
}: {
  children: ReactNode;
  redirectSignedInTo?: string | false;
}) {
  const currentUser = useCurrentUser();
  if (currentUser) {
    if (redirectSignedInTo === false) {
      return null;
    }
    return <Navigate to={redirectSignedInTo} />;
  }
  return children;
}

export function VerifyMagicLink() {
  const { token = requiredProp() } = useParams<'token'>();

  const result = useQuery(
    async (signal) => {
      await fetch(`/auth/passwordless/login/${token}`, {
        method: 'POST',
        signal,
      });

      window.location.href = '/';
    },
    [token],
  );

  if (result.error) {
    throw result.error;
  }

  return null;
}
