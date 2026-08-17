"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";

import { auth, isFirebaseConfigured, googleProvider } from "@/lib/firebase/client";
import { isDemoMode } from "@/lib/demo/mode";
import { demoSetRole } from "@/lib/demo/store";
import { demoProfile, ensureUserProfile, subscribeUser } from "@/services/users";
import type { AppUser, UserRole } from "@/types";

interface AuthContextValue {
  firebaseUser: User | null;
  profile: AppUser | null;
  /** Oturum açık mı - demo modda sahte oturumu da kapsar */
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  /** Yardımcı rolü: farm ve drop işlemlerini yapabilir. */
  isModerator: boolean;
  /** Kayıt oluşturup değiştirebilir mi (yönetici veya yardımcı). */
  canManage: boolean;
  /** Yönetici onayı verilmiş ve hesap askıya alınmamış mı. */
  hasAccess: boolean;
  isConfigured: boolean;
  isDemo: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Yalnızca demo modda: yönetici/üye görünümü arasında geçiş */
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_SESSION_KEY = "rise-farm-demo-session";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [demoSignedIn, setDemoSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profileUnsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isDemoMode) {
      // Sekme yenilendiğinde demo oturumu korunur; örnek veriler baştan üretilir.
      if (sessionStorage.getItem(DEMO_SESSION_KEY) === "1") {
        const demoUser = demoProfile();
        setProfile(demoUser);
        setDemoSignedIn(true);
        profileUnsubscribe.current = subscribeUser(demoUser.uid, (next) => {
          if (next) setProfile(next);
        });
      }
      setLoading(false);
      return () => {
        profileUnsubscribe.current?.();
      };
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        profileUnsubscribe.current?.();
        profileUnsubscribe.current = null;
        setFirebaseUser(user);

        if (!user) {
          setProfile(null);
          setLoading(false);
          return;
        }

        try {
          const initialProfile = await ensureUserProfile(user);
          setProfile(initialProfile);
          setError(null);
          // Rol veya profil değişikliklerini anlık yakalamak için dinleyici kur.
          profileUnsubscribe.current = subscribeUser(user.uid, (next) => {
            if (next) setProfile(next);
          });
        } catch (cause) {
          setError(
            cause instanceof Error
              ? `Profil yüklenemedi: ${cause.message}`
              : "Profil yüklenemedi."
          );
        } finally {
          setLoading(false);
        }
      },
      (cause) => {
        setError(cause.message);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      profileUnsubscribe.current?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (isDemoMode) {
      // Demo modda gerçek bir kimlik doğrulama yok; örnek yönetici hesabıyla girilir.
      const demoUser = demoProfile();
      sessionStorage.setItem(DEMO_SESSION_KEY, "1");
      setProfile(demoUser);
      setDemoSignedIn(true);
      profileUnsubscribe.current?.();
      profileUnsubscribe.current = subscribeUser(demoUser.uid, (next) => {
        if (next) setProfile(next);
      });
      return;
    }

    if (!isFirebaseConfigured) {
      setError("Firebase ayarları eksik. .env.local dosyasını doldurun.");
      return;
    }

    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (cause) {
      const code = (cause as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        return;
      }
      setError(describeAuthError(code, cause));
    }
  }, []);

  const signOut = useCallback(async () => {
    profileUnsubscribe.current?.();
    profileUnsubscribe.current = null;
    setProfile(null);

    if (isDemoMode) {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      setDemoSignedIn(false);
      return;
    }

    await firebaseSignOut(auth);
  }, []);

  const switchDemoRole = useCallback((role: UserRole) => {
    if (!isDemoMode) return;
    demoSetRole(role);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      firebaseUser,
      profile,
      isAuthenticated: isDemoMode ? demoSignedIn : Boolean(firebaseUser),
      loading,
      error,
      isAdmin: profile?.role === "admin",
      isModerator: profile?.role === "moderator",
      canManage: profile?.role === "admin" || profile?.role === "moderator",
      hasAccess: Boolean(profile?.approved && profile?.active),
      isConfigured: isFirebaseConfigured,
      isDemo: isDemoMode,
      signInWithGoogle,
      signOut,
      switchDemoRole,
    }),
    [firebaseUser, profile, demoSignedIn, loading, error, signInWithGoogle, signOut, switchDemoRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth yalnızca AuthProvider içinde kullanılabilir.");
  }
  return context;
}

function describeAuthError(code: string, cause: unknown): string {
  switch (code) {
    case "auth/unauthorized-domain":
      return "Bu alan adı Firebase'de yetkili değil. Authentication > Settings > Authorized domains bölümüne ekleyin.";
    case "auth/operation-not-allowed":
      return "Google girişi Firebase konsolunda etkinleştirilmemiş.";
    case "auth/invalid-api-key":
      return "Firebase API anahtarı geçersiz. .env.local dosyasını kontrol edin.";
    case "auth/popup-blocked":
      return "Tarayıcı açılır pencereyi engelledi. İzin verip tekrar deneyin.";
    case "auth/network-request-failed":
      return "Ağ hatası. İnternet bağlantınızı kontrol edin.";
    default:
      return cause instanceof Error ? cause.message : "Giriş yapılamadı.";
  }
}
