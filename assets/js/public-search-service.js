import { db } from "./firebase-init.js";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Normalizes a string for search matching (trims, lowercases, removes spaces/dashes).
 * Supports both Malayalam and English text safely.
 */
export function normalizeSearchTerm(term) {
  if (!term) return "";
  return String(term)
    .trim()
    .toLowerCase()
    .replace(/[-_]/g, "")
    .replace(/\s+/g, "");
}

/**
 * Perform highly optimized public results searches with a query limit and pagination support.
 * @param {string} festId - Active festival ID
 * @param {object} options - Search options
 * @param {string} [options.term] - Unified search text (name, chest number, or competition code)
 * @param {string} [options.categoryId] - Specific Category filter
 * @param {string} [options.teamId] - Specific Team filter
 * @param {number} [options.pageSize=20] - Number of items to fetch
 * @param {any} [options.lastDoc] - Last visible document snapshot for pagination
 * @returns {Promise<{results: Array, lastVisibleDoc: any, hasMore: boolean}>}
 */
export async function queryPublicResultsWithFilters(festId, {
  term = "",
  categoryId = "",
  teamId = "",
  pageSize = 24,
  lastDoc = null
} = {}) {
  const path = window.meeladPulseScopedFestivalPath('publicData/results');
  const colRef = collection(db, path);
  const normalizedQuery = normalizeSearchTerm(term);

  let results = [];
  let nextLastDoc = null;
  let hasMore = false;

  if (normalizedQuery === "") {
    // Standard paginated listing
    let qRef = query(colRef, where("status", "==", "published"), orderBy("publishedAt", "desc"));
    if (categoryId) {
      qRef = query(colRef, where("status", "==", "published"), where("categoryId", "==", categoryId), orderBy("publishedAt", "desc"));
    }

    const fetchLimit = pageSize + 1;
    let q = query(qRef, limit(fetchLimit));
    if (lastDoc) {
      q = query(qRef, startAfter(lastDoc), limit(fetchLimit));
    }

    const snapshot = await getDocs(q);
    const rawDocs = snapshot.docs;
    hasMore = rawDocs.length > pageSize;
    const activeDocs = hasMore ? rawDocs.slice(0, pageSize) : rawDocs;
    nextLastDoc = activeDocs.length > 0 ? activeDocs[activeDocs.length - 1] : null;

    results = activeDocs.map(docSnap => ({
      id: docSnap.id,
      _snapshot: docSnap,
      ...docSnap.data()
    }));
  } else {
    // Targeted Search Mode: Run index-safe Firestore queries in parallel
    const queries = [];

    // 1. Exact Competition Code Query
    let qCode = query(colRef, where("status", "==", "published"), where("competitionCodeNormalized", "==", normalizedQuery));
    if (categoryId) qCode = query(qCode, where("categoryId", "==", categoryId));
    queries.push(getDocs(qCode));

    // 2. Exact Chest Number Query
    let qChest = query(colRef, where("status", "==", "published"), where("winnerChestNumbers", "array-contains", normalizedQuery));
    if (categoryId) qChest = query(qChest, where("categoryId", "==", categoryId));
    queries.push(getDocs(qChest));

    // 3. Name Prefix Query on searchIndex
    const searchIndexCol = collection(db, window.meeladPulseScopedFestivalPath('publicData/searchIndex'));
    let qName = query(searchIndexCol, where("active", "==", true), where("namePrefixes", "array-contains", normalizedQuery));
    queries.push(getDocs(qName));

    const [snapCode, snapChest, snapName] = await Promise.all(queries);
    const seenIds = new Set();
    const mergedDocs = [];

    const addDocs = (snap) => {
      snap.docs.forEach(d => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          mergedDocs.push({
            id: d.id,
            _snapshot: d,
            ...d.data()
          });
        }
      });
    };

    addDocs(snapCode);
    addDocs(snapChest);

    // Fetch matching result documents for name-prefix search matches
    const nameResultIds = [];
    snapName.docs.forEach(d => {
      const data = d.data();
      // Apply client-side category/team filter if needed
      if (categoryId && data.categoryId !== categoryId) return;
      if (teamId && data.teamId !== teamId) return;
      
      if (data.resultId && !seenIds.has(data.resultId)) {
        nameResultIds.push(data.resultId);
      }
    });

    if (nameResultIds.length > 0) {
      const fetchPromises = nameResultIds.map(rid => getDoc(doc(db, window.meeladPulseScopedFestivalPath('publicData/results'), rid)));
      const nameSnaps = await Promise.all(fetchPromises);
      nameSnaps.forEach(snap => {
        if (snap.exists() && !seenIds.has(snap.id)) {
          seenIds.add(snap.id);
          mergedDocs.push({
            id: snap.id,
            _snapshot: snap,
            ...snap.data()
          });
        }
      });
    }

    results = mergedDocs;
    hasMore = false;
  }

  // Filter by teamId (if specified)
  if (teamId) {
    results = results.filter(res => {
      if (res.winners && Array.isArray(res.winners)) {
        return res.winners.some(w => w.teamId === teamId);
      }
      return false;
    });
  }

  return {
    results,
    lastVisibleDoc: nextLastDoc,
    hasMore
  };
}
