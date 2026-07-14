// MeeladPulse Validation Engine - Multilingual (Malayalam & English)
// Verifies competition-specific eligibility rules, item limits, group sizes, and conflicts

export const VALIDATION_ERRORS = {
  GENDER_MISMATCH: {
    en: "Gender eligibility mismatch: This competition is only open to {gender}.",
    ml: "ലിംഗഭേദ അനുയോജ്യത തെറ്റാണ്: ഈ മത്സരം {gender} കുട്ടികൾക്ക് മാത്രമുള്ളതാണ്."
  },
  CLASS_NOT_ALLOWED: {
    en: "Class eligibility mismatch: Student is in Class {class}, but this category only allows classes {allowedClasses}.",
    ml: "ക്ലാസ് യോഗ്യത തെറ്റാണ്: വിദ്യാർത്ഥി {class}-ാം ക്ലാസിലാണ്, എന്നാൽ ഈ കാറ്റഗറിയിൽ {allowedClasses} ക്ലാസുകളിലുള്ളവർക്ക് മാത്രമേ പങ്കെടുക്കാനാകൂ."
  },
  AGE_TOO_YOUNG: {
    en: "Age mismatch: Student is too young. Minimum age is {minAge} years.",
    ml: "പ്രായപരിധി തെറ്റാണ്: പ്രായം കുറവാണ്. കുറഞ്ഞത് {minAge} വയസ്സ് തികഞ്ഞിരിക്കണം."
  },
  AGE_TOO_OLD: {
    en: "Age mismatch: Student is too old. Maximum age is {maxAge} years.",
    ml: "പ്രായപരിധി തെറ്റാണ്: പ്രായം കൂടുതലാണ്. പരമാവധി {maxAge} വയസ്സേ ഉണ്ടാകാവൂ."
  },
  TEAM_MAX_ENTRIES: {
    en: "Team limit exceeded: This team already has maximum of {max} entries in this competition.",
    ml: "ടീം പരിധി കവിഞ്ഞു: ഈ മത്സരത്തിൽ ഈ ടീമിന് പരമാവധി {max} രജിസ്ട്രേഷനുകൾ മാത്രമേ ഉണ്ടാകാവൂ."
  },
  INDIVIDUAL_LIMIT: {
    en: "Individual item limit exceeded: Student {name} has already registered for {count} individual events (Max: {max}).",
    ml: "വ്യക്തിഗത ഇനങ്ങളുടെ പരിധി കവിഞ്ഞു: {name} ഇതിനകം {count} വ്യക്തിഗത മത്സരങ്ങളിൽ രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട് (പരമാവധി: {max})."
  },
  GROUP_LIMIT: {
    en: "Group item limit exceeded: Student {name} has already registered for {count} group events (Max: {max}).",
    ml: "ഗ്രൂപ്പ് ഇനങ്ങളുടെ പരിധി കവിഞ്ഞു: {name} ഇതിനകം {count} ഗ്രൂപ്പ് മത്സരങ്ങളിൽ രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട് (പരമാവധി: {max})."
  },
  TOTAL_LIMIT: {
    en: "Total item limit exceeded: Student {name} has reached the maximum of {max} total events.",
    ml: "ആകെ മത്സരങ്ങളുടെ പരിധി കവിഞ്ഞു: {name} പരമാവധി {max} മത്സരങ്ങളിൽ പങ്കെടുത്തിട്ടുണ്ട്."
  },
  GROUP_SIZE_MIN: {
    en: "Group size is too small: Minimum {min} members are required.",
    ml: "ഗ്രൂപ്പ് അംഗങ്ങൾ തികയില്ല: കുറഞ്ഞത് {min} പേരെങ്കിലും വേണം."
  },
  GROUP_SIZE_MAX: {
    en: "Group size is too large: Maximum {max} members are allowed.",
    ml: "ഗ്രൂപ്പ് അംഗങ്ങൾ കൂടുതലാണ്: പരമാവധി {max} പേരെ മാത്രമേ അനുവദിക്കൂ."
  },
  SUBSTITUTE_LIMIT: {
    en: "Substitute limit exceeded: Maximum {max} substitutes are allowed.",
    ml: "പകരക്കാരുടെ പരിധി കവിഞ്ഞു: പരമാവധി {max} പകരക്കാരെ മാത്രമേ അനുവദിക്കൂ."
  },
  DUPLICATE_PARTICIPANT: {
    en: "Duplicate Participant: Student {name} is already registered in this competition.",
    ml: "ഡ്യൂപ്ലിക്കേറ്റ് പങ്കാളി: {name} ഈ മത്സരത്തിൽ ഇതിനകം രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട്."
  },
  SCHEDULE_CONFLICT: {
    en: "Schedule Conflict: Student {name} has a conflict on {date} at {time} with event '{eventName}'.",
    ml: "ഷെഡ്യൂൾ വൈരുദ്ധ്യം: {name}-ന് {date}-ൽ {time}-ന് നടക്കുന്ന '{eventName}' എന്ന മത്സരവുമായി സമയ വൈരുദ്ധ്യമുണ്ട്."
  }
};

