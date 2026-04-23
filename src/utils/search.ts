export function sanitizeSearchTerm(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[\u0009-\u000d]/g, ' ')
    .replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, '')
    // Preserve Unicode letters, numbers, whitespace, and the punctuation ., _, and -;
    // replace all other characters with spaces.
    .replace(/[^\p{L}\p{N}\s._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
