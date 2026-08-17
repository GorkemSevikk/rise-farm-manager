"use client";

import { useEffect, useState } from "react";

import { subscribeFarm, subscribeFarms, subscribeParticipants } from "@/services/farms";
import { subscribeDrops, subscribeFarmDrops } from "@/services/drops";
import { subscribeUsers } from "@/services/users";
import { subscribePayments } from "@/services/payments";
import { subscribeSettings } from "@/services/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import type { AppSettings, AppUser, Drop, Farm, FarmParticipant, Payment } from "@/types";

interface State<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/**
 * Firestore dinleyicilerini React durumuna bağlayan ortak yardımcı.
 * Kullanıcı oturum açmadan dinleyici kurulmaz; aksi halde güvenlik kuralları
 * "permission denied" döndürür.
 */
function useSubscription<T>(
  initial: T,
  subscribe: (onData: (value: T) => void, onError: (error: Error) => void) => () => void,
  deps: unknown[],
  enabled = true
): State<T> {
  const [state, setState] = useState<State<T>>({
    data: initial,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) {
      setState({ data: initial, loading: false, error: null });
      return;
    }

    setState((current) => ({ ...current, loading: true }));

    const unsubscribe = subscribe(
      (value) => setState({ data: value, loading: false, error: null }),
      (error) => setState((current) => ({ ...current, loading: false, error: error.message }))
    );

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return state;
}

export function useFarms() {
  const { isAuthenticated } = useAuth();
  return useSubscription<Farm[]>(
    [],
    (onData, onError) => subscribeFarms(onData, onError),
    [],
    isAuthenticated
  );
}

export function useFarm(farmId: string) {
  const { isAuthenticated } = useAuth();
  return useSubscription<Farm | null>(
    null,
    (onData, onError) => subscribeFarm(farmId, onData, onError),
    [farmId],
    Boolean(isAuthenticated && farmId)
  );
}

export function useParticipants(farmId: string) {
  const { isAuthenticated } = useAuth();
  return useSubscription<FarmParticipant[]>(
    [],
    (onData, onError) => subscribeParticipants(farmId, onData, onError),
    [farmId],
    Boolean(isAuthenticated && farmId)
  );
}

export function useFarmDrops(farmId: string) {
  const { isAuthenticated } = useAuth();
  return useSubscription<Drop[]>(
    [],
    (onData, onError) => subscribeFarmDrops(farmId, onData, onError),
    [farmId],
    Boolean(isAuthenticated && farmId)
  );
}

export function useDrops() {
  const { isAuthenticated } = useAuth();
  return useSubscription<Drop[]>(
    [],
    (onData, onError) => subscribeDrops(onData, onError),
    [],
    isAuthenticated
  );
}

export function useUsers() {
  const { isAuthenticated } = useAuth();
  return useSubscription<AppUser[]>(
    [],
    (onData, onError) => subscribeUsers(onData, onError),
    [],
    isAuthenticated
  );
}

export function usePayments() {
  const { isAuthenticated, isAdmin } = useAuth();
  return useSubscription<Payment[]>(
    [],
    (onData, onError) => subscribePayments(onData, onError),
    [],
    Boolean(isAuthenticated && isAdmin)
  );
}

export function useSettings() {
  const { isAuthenticated } = useAuth();
  return useSubscription<AppSettings>(
    DEFAULT_SETTINGS,
    (onData) => subscribeSettings(onData),
    [],
    isAuthenticated
  );
}