// Helper to translate templates
export function getValidationError(key, params = {}, lang = 'ml') {
  const errorObj = VALIDATION_ERRORS[key];
  if (!errorObj) return "Validation Error";
  let msg = errorObj[lang] || errorObj['en'];
  Object.keys(params).forEach(p => {
    msg = msg.replace(`{${p}}`, params[p]);
  });
  return msg;
}

// 1. Gender Eligibility Check
export function checkGenderEligibility(studentMaster, competition, lang = 'ml') {
  // competition.genderMode can be 'boys' | 'girls' | 'separate' | 'combined' | 'mixed' | 'flexible'
  const studentGender = studentMaster.gender; // 'male' | 'female'
  
  if (competition.genderMode === 'boys' && studentGender !== 'male') {
    return {
      valid: false,
      error: getValidationError('GENDER_MISMATCH', { gender: lang === 'ml' ? 'ആൺ' : 'Boys' }, lang)
    };
  }
  if (competition.genderMode === 'girls' && studentGender !== 'female') {
    return {
      valid: false,
      error: getValidationError('GENDER_MISMATCH', { gender: lang === 'ml' ? 'പെൺ' : 'Girls' }, lang)
    };
  }
  return { valid: true };
}

// 2. Class and Age Boundaries Checks
export function checkCategoryEligibility(studentMaster, category, lang = 'ml') {
  const currentClass = String(studentMaster.currentClass);
  const dobStr = studentMaster.dateOfBirth; // yyyy-mm-dd
  
  // Class check
  if (category.allowedClasses && category.allowedClasses.length > 0) {
    if (!category.allowedClasses.includes(currentClass)) {
      return {
        valid: false,
        error: getValidationError('CLASS_NOT_ALLOWED', { 
          class: currentClass, 
          allowedClasses: category.allowedClasses.join(', ') 
        }, lang)
      };
    }
  }

  // Age calculation
  if (dobStr && (category.minAge !== null || category.maxAge !== null)) {
    const dob = new Date(dobStr);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (category.minAge !== null && age < category.minAge) {
      return {
        valid: false,
        error: getValidationError('AGE_TOO_YOUNG', { minAge: category.minAge }, lang)
      };
    }
    if (category.maxAge !== null && age > category.maxAge) {
      return {
        valid: false,
        error: getValidationError('AGE_TOO_OLD', { maxAge: category.maxAge }, lang)
      };
    }
  }

  return { valid: true };
}

// 3. Team Maximum Entries Limit
export function checkTeamEntriesLimit(existingEntries, teamId, competition, lang = 'ml') {
  const teamEntries = existingEntries.filter(e => e.competitionId === competition.id && e.teamId === teamId);
  const maxEntries = competition.maxEntriesPerTeam || 1;
  
  if (teamEntries.length >= maxEntries) {
    return {
      valid: false,
      error: getValidationError('TEAM_MAX_ENTRIES', { max: maxEntries }, lang)
    };
  }
  return { valid: true };
}

