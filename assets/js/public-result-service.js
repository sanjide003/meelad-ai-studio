// MeeladPulse Public Result Service
import { db } from "./firebase-init.js";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Subscribes to the latest published results in the public-safe subcollection.
 * @param {string} festId 
 * @param {number} limitCount 
 * @param {function} callback 
 * @returns {function} Unsubscribe function
 */
export function subscribeLatestPublicResults(festId, limitCount, callback) {
  const path = window.meeladPulseScopedFestivalPath('publicData/results');
  const colRef = collection(db, path);
  const q = query(
    colRef, 
    where("status", "==", "published"),
    orderBy("publishedAt", "desc"), 
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const results = [];
    snapshot.forEach(docSnap => {
      results.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(results);
  }, (err) => {
    console.error("Latest public results subscription error:", err);
    callback([]);
  });
}

/**
 * Subscribes to public ranking/team totals summary.
 * @param {string} festId 
 * @param {function} callback 
 * @returns {function} Unsubscribe function
 */
export function subscribePublicRankings(festId, callback) {
  const path = window.meeladPulseScopedFestivalPath('publicData/teamTotals');
  const colRef = collection(db, path);
  
  return onSnapshot(colRef, (snapshot) => {
    const rankings = [];
    snapshot.forEach(docSnap => {
      const d = docSnap.data();
      rankings.push({
        id: docSnap.id,
        teamId: d.teamId || docSnap.id,
        teamName: d.teamName,
        teamCode: d.teamCode || docSnap.id,
        teamColour: d.teamColour || '#10b981',
        artsTotal: d.artsTotal || 0,
        sportsTotal: d.sportsTotal || 0,
        stagePoints: d.stagePoints || 0,
        nonStagePoints: d.nonStagePoints || 0,
        trackPoints: d.trackPoints || 0,
        fieldPoints: d.fieldPoints || 0,
        teamEventPoints: d.teamEventPoints || 0,
        indoorPoints: d.indoorPoints || 0,
        outdoorPoints: d.outdoorPoints || 0,
        bonusPoints: d.bonusPoints || 0,
        penaltyPoints: d.penaltyPoints || 0,
        overallTotal: d.overallPoints || 0,
        firstCount: d.firstCount || 0,
        secondCount: d.secondCount || 0,
        thirdCount: d.thirdCount || 0,
        gradeCounts: d.gradeCounts || {},
        rank: d.rank || 0
      });
    });
    
    rankings.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.overallTotal - a.overallTotal;
    });

    callback(rankings);
  }, (err) => {
    console.error("Public rankings subscription error:", err);
    callback([]);
  });
}

/**
 * Fetches public rankings/team totals summary via a single, optimized one-time read.
 * @param {string} festId 
 * @returns {Promise<Array>} List of rankings
 */
export async function getPublicRankingsOneTime(festId) {
  try {
    if (!festId) throw new Error("Festival ID is required");
    const path = window.meeladPulseScopedFestivalPath('publicData/teamTotals');
    const q = query(collection(db, path), limit(100));
    const snap = await getDocs(q);
    const rankings = snap.docs.map(docSnap => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        teamId: d.teamId || docSnap.id,
        teamName: d.teamName,
        teamCode: d.teamCode || docSnap.id,
        teamColour: d.teamColour || '#10b981',
        artsTotal: d.artsTotal || 0,
        sportsTotal: d.sportsTotal || 0,
        stagePoints: d.stagePoints || 0,
        nonStagePoints: d.nonStagePoints || 0,
        trackPoints: d.trackPoints || 0,
        fieldPoints: d.fieldPoints || 0,
        teamEventPoints: d.teamEventPoints || 0,
        indoorPoints: d.indoorPoints || 0,
        outdoorPoints: d.outdoorPoints || 0,
        bonusPoints: d.bonusPoints || 0,
        penaltyPoints: d.penaltyPoints || 0,
        overallTotal: d.overallPoints || 0,
        firstCount: d.firstCount || 0,
        secondCount: d.secondCount || 0,
        thirdCount: d.thirdCount || 0,
        gradeCounts: d.gradeCounts || {},
        rank: d.rank || 0
      };
    });
    rankings.sort((a, b) => a.rank - b.rank);
    return rankings;
  } catch (err) {
    console.error("Error fetching public rankings one-time:", err);
    return [];
  }
}

/**
 * Fetches all published results via an optimized one-time read with a query limit.
 * @param {string} festId 
 * @returns {Promise<Array>} List of results
 */
export async function getPublicResultsOneTime(festId) {
  try {
    if (!festId) throw new Error("Festival ID is required");
    const path = window.meeladPulseScopedFestivalPath('publicData/results');
    const q = query(
      collection(db, path), 
      where("status", "==", "published"),
      limit(250)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Client-side sort to avoid complex index requirements on publishedAt
    list.sort((a, b) => {
      const timeA = a.publishedAt?.seconds || 0;
      const timeB = b.publishedAt?.seconds || 0;
      return timeB - timeA;
    });
    return list;
  } catch (err) {
    console.error("Error fetching public results one-time:", err);
    return [];
  }
}

/**
 * Searches public-safe published results based on query terms.
 * Supports Name prefix search and exact matching on chest number or competition code.
 */
export async function searchPublicResults(festId, searchTerm) {
  try {
    const path = window.meeladPulseScopedFestivalPath('publicData/results');
    const snap = await getDocs(collection(db, path));
    
    const allResults = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      if (d.status === 'published') {
        allResults.push({ id: docSnap.id, ...d });
      }
    });

    if (!searchTerm || searchTerm.trim() === '') {
      return allResults;
    }

    const term = searchTerm.toLowerCase().trim();

    return allResults.filter(res => {
      const matchText = (val) => {
        if (!val) return false;
        const norm = val.toLowerCase().trim();
        return norm.startsWith(term) || norm.includes(" " + term) || norm.includes(term);
      };

      // Check Competition and Meta fields
      if (matchText(res.competitionName)) return true;
      if (matchText(res.competitionCode)) return true;
      if (matchText(res.categoryName)) return true;
      if (matchText(res.divisionName)) return true;
      if (matchText(res.subdivisionName)) return true;

      // Check Winners' info
      if (res.winners && Array.isArray(res.winners)) {
        for (const w of res.winners) {
          if (matchText(w.displayName)) return true;
          if (matchText(w.chestNumber)) return true;
          if (matchText(w.teamName)) return true;
          if (matchText(w.publicParticipantCode)) return true;
        }
      }

      return false;
    });
  } catch (err) {
    console.error("Error searching public results:", err);
    return [];
  }
}
