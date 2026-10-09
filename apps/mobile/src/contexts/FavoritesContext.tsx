import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { FavoriteDTO } from "@slotix/types";
import { addFavorite, listFavorites, removeFavorite } from "../services/favorites";
import { tapFeedback } from "../services/haptics";
import { useT } from "@/i18n";

interface FavoritesContextValue {
  favorites: FavoriteDTO[];
  loading: boolean;
  isFavorite: (businessId: string) => boolean;
  toggleFavorite: (businessId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

// Single source of truth for "is this business favorited", shared by every screen that
// shows a heart icon (explore, search, space, favorites) — before this, each screen kept
// its own local favorites array and they drifted out of sync with each other.
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listFavorites();
      setFavorites(data);
    } catch {
      // Not logged in yet (mounts once at app start, before auth) or a transient
      // failure — favorites just stay empty until the next successful refresh, e.g.
      // right after login.
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const favoriteIds = useMemo(() => new Set(favorites.map((favorite) => favorite.businessId)), [favorites]);

  const isFavorite = useCallback((businessId: string) => favoriteIds.has(businessId), [favoriteIds]);

  const toggleFavorite = useCallback(
    async (businessId: string) => {
      const wasFavorite = favoriteIds.has(businessId);
      tapFeedback();

      if (wasFavorite) {
        setFavorites((current) => current.filter((favorite) => favorite.businessId !== businessId));
      }

      try {
        if (wasFavorite) {
          await removeFavorite(businessId);
        } else {
          const favorite = await addFavorite(businessId);
          setFavorites((current) => [...current, favorite]);
        }
      } catch {
        // Roll back to whatever the server actually has, rather than trusting the
        // optimistic update after a failed request.
        await refresh();
      }
    },
    [favoriteIds, refresh],
  );

  const value = useMemo(
    () => ({ favorites, loading, isFavorite, toggleFavorite, refresh }),
    [favorites, loading, isFavorite, toggleFavorite, refresh],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const t = useT();
  const context = useContext(FavoritesContext);
  if (!context) throw new Error(t("useFavorites tem de ser usado dentro de um FavoritesProvider."));
  return context;
}
