// MeeladPulse Network Status Utility and Offline Write Blocker

/**
 * Checks if the application is currently offline.
 */
export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Assert that the network is online. Throws an error if offline.
 * Displays a warning or throws an error with Malayalam and English messages.
 */
export function assertOnline(actionName = "Operation") {
  if (isOffline()) {
    const errorMsgMl = `കണക്റ്റിവിറ്റി ഇല്ല! നിങ്ങൾ ഓഫ്‌ലൈനാണ്. ${actionName} ഓഫ്‌ലൈനിൽ ചെയ്യുവാൻ സാധ്യമല്ല. ഇന്റർനെറ്റ് ലഭ്യമാകുമ്പോൾ വീണ്ടും ശ്രമിക്കുക.`;
    const errorMsgEn = `No connectivity! You are offline. ${actionName} cannot be completed offline. Please reconnect and try again.`;
    const combinedMsg = `${errorMsgEn}\n\n${errorMsgMl}`;
    
    if (typeof window !== 'undefined') {
      alert(combinedMsg);
    }
    
    throw new Error(`OFFLINE_BLOCKED: ${actionName} blocked due to active offline state.`);
  }
}
