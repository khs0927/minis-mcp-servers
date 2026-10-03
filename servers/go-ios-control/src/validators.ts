export function assertBundleId(bundleId: string): string {
  const value = bundleId.trim();
  if (!/^[A-Za-z0-9.-]{3,255}$/.test(value)) throw new Error('Invalid iOS bundle identifier');
  return value;
}

export function assertHttpUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http/https URLs are allowed');
  return url.toString();
}

export function assertCoordinate(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 10000) throw new Error('Coordinate must be between 0 and 10000');
  return value;
}

export function assertDuration(value: number): number {
  if (!Number.isFinite(value) || value <= 0 || value > 10) throw new Error('Duration must be > 0 and <= 10 seconds');
  return value;
}
