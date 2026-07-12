import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { User } from '../types';

type AuthCtx = {
  user?: User;
  token?: string | null;
  booting: boolean;
  login: (identifier: string, password: string, role: string) => Promise<User>;
  logout: () => Promise<void>;
  setSession: (token: string, user: User) => Promise<void>;
};

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | undefined>();
  const [token, setToken] = useState<string | null>();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem('token');
        const u = await AsyncStorage.getItem('user');

        setToken(t);

        if (t) {
          try {
            const { data } = await api.get('/auth/me');
            setUser(data);
            await AsyncStorage.setItem('user', JSON.stringify(data));
          } catch (error) {
            await AsyncStorage.multiRemove(['token', 'user']);
            setToken(null);
            setUser(undefined);
          }
        } else if (u) {
          try {
            setUser(JSON.parse(u));
          } catch {
            await AsyncStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  async function setSession(t: string, u: User) {
    setToken(t);
    setUser(u);
    await AsyncStorage.multiSet([
      ['token', t],
      ['user', JSON.stringify(u)],
    ]);
  }

  async function login(identifier: string, password: string, role: string) {
    try {
      const { data } = await api.post('/auth/login', {
        identifier,
        password,
        role,
      });

      await setSession(data.token, data.user);
      return data.user as User;
    } catch (error) {
      console.error(error);
      throw new Error('Login failed');
    }
  }

  async function logout() {
    setToken(null);
    setUser(undefined);
    await AsyncStorage.multiRemove(['token', 'user']);
  }

  return (
    <Ctx.Provider
      value={useMemo(
        () => ({ user, token, booting, login, logout, setSession }),
        [user, token, booting]
      )}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
