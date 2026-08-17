import { getApp, getApps, initializeApp, type FirebaseOptions } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const env = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * .env.local doldurulmadan uygulama açıldığında arayüzde açıklayıcı bir kurulum
 * uyarısı göstermek için bu bayrağı kullanıyoruz.
 */
export const isFirebaseConfigured = Boolean(env.apiKey && env.projectId && env.appId);

/**
 * Anahtarlar yoksa yer tutucu değerlerle başlatıyoruz: `getAuth()` boş anahtarla
 * hata fırlattığı için aksi halde build sırasındaki ön render adımı çöküyor.
 * Gerçek istekler `isFirebaseConfigured` kontrolüyle engellenir.
 */
const firebaseConfig: FirebaseOptions = {
  apiKey: env.apiKey || "yapilandirilmadi",
  authDomain: env.authDomain || "localhost",
  projectId: env.projectId || "rise-farm-manager-demo",
  storageBucket: env.storageBucket || "rise-farm-manager-demo.appspot.com",
  messagingSenderId: env.messagingSenderId || "000000000000",
  appId: env.appId || "1:000000000000:web:0000000000000000000000",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseApp = app;
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
