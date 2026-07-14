// MeeladPulse Publishing Queue and Bulk Service
import { db } from "./firebase-init.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { publishResult } from "./result-action-service.js";
import { assertOnline } from "./network-status.js";

/**
 * Loads the complete result records for a festival, grouped by status.
 */
export async function getResultPublishingQueue(festId) {
  try {
    const qSnap = await getDocs(collection(db, `festivals/${festId}/results`));
    const results = [];
    qSnap.forEach(d => {
      results.push({ id: d.id, ...d.data() });
    });
    return results;
  } catch (err) {
    console.error("Failed to load result publishing queue:", err);
    return [];
  }
}

/**
 * Performs bulk publication of multiple results.
 * Employs safe loop iteration and reports individual successes and failures.
 * Does not let a single failed publication crash the entire batch.
 */
export async function bulkPublishResults(festId, compIds, adminProfile) {
  assertOnline('Bulk Publication');
  const report = {
    successful: [],
    failed: []
  };

  for (const compId of compIds) {
    try {
      await publishResult(festId, compId, adminProfile);
      report.successful.push(compId);
    } catch (err) {
      console.error(`Bulk publish failed for ${compId}:`, err);
      report.failed.push({
        compId,
        error: err.message || "Unknown publication error"
      });
    }
  }

  return report;
}