// 4. Student Item Limits
export function checkStudentItemLimits(studentId, existingEntries, competitions, category, targetCompType, lang = 'ml') {
  // Find all entries involving this student
  const studentEntries = existingEntries.filter(e => e.memberStudentIds && e.memberStudentIds.includes(studentId));
  
  let individualCount = 0;
  let groupCount = 0;
  
  studentEntries.forEach(e => {
    const comp = competitions.find(c => c.id === e.competitionId);
    if (!comp) return;
    if (comp.competitionType === 'individual') {
      individualCount++;
    } else {
      groupCount++;
    }
  });

  const totalCount = individualCount + groupCount;

  // Let's check hypothetical new count
  if (targetCompType === 'individual') {
    const maxInd = category.maxIndividualItems !== null ? category.maxIndividualItems : 99;
    if (individualCount >= maxInd) {
      return {
        valid: false,
        error: getValidationError('INDIVIDUAL_LIMIT', { name: studentId, count: individualCount, max: maxInd }, lang)
      };
    }
  } else {
    const maxGrp = category.maxGroupItems !== null ? category.maxGroupItems : 99;
    if (groupCount >= maxGrp) {
      return {
        valid: false,
        error: getValidationError('GROUP_LIMIT', { name: studentId, count: groupCount, max: maxGrp }, lang)
      };
    }
  }

  const maxTot = category.maxTotalItems !== null ? category.maxTotalItems : 99;
  if (totalCount >= maxTot) {
    return {
      valid: false,
      error: getValidationError('TOTAL_LIMIT', { name: studentId, max: maxTot }, lang)
    };
  }

  return { valid: true };
}

// 5. Group Size constraints
export function checkGroupSize(membersList, competition, lang = 'ml') {
  const size = membersList.length;
  const min = competition.minParticipantsPerEntry || 1;
  const max = competition.maxParticipantsPerEntry || 1;

  if (size < min) {
    return {
      valid: false,
      error: getValidationError('GROUP_SIZE_MIN', { min }, lang)
    };
  }
  if (size > max) {
    return {
      valid: false,
      error: getValidationError('GROUP_SIZE_MAX', { max }, lang)
    };
  }
  return { valid: true };
}

// 6. Substitute limits
export function checkSubstituteLimit(substitutesList, competition, lang = 'ml') {
  const size = substitutesList ? substitutesList.length : 0;
  const limit = competition.substituteLimit || 0;

  if (size > limit) {
    return {
      valid: false,
      error: getValidationError('SUBSTITUTE_LIMIT', { max: limit }, lang)
    };
  }
  return { valid: true };
}

// 7. Duplicate Participant Check
export function checkDuplicateParticipant(studentId, existingEntries, competitionId, studentName, lang = 'ml') {
  const duplicate = existingEntries.some(e => 
    e.competitionId === competitionId && 
    e.memberStudentIds && 
    e.memberStudentIds.includes(studentId)
  );

  if (duplicate) {
    return {
      valid: false,
      error: getValidationError('DUPLICATE_PARTICIPANT', { name: studentName }, lang)
    };
  }
  return { valid: true };
}

// 8. Schedule Conflict Check
export function checkScheduleConflict(studentId, newComp, existingEntries, competitions, studentName, lang = 'ml') {
  if (!newComp.eventDate || !newComp.startTime) return { valid: true };

  // Find all competitions this student is registered for
  const studentEntries = existingEntries.filter(e => e.memberStudentIds && e.memberStudentIds.includes(studentId));
  
  for (const entry of studentEntries) {
    if (entry.competitionId === newComp.id) continue; // skip same
    const comp = competitions.find(c => c.id === entry.competitionId);
    if (!comp) continue;

    if (comp.eventDate === newComp.eventDate && comp.startTime === newComp.startTime) {
      return {
        valid: false,
        error: getValidationError('SCHEDULE_CONFLICT', {
          name: studentName,
          date: comp.eventDate,
          time: comp.startTime,
          eventName: comp.name
        }, lang)
      };
    }
  }

  return { valid: true };
}
