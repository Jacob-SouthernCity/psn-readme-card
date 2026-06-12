// Sony's online ID rules: starts with a letter, 3-16 chars,
// letters/digits/hyphens/underscores only.
export const PSN_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_-]{2,15}$/;

export function isValidPsnId(value: string): boolean {
  return PSN_ID_PATTERN.test(value);
}
