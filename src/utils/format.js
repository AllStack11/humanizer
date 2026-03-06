import { OUTPUT_PRESET_OPTIONS } from '../constants/index.js';

export function getFormatPresetInstruction(value) {
  return OUTPUT_PRESET_OPTIONS.find((option) => option.value === value)?.prompt || "";
}

export function formatRelativeTime(date) {
  if (!date) return "";
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
