// MeeladPulse Certificate Service
import { db } from "./firebase-init.js";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getActiveFestivalId } from "./firestore-service.js";
import { assertOnline } from "./network-status.js";

/**
 * Returns all students eligible for participation certificates.
 */
export async function getParticipationCertificatesData() {
  const festId = getActiveFestivalId();
  const snap = await getDocs(collection(db, window.meeladPulseScopedFestivalPath('festStudents')));
  return snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      teamId: data.teamId,
      categoryId: data.categoryId,
      status: data.status,
      type: 'participation'
    };
  }).filter(s => s.status === 'active');
}

/**
 * Returns results eligible for merit/grade certificates.
 */
export async function getMeritCertificatesData() {
  const festId = getActiveFestivalId();
  
  // Merit is based on results
  const resultsSnap = await getDocs(collection(db, window.meeladPulseScopedFestivalPath('results')));
  const results = resultsSnap.docs.map(doc => doc.data());

  // Also load students for name lookup
  const studentsSnap = await getDocs(collection(db, window.meeladPulseScopedFestivalPath('festStudents')));
  const studentMap = {};
  studentsSnap.docs.forEach(doc => {
    studentMap[doc.id] = doc.data().name;
  });

  const certs = [];
  results.forEach(res => {
    // Only published, non-held results can be issued certificates
    if ((res.status?.toLowerCase() === 'published' || res.status?.toLowerCase() === 'approved') && !res.isHeld && !res.unpublished) {
      if (res.standings && Array.isArray(res.standings)) {
        res.standings.forEach(st => {
          // Merit/Grade check
          if (st.rank || st.grade) {
            certs.push({
              id: `${res.competitionId}_${st.studentId}`,
              studentId: st.studentId,
              studentName: studentMap[st.studentId] || st.studentName || 'Unknown Student',
              competitionId: res.competitionId,
              competitionName: res.competitionName || 'Competition Event',
              teamId: st.teamId,
              rank: st.rank || null,
              grade: st.grade || null,
              point: st.pointsAwarded || 0,
              type: 'merit'
            });
          }
        });
      }
    }
  });

  return certs;
}

/**
 * Returns team championships data for championship winner/runner-up certificates.
 */
export async function getChampionshipCertificatesData() {
  const festId = getActiveFestivalId();
  const snap = await getDocs(collection(db, window.meeladPulseScopedFestivalPath('teamTotals')));
  
  const standings = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      teamId: doc.id,
      teamName: data.teamName || doc.id.toUpperCase(),
      totalPoints: data.totalPoints || 0,
      type: 'championship'
    };
  });

  // Sort descending by totalPoints
  standings.sort((a, b) => b.totalPoints - a.totalPoints);
  return standings;
}

/**
 * Officially issues a certificate and registers it in both certificates registry and public-safe verificationDocs.
 * Enforces security validations (e.g., eligibility, active recipients, and published result states).
 */
