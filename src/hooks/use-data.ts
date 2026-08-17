"use client";

import { useEffect, useState } from "react";

import { subscribeFarm, subscribeFarms, subscribeMyFarms, subscribeParticipants } from "@/services/farms";
import { subscribeDrops, subscribeFarmDrops } from "@/services/drops";
import { subscribeUsers } from "@/services/users";
import { subscribePayments, subscribeUserPayments } from "@/services/payments";
import { subscribeSettings } from "@/services/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import type { AppSettings, AppUser, Drop, Farm, FarmParticipant, Payment } from "@/types";

/** Üye ekranında başkasının payı ve klan toplamları durmasın. */
function redactFarmForMember(farm: Farm, uid: string): Farm {
  const mine = farm.shares.filter((share) => share.userId === uid);
  return {
    ...farm,
    shares: mine,
    participantIds: farm.participantIds.filter((id) => id === uid),
    participantCount: mine.length,
    grossGold: 0,
    expenseGold: 0,
    netGold: 0,
    dropCount: 0,
  };
}

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
  const { hasAccess, canManage, profile } = useAuth();
  const uid = profile?.uid ?? "";

  return useSubscription<Farm[]>(
    [],
    (onData, onError) =>
      canManage
        ? subscribeFarms(onData, onError)
        : subscribeMyFarms(uid, (farms) => onData(farms.map((farm) => redactFarmForMember(farm, uid))), onError),
    [canManage, uid],
    Boolean(hasAccess && (canManage || uid))
  );
}

export function useFarm(farmId: string) {
  const { hasAccess, canManage, profile } = useAuth();
  const uid = profile?.uid ?? "";

  return useSubscription<Farm | null>(
    null,
    (onData, onError) =>
      subscribeFarm(
        farmId,
        (farm) => {
          if (!farm) {
            onData(null);
            return;
          }
          onData(canManage ? farm : redactFarmForMember(farm, uid));
        },
        onError
      ),
    [farmId, canManage, uid],
    Boolean(hasAccess && farmId)
  );
}

export function useParticipants(farmId: string) {
  const { hasAccess, canManage } = useAuth();
  return useSubscription<FarmParticipant[]>(
    [],
    (onData, onError) => subscribeParticipants(farmId, onData, onError),
    [farmId],
    Boolean(hasAccess && canManage && farmId)
  );
}

export function useFarmDrops(farmId: string) {
  const { hasAccess, canManage } = useAuth();
  return useSubscription<Drop[]>(
    [],
    (onData, onError) => subscribeFarmDrops(farmId, onData, onError),
    [farmId],
    Boolean(hasAccess && canManage && farmId)
  );
}

export function useDrops() {
  const { hasAccess, canManage } = useAuth();
  return useSubscription<Drop[]>(
    [],
    (onData, onError) => subscribeDrops(onData, onError),
    [],
    Boolean(hasAccess && canManage)
  );
}

export function useUsers() {
  const { hasAccess, canManage } = useAuth();
  return useSubscription<AppUser[]>(
    [],
    (onData, onError) => subscribeUsers(onData, onError),
    [],
    Boolean(hasAccess && canManage)
  );
}

export function usePayments() {
  const { hasAccess, canManage } = useAuth();
  return useSubscription<Payment[]>(
    [],
    (onData, onError) => subscribePayments(onData, onError),
    [],
    Boolean(hasAccess && canManage)
  );
}

/**
 * Ödeme geçmişi. Yönetici ve yardımcı tüm kayıtları, üye yalnızca kendi
 * kayıtlarını görür; bu ayrım güvenlik kurallarıyla da zorunlu kılınmıştır.
 */
export function usePaymentHistory() {
  const { hasAccess, canManage, profile } = useAuth();
  const uid = profile?.uid ?? "";

  return useSubscription<Payment[]>(
    [],
    (onData, onError) =>
      canManage
        ? subscribePayments(onData, onError)
        : subscribeUserPayments(uid, onData, onError),
    [canManage, uid],
    Boolean(hasAccess && (canManage || uid))
  );
}

export function useSettings() {
  const { hasAccess } = useAuth();
  return useSubscription<AppSettings>(
    DEFAULT_SETTINGS,
    (onData) => subscribeSettings(onData),
    [],
    hasAccess
  );
}
