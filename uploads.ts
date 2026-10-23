import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Phase 2: real photo uploads to Firebase Storage.
// Paths match storage.rules: hostel-photos/{ownerUid}/{file} is public-read,
// owner-write, images only, max 10 MB.
// NOTE: this project's Storage bucket activates only after the Firebase
// project is upgraded to the Blaze plan (decided by Muhammad). Callers must
// handle a rejection gracefully until then.
export async function uploadHostelPhotos(ownerId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `hostel-photos/${ownerId}/${Date.now()}-${safeName}`;
    const snapshot = await uploadBytes(ref(storage, path), file);
    urls.push(await getDownloadURL(snapshot.ref));
  }
  return urls;
}
