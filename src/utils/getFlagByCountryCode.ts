export function getFlagByCountryCode(code?: string | null): string | null {
  if (!code) return null;
  return `/flags/${code.toLowerCase()}.png`; 
}
