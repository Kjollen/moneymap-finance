import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import pb from '../lib/pocketbase';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Проверяем, есть ли уже авторизация в PocketBase
    if (pb.authStore.isValid && pb.authStore.model) {
      const model = pb.authStore.model;
      setUser({
        id: model.id,
        email: model.email || '',
        name: model.name || model.email || 'Пользователь',
      });
    }
    setIsLoading(false);

    // Подписываемся на изменения авторизации
    const unsubscribe = pb.authStore.onChange(() => {
      if (pb.authStore.isValid && pb.authStore.model) {
        const model = pb.authStore.model;
        setUser({
          id: model.id,
          email: model.email || '',
          name: model.name || model.email || 'Пользователь',
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
  };

  const logout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
