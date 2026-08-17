import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Admin SDK yalnızca sunucu tarafında (API route'lar) kullanılır.
 * Servis hesabı tanımlanmadıysa uygulama çalışmaya devam eder; Admin SDK'ya
 * ihtiyaç duyan özellikler (Discord bildirimi) devre dışı kalır.
 */
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
// Vercel ortam değişkenlerinde satır sonları "\n" olarak kaçışlanmış gelir.
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const isAdminConfigured = Boolean(projectId && clientEmail && privateKey);

let cachedApp: App | null = null;

function getAdminApp(): App {
  if (!isAdminConfigured) {
    throw new Error(
      "Firebase Admin yapılandırılmamış. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL ve FIREBASE_PRIVATE_KEY değişkenlerini tanımlayın."
    );
  }

  if (cachedApp) return cachedApp;

  const existing = getApps();
  cachedApp = existing.length
    ? existing[0]
    : initializeApp({
        credential: cert({
          projectId: projectId!,
          clientEmail: clientEmail!,
          privateKey: privateKey!,
        }),
      });

  return cachedApp;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function adminDb(): Firestore {
  return getFirestore(getAdminApp());
}

/** Authorization: Bearer <idToken> başlığını doğrular ve kullanıcı uid'ini döner. */
export async function verifyRequest(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return null;

  try {
    return await adminAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}
