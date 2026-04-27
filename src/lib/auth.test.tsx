import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook, waitFor, screen } from "@testing-library/react";
import React from "react";
import { AuthProvider, useAuth } from "./auth";
import type { User, Session } from "@supabase/supabase-js";

// vi.mock is hoisted — declare mocks with vi.hoisted so the factory can reference them
const { mockUnsubscribe, mockOnAuthStateChange, mockGetSession, mockSignInWithOtp, mockSignInWithPassword, mockSignOut, mockFrom } =
  vi.hoisted(() => ({
    mockUnsubscribe: vi.fn(),
    mockOnAuthStateChange: vi.fn(),
    mockGetSession: vi.fn(),
    mockSignInWithOtp: vi.fn(),
    mockSignInWithPassword: vi.fn(),
    mockSignOut: vi.fn(),
    mockFrom: vi.fn(),
  }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
      signInWithOtp: mockSignInWithOtp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
    },
    from: mockFrom,
  },
}));

function makeUser(id = "user-1"): User {
  return { id, email: "test@example.com" } as User;
}

function makeSession(user: User): Session {
  return { user, access_token: "tok", refresh_token: "ref", expires_in: 3600, token_type: "bearer" } as Session;
}

function makeRoleChain(data: unknown) {
  const chain: unknown = new Proxy(
    { then: (r: (v: unknown) => unknown) => Promise.resolve({ data }).then(r) },
    { get(t, p) { if (p === "then") return (t as Record<string,unknown>)[p as string]; return () => chain; } }
  );
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no session, no state change
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: mockUnsubscribe } },
  });
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockFrom.mockReturnValue(makeRoleChain(null));
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("useAuth outside AuthProvider", () => {
  it("returns default context with user null and isAdmin false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });
});

describe("AuthProvider", () => {
  it("renders children without crashing", () => {
    render(<AuthProvider><span>child</span></AuthProvider>);
    expect(screen.getByText("child")).toBeDefined();
  });

  it("sets isLoading false after getSession resolves", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("user is null when session is null", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("populates user and session when getSession returns a session", async () => {
    const user = makeUser();
    const session = makeSession(user);
    mockGetSession.mockResolvedValue({ data: { session } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe("user-1"));
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("isAdmin is true when user_roles query returns a row", async () => {
    const user = makeUser();
    const session = makeSession(user);
    mockGetSession.mockResolvedValue({ data: { session } });
    mockFrom.mockReturnValue(makeRoleChain({ role: "admin" }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAdmin).toBe(true));
  });

  it("isAdmin is false when user_roles query returns null", async () => {
    const user = makeUser();
    const session = makeSession(user);
    mockGetSession.mockResolvedValue({ data: { session } });
    mockFrom.mockReturnValue(makeRoleChain(null));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it("calls onAuthStateChange and subscribes on mount", () => {
    renderHook(() => useAuth(), { wrapper });
    expect(mockOnAuthStateChange).toHaveBeenCalledOnce();
  });

  it("unsubscribes from auth listener on unmount", () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("updates user when onAuthStateChange fires", async () => {
    let authCallback: ((event: string, session: Session | null) => void) | undefined;
    mockOnAuthStateChange.mockImplementation((cb: typeof authCallback) => {
      authCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const user = makeUser("user-2");
    const session = makeSession(user);
    authCallback?.("SIGNED_IN", session);

    await waitFor(() => expect(result.current.user?.id).toBe("user-2"));
  });
});

describe("signInWithMagicLink", () => {
  it("calls supabase.auth.signInWithOtp with the email", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await result.current.signInWithMagicLink("hello@test.com");
    expect(mockSignInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "hello@test.com" })
    );
  });

  it("returns error: null on success", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { error } = await result.current.signInWithMagicLink("a@b.com");
    expect(error).toBeNull();
  });

  it("returns an Error instance when supabase returns an error", async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: "rate limited" } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { error } = await result.current.signInWithMagicLink("a@b.com");
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("rate limited");
  });
});

describe("signInWithPassword", () => {
  it("calls supabase.auth.signInWithPassword with email and password", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await result.current.signInWithPassword("user@test.com", "s3cr3t");
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: "user@test.com", password: "s3cr3t" });
  });

  it("returns error: null on success", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { error } = await result.current.signInWithPassword("user@test.com", "s3cr3t");
    expect(error).toBeNull();
  });

  it("returns an Error instance when supabase returns an error", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { error } = await result.current.signInWithPassword("user@test.com", "wrong");
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("Invalid login credentials");
  });

  it("does not log or persist the password", async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null });
    const logSpy = vi.spyOn(console, "log");
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await result.current.signInWithPassword("user@test.com", "s3cr3t");
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining("s3cr3t"));
    expect(localStorage.getItem("s3cr3t")).toBeNull();
    logSpy.mockRestore();
  });
});

describe("signOut", () => {
  it("calls supabase.auth.signOut", async () => {
    mockSignOut.mockResolvedValue({});
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await result.current.signOut();
    expect(mockSignOut).toHaveBeenCalled();
  });
});
