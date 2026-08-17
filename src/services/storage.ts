import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "@/lib/firebase/client";
import { isDemoMode } from "@/lib/demo/mode";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

/** Drop ekran görüntüsünü Firebase Storage'a yükler ve indirme adresini döner. */
export async function uploadDropScreenshot(file: File, farmId: string, uid: string) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Sadece PNG, JPG, WEBP veya GIF yükleyebilirsiniz.");
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Görsel boyutu en fazla 5 MB olabilir.");
  }

  if (isDemoMode) {
    // Demo modda yükleme yapılmaz; görsel tarayıcıda data URL olarak gösterilir.
    return readAsDataUrl(file);
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
  // Yükleyen kullanıcı yola klasör olarak yazılır; Storage kuralları sahipliği
  // bu segmentten doğrular, böylece kimse başkasının dosyasını silemez.
  const path = `drops/${farmId}/${uid}/${Date.now()}.${extension}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Görsel okunamadı."));
    reader.readAsDataURL(file);
  });
}
