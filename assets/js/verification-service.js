// MeeladPulse ID Card & Certificate Verification Service (Public Safe)
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Publicly verifies a card's or certificate's validity using a secure, public-safe document node.
 * MUST NOT leak private personal information (emails, phones, DOBs, auth UIDs, or judge details).
 * Returns a simple public verification object.
 */
export async function verifyCardIntegrity(id, role, festId) {
  if (!id) {
    throw new Error("Invalid parameters. Scanning signature missing from payload.");
  }

  try {
    let isValid = false;
    let name = "";
    let subDetails = "";
    let teamId = "";
    let statusLabel = "";
    let festivalName = "Active Festival";
    let docTypeLabel = "Secure Document";
    let issueDateLabel = "N/A";
    let documentNoLabel = id;

    // 1. Fetch festival context if provided
    if (festId) {
      try {
        const festRef = doc(db, window.meeladPulseScopedFestivalPath());
        const festSnap = await getDoc(festRef);
        if (festSnap.exists()) {
          festivalName = festSnap.data().name || "MeeladPulse Festival";
        }
      } catch (e) {
        console.warn("Could not load festival meta:", e);
      }
    }

    // 2. Query the official public-safe verificationDocs subcollection first
    if (festId) {
      const verDocRef = doc(db, window.meeladPulseScopedFestivalPath('verificationDocs'), id);
      const verDocSnap = await getDoc(verDocRef);

      if (verDocSnap.exists()) {
        const d = verDocSnap.data();
        name = d.name || "Anonymous Recipient";
        teamId = d.teamId ? d.teamId.toUpperCase() : "N/A";
        docTypeLabel = d.documentType === 'id_card' ? 'Official Security ID Card' : 'Official Merit Certificate';
        subDetails = d.subDetails || "";
        issueDateLabel = d.issuedAt ? (d.issuedAt.toDate ? d.issuedAt.toDate().toLocaleDateString() : new Date(d.issuedAt).toLocaleDateString()) : "N/A";
        documentNoLabel = d.documentNo || id;

        if (d.status === 'valid') {
          isValid = true;
          statusLabel = d.statusLabel || "VERIFIED GENUINE (ACTIVE)";
        } else if (d.status === 'revoked') {
          isValid = false;
          statusLabel = `REVOKED CREDENTIAL (${d.revocationReason || 'Revoked by authority'})`;
        } else {
          isValid = false;
          statusLabel = "EXPIRED OR INACTIVE CREDENTIAL";
        }

        return {
          isValid,
          name,
          subDetails,
          teamId,
          statusLabel,
          festivalName,
          docTypeLabel,
          issueDateLabel,
          documentNoLabel,
          timestamp: new Date().toISOString()
        };
      }
    }

    throw new Error("No secure public verification document found. Ensure the admin has officially issued this credential.");

  } catch (error) {
    console.error("Verification Transaction Failure:", error);
    throw error;
  }
}
