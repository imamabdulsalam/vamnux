export function gameFamilyPath(name: string) {
  return `/games/${encodeURIComponent(name)}`;
}

export function decodeGameFamilySegment(segment: string | undefined) {
  if (!segment) return null;
  try {
    const decoded = decodeURIComponent(segment).trim();
    return decoded || null;
  } catch {
    return null;
  }
}
