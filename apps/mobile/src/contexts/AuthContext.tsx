import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { UserDTO } from "@slotix/types";
import { ApiRequestError, loadStoredAccessToken, setAccessToken } from "../services/api-client";
import { getMe } from "../services/users";
import { useT } from "@/i18n";

interface AuthContextValue {
  user: UserDTO | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The access token was already being saved to SecureStore on login (api-client.ts), but
// nothing ever read it back on app launch — every restart silently behaved as logged out
// until the user logged in again, even with a still-valid token sitting in storage.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // isLoading só é verdadeiro no arranque da app. Recarregar a conta mais tarde (depois de
  // entrar, de trocar a foto, de editar os dados) acontece em silêncio: se voltasse a
  // ligar isLoading, o layout de raiz trocaria a navegação inteira por um indicador de
  // carregamento, e qualquer mudança de ecrã pedida nesse instante ficava sem navegador
  // para a tratar (erro "The action 'RESET' ... was not handled by any navigator").
  const refresh = useCallback(async () => {
    try {
      const token = await loadStoredAccessToken();
      if (!token) {
        setUser(null);
        return;
      }

      const me = await getMe();
      setUser(me);
    } catch (error) {
      // Só uma sessão recusada pelo servidor (401) termina a sessão. Uma falha de rede
      // mantém a pessoa como está, em vez de a expulsar por uma quebra momentânea.
      if (error instanceof ApiRequestError && error.statusCode === 401) {
        await setAccessToken(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, isAuthenticated: user !== null, refresh, logout }),
    [user, isLoading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const t = useT();
  const context = useContext(AuthContext);
  if (!context) throw new Error(t("useAuth tem de ser usado dentro de um AuthProvider."));
  return context;
}
