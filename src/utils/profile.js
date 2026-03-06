import { WRITING_SAMPLE_TYPES, DEFAULT_SAMPLE_TYPE, PROFILE_OPTIONS, PRIMARY_PROFILE_ID } from '../constants/index.js';

export function normalizeSampleSlot(slot, fallbackId) {
  return {
    id: slot?.id ?? fallbackId,
    text: slot?.text || "",
    type: WRITING_SAMPLE_TYPES.some(t => t.value === slot?.type) ? slot.type : DEFAULT_SAMPLE_TYPE,
  };
}

export function getFilledSlots(slots) {
  return slots
    .map((slot, i) => normalizeSampleSlot(slot, i + 1))
    .filter(slot => slot.text.trim().length > 50);
}

export function formatSampleForPrompt(sample, index) {
  const typeLabel = WRITING_SAMPLE_TYPES.find(t => t.value === sample.type)?.label || "General writing";
  return `--- Sample ${index + 1} (${typeLabel}) ---\n${sample.text.trim()}`;
}

export function normalizeStoredStyles(rawStyles) {
  const normalized = {};
  const allEntries = Object.entries(rawStyles || {});
  for (const [id, style] of allEntries) {
    const sampleEntries = Array.isArray(style.sampleEntries)
      ? style.sampleEntries
          .map((sample, i) => normalizeSampleSlot(sample, i + 1))
          .filter(sample => sample.text.trim().length > 0)
      : (Array.isArray(style.samples) ? style.samples : [])
          .map((text, i) => normalizeSampleSlot({ id: i + 1, text, type: DEFAULT_SAMPLE_TYPE }, i + 1))
          .filter(sample => sample.text.trim().length > 0);
    const targetId = id === PRIMARY_PROFILE_ID ? "personal" : id;
    const profileName = PROFILE_OPTIONS.find((p) => p.id === targetId)?.label || style.name || "Custom";
    normalized[targetId] = {
      ...style,
      id: targetId,
      name: profileName,
      sampleEntries,
      samples: sampleEntries.map(sample => sample.text),
      sampleCount: style.sampleCount || sampleEntries.length,
    };
  }
  if (!Object.keys(normalized).length) return normalized;
  return normalized;
}

export function collectCoverageGaps(sampleEntries = []) {
  const covered = new Set(
    (sampleEntries || [])
      .map((entry) => entry?.type)
      .filter((type) => WRITING_SAMPLE_TYPES.some((item) => item.value === type))
  );
  return WRITING_SAMPLE_TYPES.filter((item) => !covered.has(item.value));
}

export function computeProfileHealth(profileRecord) {
  if (!profileRecord) {
    return { score: 0, sampleCount: 0, typeCoverage: 0, missingTypes: WRITING_SAMPLE_TYPES.map((t) => t.label), lastUpdated: null };
  }
  const sampleEntries = Array.isArray(profileRecord.sampleEntries) ? profileRecord.sampleEntries : [];
  const sampleCount = sampleEntries.length;
  const missing = collectCoverageGaps(sampleEntries);
  const typeCoverage = WRITING_SAMPLE_TYPES.length - missing.length;
  const freshnessBonus = profileRecord.updatedAt ? 15 : 0;
  const score = Math.min(100, sampleCount * 8 + typeCoverage * 12 + freshnessBonus);
  return {
    score,
    sampleCount,
    typeCoverage,
    missingTypes: missing.map((item) => item.label),
    lastUpdated: profileRecord.updatedAt || null,
  };
}

export function hasTrainedProfile(profile) {
  return !!(profile?.profile && (profile.sampleCount || 0) > 0);
}
