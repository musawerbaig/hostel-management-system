import { uploadToCloudinary } from './cloudinary';

// R3b: real uploads go to Cloudinary (free tier), not Firebase Storage —
// this project's Storage bucket stays inactive on the Spark plan.
// Listing photos are public by design; verification documents are stored
// under a separate folder and their URLs are kept out of public documents
// (see services.saveVerificationDocs + firestore.rules).
export async function uploadHostelPhotos(ownerId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadToCloudinary(file, `hostela/listings/${ownerId}`));
  }
  return urls;
}

export async function uploadVerificationDocs(ownerId: string, files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    urls.push(await uploadToCloudinary(file, `hostela/verification/${ownerId}`));
  }
  return urls;
}
