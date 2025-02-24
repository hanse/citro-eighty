import {
  Alert,
  Button,
  Input,
  NumberInput,
  requiredProp,
  Stack,
  useMutation,
  useQuery,
} from '@devmoods/ui';
import { createContext, use, useRef, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';

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

export function MagicLinkLoginForm() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation(async ({ email }: { email: string }) => {
    await fetch('/auth/passwordless/request-token', {
      method: 'POST',
      body: JSON.stringify({
        email,
      }),
    });

    navigate('/otp');
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await mutation.mutate({
      email: emailRef.current?.value ?? '',
    });
  };

  return (
    <Stack as="form" onSubmit={handleSubmit}>
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
      await fetch(`/auth/passwordless/login`, {
        method: 'POST',
        signal,
        body: JSON.stringify({
          type: 'token',
          token,
        }),
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

export function MagicLinkOtp() {
  const mutation = useMutation(({ otp }: { otp: string }) => {
    return fetch(`/auth/passwordless/login`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'otp',
        otp,
      }),
    });
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const otp = formData.get('otp') as string;
    await mutation.mutate({ otp });

    window.location.href = '/';
  };

  return (
    <Stack as="form" onSubmit={handleSubmit}>
      {mutation.error && (
        <Alert intent="error" title="Invalid OTP" onClose={mutation.reset} />
      )}
      <NumberInput
        name="otp"
        label="OTP"
        hint="Enter the 6-digit code sent to your email"
      />
      <Button type="submit">Verify</Button>
    </Stack>
  );
}
