import React, { createContext, useContext } from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser as useClerkUser
} from "@clerk/clerk-react";
import { Button } from "@cloudflare/kumo";
import {
  CloudCheckIcon,
  HardDriveIcon,
  SignInIcon
} from "@phosphor-icons/react";

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as
  | string
  | undefined;

export interface AppUser {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  fullName: string | null;
  email: string | null;
  isClerkEnabled: boolean;
}

const FallbackAuthContext = createContext<AppUser>({
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  fullName: null,
  email: null,
  isClerkEnabled: false
});

function ClerkUserBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useClerkUser();

  const appUser: AppUser = {
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: user?.id || null,
    fullName: user?.fullName || user?.firstName || null,
    email: user?.primaryEmailAddress?.emailAddress || null,
    isClerkEnabled: true
  };

  return (
    <FallbackAuthContext.Provider value={appUser}>
      {children}
    </FallbackAuthContext.Provider>
  );
}

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  if (CLERK_PUBLISHABLE_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ClerkUserBridge>{children}</ClerkUserBridge>
      </ClerkProvider>
    );
  }

  const fallbackUser: AppUser = {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    fullName: null,
    email: null,
    isClerkEnabled: false
  };

  return (
    <FallbackAuthContext.Provider value={fallbackUser}>
      {children}
    </FallbackAuthContext.Provider>
  );
}

export function useAppUser(): AppUser {
  return useContext(FallbackAuthContext);
}

export function AuthNavControls() {
  const user = useAppUser();

  if (!user.isClerkEnabled) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-kumo-subtle font-medium px-2 py-1 rounded-md bg-kumo-control/60 border border-kumo-line/60">
          <HardDriveIcon size={13} className="text-kumo-subtle" />
          <span>Guest</span>
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <SignedIn>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-kumo-subtle font-medium px-2 py-1 rounded-md bg-kumo-control/60 border border-kumo-line/60">
            <CloudCheckIcon size={13} className="text-kumo-subtle" />
            <span>Cloud Sync</span>
          </span>
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
      <SignedOut>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-kumo-subtle font-medium px-2 py-1 rounded-md bg-kumo-control/60 border border-kumo-line/60">
            <HardDriveIcon size={13} className="text-kumo-subtle" />
            <span>Local</span>
          </span>
          <SignInButton mode="modal">
            <Button
              variant="secondary"
              size="sm"
              icon={<SignInIcon size={13} className="text-kumo-subtle" />}
            >
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button variant="primary" size="sm">
              Sign Up
            </Button>
          </SignUpButton>
        </div>
      </SignedOut>
    </div>
  );
}