export async function issueCertificate(certInput, adminUser) {
  const festId = getActiveFestivalId();
  if (!festId) throw new Error("No active festival scope found.");

  const recipientId = certInput.recipientId || certInput.studentId || certInput.teamId;
  const certificateType = certInput.type || 'participation'; // 'participation', 'merit', 'championship'
  
  if (!recipientId) {
    throw new Error("Recipient ID is required to register official certificate.");
  }

  // 1. Double check eligibility for winner and grade certificates
  if (certificateType === 'merit') {
    if (!certInput.competitionId) throw new Error("Competition Context missing for Merit Certificate.");
    // Merit results must be published and not held
    const resRef = doc(db, window.meeladPulseScopedFestivalPath('results'), certInput.competitionId);
    const resSnap = await getDoc(resRef);
    if (resSnap.exists()) {
      const res = resSnap.data();
      const stat = res.status?.toLowerCase();
      if ((stat !== 'published' && stat !== 'approved') || res.isHeld || res.unpublished) {
        throw new Error("Cannot issue official certificate: Competition results are not published or currently held.");
      }
    }
  }

  // 2. Double check recipient active state
  if (certInput.recipientType === 'student' || certificateType === 'participation') {
    const studRef = doc(db, window.meeladPulseScopedFestivalPath('festStudents'), recipientId);
    const studSnap = await getDoc(studRef);
    if (studSnap.exists() && studSnap.data().status !== 'active') {
      throw new Error("Cannot issue official certificate to an inactive, withdrawn, or disqualified participant.");
    }
  }

  // Generate Unique Verification / Certificate Number
  const cleanComp = certInput.competitionId ? `-${certInput.competitionId.slice(-4).toUpperCase()}` : '';
  const certificateNumber = `MP-${festId.slice(-3).toUpperCase()}-${certificateType.slice(0,3).toUpperCase()}-${recipientId.slice(-5).toUpperCase()}${cleanComp}`;
  const verificationId = certificateNumber; // Let verificationId match certificateNumber for direct URL mapping

  const certRef = doc(db, window.meeladPulseScopedFestivalPath('certificates'), verificationId);
  const certSnap = await getDoc(certRef);

  // Prevent duplicates unless explicitly forced (i.e. if already issued and status is valid)
  if (certSnap.exists() && certSnap.data().status === 'valid') {
    console.log("Certificate already officially registered:", certificateNumber);
    return certSnap.data();
  }

  // 3. Prepare official certificate record payload
  const certRecord = {
    festId,
    certificateNumber,
    verificationId,
    certificateType,
    recipientType: certInput.recipientType || 'student',
    recipientId,
    recipientName: certInput.studentName || certInput.recipientName || certInput.name || 'Anonymous Recipient',
    resultId: certInput.competitionId || null,
    status: "valid",
    issuedBy: adminUser ? (adminUser.name || adminUser.email) : "System Administrator",
    issuedAt: serverTimestamp(),
    revokedBy: null,
    revokedAt: null,
    revocationReason: null,
    teamId: certInput.teamId || "N/A"
  };

  // Save official certificate record
  await setDoc(certRef, certRecord);

  // 4. Save public-safe verification document (excluding personal identifiers, DOB, phone, judge marks)
  let subDetails = "";
  if (certificateType === 'participation') {
    subDetails = "Participation and active performance recognition.";
  } else if (certificateType === 'merit') {
    let rankLabel = "";
    if (certInput.rank === 1) rankLabel = "1st Place";
    else if (certInput.rank === 2) rankLabel = "2nd Place";
    else if (certInput.rank === 3) rankLabel = "3rd Place";
    else if (certInput.rank) rankLabel = `${certInput.rank} Place`;

    const gradeLabel = certInput.grade ? `${certInput.grade} Grade` : '';
    subDetails = `Awarded for ${certInput.competitionName || 'Competition Event'} - ${[rankLabel, gradeLabel].filter(Boolean).join(' • ')}`;
  } else if (certificateType === 'championship') {
    subDetails = `Championship Standing Event - Points: ${certInput.totalPoints || 0}`;
  }

  const verRef = doc(db, window.meeladPulseScopedFestivalPath('verificationDocs'), verificationId);
  await setDoc(verRef, {
    festId,
    documentType: 'certificate',
    name: certRecord.recipientName,
    subDetails,
    teamId: certRecord.teamId,
    status: 'valid',
    statusLabel: `VERIFIED GENUINE (VALID ${certificateType.toUpperCase()} CERTIFICATE)`,
    issuedAt: serverTimestamp(),
    documentNo: certificateNumber
  });

  return certRecord;
}

/**
 * Revokes an officially issued certificate safely.
 */
export async function revokeCertificate(certificateNumber, reason, adminUser) {
  assertOnline('Certificate Revocation');
  const festId = getActiveFestivalId();
  if (!festId) throw new Error("No active festival scope found.");

  const certRef = doc(db, window.meeladPulseScopedFestivalPath('certificates'), certificateNumber);
  const verRef = doc(db, window.meeladPulseScopedFestivalPath('verificationDocs'), certificateNumber);

  const certSnap = await getDoc(certRef);
  if (!certSnap.exists()) {
    throw new Error("Specified certificate record not found in active registries.");
  }

  const revocationData = {
    status: "revoked",
    revokedBy: adminUser ? (adminUser.name || adminUser.email) : "System Administrator",
    revokedAt: serverTimestamp(),
    revocationReason: reason || "Revoked by festival management"
  };

  await updateDoc(certRef, revocationData);
  await updateDoc(verRef, {
    status: 'revoked',
    statusLabel: `REVOKED CERTIFICATE (${revocationData.revocationReason})`
  });

  return { success: true, certificateNumber };
}
