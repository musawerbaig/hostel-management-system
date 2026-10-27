// R5: owner email notifications via EmailJS (client-side send, no backend).
// Firebase Cloud Functions would need the Blaze plan, which Muhammad
// declined — so the notification is sent from the student's browser the
// moment an inquiry is saved. The inquiry itself is already in Firestore
// before this runs, so a failed send never loses the inquiry; it only
// means the owner sees it in their dashboard inbox instead of by email.
//
// SETUP (one time, in the EmailJS dashboard):
//   1. Create a free account, connect the Gmail service (Muhammad's Gmail).
//   2. Create an email template using these parameters:
//      to_email, hostel_name, student_name, student_phone, beds_needed,
//      move_in_date, message, app_url.
//      (Set the template's To field to {{to_email}}.)
//   3. Put the service ID, template ID and public key below and redeploy.
// Public keys are public by design in EmailJS; the template only ever
// sends to the listing owner's address, which the client learns through
// the rules-gated listingContacts reveal (see notifications.ts).

export const EMAILJS_SERVICE_ID: string = 'service_im4uujk';
export const EMAILJS_TEMPLATE_ID: string = 'template_slvb7rf';
export const EMAILJS_PUBLIC_KEY: string = 'RBpFN72Dqhji4NeBL';

export function isEmailConfigured(): boolean {
  return (
    !EMAILJS_SERVICE_ID.startsWith('REPLACE_') &&
    !EMAILJS_TEMPLATE_ID.startsWith('REPLACE_') &&
    !EMAILJS_PUBLIC_KEY.startsWith('REPLACE_')
  );
}

export async function sendInquiryEmail(params: Record<string, string>): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error('EmailJS is not configured yet.');
  }
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: params,
    }),
  });
  if (!res.ok) {
    throw new Error(`EmailJS send failed (HTTP ${res.status}).`);
  }
}
