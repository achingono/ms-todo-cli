export function sanitizeSearchTerm(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[\u0009-\u000d]/g, ' ')
    .replace(/[\u0000-\u0008\u000e-\u001f\u007f]/g, '')
    .replace(/[^\p{L}\p{N}\s._-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
