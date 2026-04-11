'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from './api';

type User = {
  id: string;
  email: string;
  name?: string;
  image?: string;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  loginWithGitHub: () => void;
  refetch: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  signOut: async () => {},
  loginWithGitHub: () => {},
  refetch: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const { user } = await auth.getSession();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();
  }, [fetchUser]);

  const signOut = async () => {
    await auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut,
        loginWithGitHub: auth.loginWithGitHub,
        refetch: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
