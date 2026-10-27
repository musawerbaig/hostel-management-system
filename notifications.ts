import { db } from './firebase';
import { doc, updateDoc, getDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { sendInquiryEmail, isEmailConfigured } from './emailjs';
import type { Inquiry } from './types';

// R5: email the listing owner within seconds of an inquiry (PRD AC-5).
//
// The owner's email address must NOT be public (listings are readable by
// everyone) and must NOT come from the users document (students may not
// read other users' profiles, which also hold phone/CNIC data). So each
// listing has a private companion document, listingContacts/{listingId},
// created by the owner at listing time, holding { ownerId, ownerEmail,
// allowedReaders, inquiryIds }. The reveal works in two rules-checked
// steps, both enforced by firestore.rules:
//   1. After creating an inquiry, the student appends their own uid and
//      the new inquiry id to the contact document. The rules allow this
//      ONLY when that inquiry's studentId is the caller and its ownerId
//      matches the contact document's owner — i.e. only a genuine inquirer
//      can unlock the address, and only for listings they inquired about.
//   2. The student then reads the contact document (now allowed, since
//      their uid is in allowedReaders) and sends the email via EmailJS.
// A listing without a contact document (pre-R5 listings until backfilled)
// simply skips the email; the inquiry itself is unaffected.
export async function notifyOwnerOfInquiry(inquiry: Inquiry): Promise<boolean> {
  try {
    if (!isEmailConfigured()) return false;
    const contactRef = doc(db, 'listingContacts', inquiry.hostelId);
    await updateDoc(contactRef, {
      allowedReaders: arrayUnion(inquiry.studentId),
      inquiryIds: arrayUnion(inquiry.id),
      lastInquiryId: inquiry.id,
      updatedAt: serverTimestamp(),
    });
    const snap = await getDoc(contactRef);
    const ownerEmail = (snap.data() as { ownerEmail?: unknown } | undefined)?.ownerEmail;
    if (typeof ownerEmail !== 'string' || !ownerEmail) return false;
    await sendInquiryEmail({
      to_email: ownerEmail,
      hostel_name: inquiry.hostelName,
      student_name: inquiry.studentName,
      student_phone: inquiry.studentPhone,
      beds_needed: String(inquiry.bedsNeeded),
      move_in_date: inquiry.moveInDate,
      message: inquiry.message || '(No message)',
      app_url: 'https://hostela-5a2dc.web.app',
    });
    return true;
  } catch (err) {
    // Never fail the inquiry over the notification.
    console.warn('Owner notification failed (inquiry itself was saved):', err);
    return false;
  }
}
