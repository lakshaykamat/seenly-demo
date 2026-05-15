import { COMPANY } from "./generators/company";

type AuthEvent =
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "PASSWORD_RECOVERY";

interface MockUser {
  id: string;
  email: string;
  identities: Array<{ id: string; provider: string }>;
}

interface MockSession {
  user: MockUser;
  access_token: string;
}

interface Subscription {
  unsubscribe: () => void;
}

interface AuthResult<T> {
  data: T;
  error: { message: string } | null;
}

const STORAGE_KEY = "seenly.mock-session";
const DEFAULT_USER: MockUser = {
  id: COMPANY.user.id,
  email: COMPANY.user.email,
  identities: [{ id: "id_email_primary", provider: "email" }],
};

let listeners: Array<(event: AuthEvent, session: MockSession | null) => void> =
  [];

function loadSession(): MockSession | null {
  if (typeof window === "undefined") {
    return { user: DEFAULT_USER, access_token: "mock-access-token" };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockSession;
  } catch {
    // fall through
  }
  const session = { user: DEFAULT_USER, access_token: "mock-access-token" };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

function saveSession(session: MockSession | null): void {
  if (typeof window === "undefined") return;
  if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(STORAGE_KEY);
}

function emit(event: AuthEvent, session: MockSession | null): void {
  listeners.forEach((cb) => cb(event, session));
}

function delay(min = 220, max = 540): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, Math.floor(min + Math.random() * (max - min)))
  );
}

export function createMockClient() {
  return {
    auth: {
      async getUser(): Promise<AuthResult<{ user: MockUser | null }>> {
        const session = loadSession();
        return { data: { user: session?.user ?? null }, error: null };
      },
      async getSession(): Promise<AuthResult<{ session: MockSession | null }>> {
        return { data: { session: loadSession() }, error: null };
      },
      async signInWithPassword(input: {
        email: string;
        password: string;
      }): Promise<AuthResult<{ user: MockUser; session: MockSession }>> {
        await delay();
        const session: MockSession = {
          user: { ...DEFAULT_USER, email: input.email },
          access_token: "mock-access-token",
        };
        saveSession(session);
        emit("SIGNED_IN", session);
        return { data: { user: session.user, session }, error: null };
      },
      async signUp(input: {
        email: string;
        password: string;
      }): Promise<
        AuthResult<{ user: MockUser | null; session: MockSession | null }>
      > {
        await delay();
        const session: MockSession = {
          user: {
            id: `usr_${Math.random().toString(36).slice(2, 14)}`,
            email: input.email,
            identities: [
              {
                id: `id_${Math.random().toString(36).slice(2, 10)}`,
                provider: "email",
              },
            ],
          },
          access_token: "mock-access-token",
        };
        saveSession(session);
        emit("SIGNED_IN", session);
        return { data: { user: session.user, session }, error: null };
      },
      async signOut(): Promise<AuthResult<Record<string, never>>> {
        await delay(120, 260);
        saveSession(null);
        emit("SIGNED_OUT", null);
        return { data: {}, error: null };
      },
      async resetPasswordForEmail(
        _email: string,
        _options?: { redirectTo?: string }
      ): Promise<AuthResult<Record<string, never>>> {
        await delay();
        return { data: {}, error: null };
      },
      async updateUser(_input: {
        password?: string;
      }): Promise<AuthResult<{ user: MockUser | null }>> {
        await delay();
        const session = loadSession();
        return { data: { user: session?.user ?? null }, error: null };
      },
      async refreshSession(): Promise<
        AuthResult<{ session: MockSession | null }>
      > {
        await delay(80, 200);
        const session = loadSession();
        emit("TOKEN_REFRESHED", session);
        return { data: { session }, error: null };
      },
      onAuthStateChange(
        cb: (event: AuthEvent, session: MockSession | null) => void
      ): { data: { subscription: Subscription } } {
        listeners.push(cb);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners = listeners.filter((l) => l !== cb);
              },
            },
          },
        };
      },
      async exchangeCodeForSession(
        _code: string
      ): Promise<AuthResult<{ session: MockSession | null }>> {
        await delay();
        const session = loadSession();
        return { data: { session }, error: null };
      },
    },
  };
}

export type MockClient = ReturnType<typeof createMockClient>;
