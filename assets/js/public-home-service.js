// MeeladPulse Public Home Service
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
 * Subscribes to public announcements.
 * Filters by target = 'public' or 'all', and checks dates if applicable.
 */
export function subscribePublicAnnouncements(festId, callback) {
  const path = `festivals/${festId}/announcements`;
  const colRef = collection(db, path);
  
  // Apply database query limit of 50 to optimize database reads
  const q = query(colRef, limit(50));
  
  return onSnapshot(q, (snapshot) => {
    const announcements = [];
    const now = new Date();

    snapshot.forEach(docSnap => {
      const data = docSnap.id ? { id: docSnap.id, ...docSnap.data() } : docSnap.data();
      
      // Target checks (public or all)
      const target = data.target?.toLowerCase() || 'public';
      const isTargetPublic = target === 'public' || target === 'all' || target === 'everyone';
      const isPublicField = data.public !== false;
      const isActive = data.active !== false;
      
      // Status check
      const isPublished = data.status?.toLowerCase() === 'published' || data.status === undefined || data.status === 'active';
      
      // Expiry checks (supports both publishAt/expiresAt and publishDate/expiryDate)
      let validDates = true;
      const publishVal = data.publishAt || data.publishDate;
      const expireVal = data.expiresAt || data.expiryDate;

      if (publishVal) {
        const pDate = publishVal.seconds ? new Date(publishVal.seconds * 1000) : new Date(publishVal);
        if (pDate > now) validDates = false;
      }
      if (expireVal) {
        const eDate = expireVal.seconds ? new Date(expireVal.seconds * 1000) : new Date(expireVal);
        if (eDate < now) validDates = false;
      }

      if (isTargetPublic && isPublicField && isActive && isPublished && validDates) {
        announcements.push(data);
      }
    });

    // Sort by publishDate or timestamp descending
    announcements.sort((a, b) => {
      const timeA = a.publishDate?.seconds ? a.publishDate.seconds * 1000 : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : Date.now());
      const timeB = b.publishDate?.seconds ? b.publishDate.seconds * 1000 : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : Date.now());
      return timeB - timeA;
    });

    callback(announcements);
  }, (err) => {
    console.error("Public announcements subscription failed:", err);
    callback([]);
  });
}

/**
 * Subscribes to upcoming schedules/competitions in public view.
 * Do not expose private participant lists.
 */
export function subscribePublicSchedule(festId, callback) {
  const path = `festivals/${festId}/schedules`;
  const colRef = collection(db, path);
  const q = query(colRef, orderBy("scheduledTime", "asc"), limit(20));

  return onSnapshot(q, (snapshot) => {
    const schedules = [];
    snapshot.forEach(docSnap => {
      schedules.push({ id: docSnap.id, ...docSnap.data() });
    });
    callback(schedules);
  }, (err) => {
    console.error("Public schedule subscription failed:", err);
    // Fallback to competitions listing if schedules is empty or error
    const fallbackPath = `festivals/${festId}/competitions`;
    const fallbackRef = collection(db, fallbackPath);
    getDocs(query(fallbackRef, limit(30))).then(snap => {
      const comps = [];
      snap.forEach(docSnap => {
        const d = docSnap.data();
        if (d.status === 'scheduled' || d.scheduledTime) {
          comps.push({
            id: docSnap.id,
            competitionName: d.name,
            competitionCode: d.code,
            scheduledTime: d.scheduledTime || '',
            stageName: d.stageName || 'Stage ' + (d.stageId || 'TBD'),
            categoryName: d.categoryName || d.categoryId || 'General',
            status: d.status || 'Scheduled'
          });
        }
      });
      callback(comps);
    }).catch(err2 => {
      console.error("Schedules fallback failed:", err2);
      callback([]);
    });
  });
}

/**
 * Fetches public schedule/competitions one time.
 * Promoting optimized Firestore read paths.
 */
export async function getPublicScheduleOneTime(festId) {
  const path = `festivals/${festId}/schedules`;
  const colRef = collection(db, path);
  const q = query(colRef, orderBy("scheduledTime", "asc"), limit(150));
  try {
    const snapshot = await getDocs(q);
    const schedules = [];
    snapshot.forEach(docSnap => {
      schedules.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (schedules.length > 0) {
      return schedules;
    }
  } catch (err) {
    console.error("Public schedule query failed, falling back:", err);
  }

  // Fallback to competitions listing
  const fallbackPath = `festivals/${festId}/competitions`;
  const fallbackRef = collection(db, fallbackPath);
  const snap = await getDocs(query(fallbackRef, limit(150)));
  const comps = [];
  snap.forEach(docSnap => {
    const d = docSnap.data();
    if (d.status === 'scheduled' || d.scheduledTime) {
      comps.push({
        id: docSnap.id,
        competitionName: d.name,
        competitionCode: d.code,
        scheduledTime: d.scheduledTime || '',
        stageName: d.stageName || 'Stage ' + (d.stageId || 'TBD'),
        categoryName: d.categoryName || d.categoryId || 'General',
        status: d.status || 'Scheduled'
      });
    }
  });
  return comps;
}
