export const normalizeString = (s: string): string =>
  s
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/--/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
