// Cloudinary upload layer (R3b — Muhammad chose the Cloudinary free tier
// over the Firebase Blaze upgrade, so listing photos and verification
// documents upload here, not to Firebase Storage).
//
// SETUP (one time, in the Cloudinary console):
//   1. Create a free account, note the Cloud name.
//   2. Settings -> Upload -> Add upload preset: Signing Mode = Unsigned,
//      name it `hostela_unsigned`.
//   3. Put both values below and redeploy.
//
// Privacy note, stated honestly: unsigned Cloudinary URLs are unguessable
// but not access-controlled. Listing photos are public by design. Verification
// documents (CNIC, right-to-list proof) are NEVER placed in a public
// document: their URLs live only in the `verificationDocs` collection,
// whose Firestore rules allow only the owning owner and admins to read.
// The Firestore rules — not URL obscurity — are the access boundary.

export const CLOUDINARY_CLOUD_NAME: string = 'pgf6eco1';
export const CLOUDINARY_UPLOAD_PRESET: string = 'hostela_unsigned';

export function isCloudinaryConfigured(): boolean {
  return (
    CLOUDINARY_CLOUD_NAME !== '' &&
    CLOUDINARY_CLOUD_NAME !== 'REPLACE_WITH_CLOUD_NAME' &&
    CLOUDINARY_UPLOAD_PRESET !== ''
  );
}

export async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured yet (cloud name / upload preset missing).');
  }
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  form.append('folder', folder);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
    { method: 'POST', body: form },
  );
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message ?? '';
    } catch { /* keep generic */ }
    throw new Error(`Cloudinary upload failed (${res.status})${detail ? `: ${detail}` : ''}`);
  }
  const data = await res.json();
  if (!data.secure_url) throw new Error('Cloudinary upload returned no URL.');
  return data.secure_url as string;
}
