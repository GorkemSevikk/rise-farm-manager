import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";

import { db } from "@/lib/firebase/client";
import { userConverter } from "@/lib/firebase/converters";
import { COLLECTIONS } from "@/lib/constants";
import { isDemoMode } from "@/lib/demo/mode";
import {
  demoCurrentUser,
  demoSetUserActive,
  demoSetUserApproved,
  demoSetUserRole,
  demoSubscribe,
  demoUpdateProfile,
  demoUsers,
} from "@/lib/demo/store";
import type { AppUser, UserProfileInput, UserRole } from "@/types";

function usersCollection() {
  return collection(db, COLLECTIONS.users).withConverter(userConverter);
}

/** Kurulum aşamasında yönetici yetkisi verilecek e-posta listesi */
export function isBootstrapAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export function userDoc(uid: string) {
  return doc(db, COLLECTIONS.users, uid).withConverter(userConverter);
}

/**
 * İlk Google girişinden sonra kullanıcı dokümanını oluşturur.
 * Doküman zaten varsa yalnızca Google'dan gelen alanlar tazelenir; klanın
 * girdiği bilgiler (nickname, sınıf, rol) korunur.
 */
export async function ensureUserProfile(user: User): Promise<AppUser> {
  const ref = userDoc(user.uid);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    // Kurulum sırasında NEXT_PUBLIC_BOOTSTRAP_ADMIN_EMAILS içinde tanımlanan
    // e-postalar doğrudan yönetici olur ve onay beklemez. Diğer herkes onay
    // bekleyen üye olarak başlar; yönetici onaylamadan hiçbir veriye erişemez.
    const bootstrap = isBootstrapAdmin(user.email);
    const role: UserRole = bootstrap ? "admin" : "member";

    await setDoc(doc(db, COLLECTIONS.users, user.uid), {
      displayName: user.displayName ?? "İsimsiz oyuncu",
      email: user.email ?? "",
      photoURL: user.photoURL ?? null,
      nickname: "",
      characterClass: "",
      server: "",
      discord: "",
      role,
      approved: bootstrap,
      active: true,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const created = await getDoc(ref);
    return created.data()!;
  }

  const current = snapshot.data()!;
  const googleFieldsChanged =
    current.displayName !== (user.displayName ?? current.displayName) ||
    current.email !== (user.email ?? current.email) ||
    current.photoURL !== (user.photoURL ?? null);

  if (googleFieldsChanged) {
    await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
      displayName: user.displayName ?? current.displayName,
      email: user.email ?? current.email,
      photoURL: user.photoURL ?? null,
      updatedAt: serverTimestamp(),
    });
  }

  return current;
}

export function subscribeUser(uid: string, callback: (user: AppUser | null) => void) {
  if (isDemoMode) {
    return demoSubscribe(() => demoUsers().find((user) => user.uid === uid) ?? null, callback);
  }

  return onSnapshot(
    userDoc(uid),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    () => callback(null)
  );
}

export function subscribeUsers(
  callback: (users: AppUser[]) => void,
  onError?: (error: Error) => void
) {
  if (isDemoMode) {
    return demoSubscribe(demoUsers, callback);
  }

  const usersQuery = query(usersCollection(), orderBy("displayName"));
  return onSnapshot(
    usersQuery,
    (snapshot) => callback(snapshot.docs.map((docSnapshot) => docSnapshot.data())),
    (error) => onError?.(error)
  );
}

export async function updateUserProfile(uid: string, input: UserProfileInput) {
  if (isDemoMode) {
    demoUpdateProfile(uid, input);
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.users, uid), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserRole(uid: string, role: UserRole) {
  if (isDemoMode) {
    demoSetUserRole(uid, role);
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.users, uid), {
    role,
    updatedAt: serverTimestamp(),
  });
}

/** Onay bekleyen bir kullanıcıyı klana kabul eder veya onayı geri alır. */
export async function setUserApproved(uid: string, approved: boolean) {
  if (isDemoMode) {
    demoSetUserApproved(uid, approved);
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.users, uid), {
    approved,
    updatedAt: serverTimestamp(),
  });
}

export async function setUserActive(uid: string, active: boolean) {
  if (isDemoMode) {
    demoSetUserActive(uid, active);
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.users, uid), {
    active,
    updatedAt: serverTimestamp(),
  });
}

/** Demo modda oturum açan sahte kullanıcı */
export function demoProfile(): AppUser {
  return demoCurrentUser();
}
