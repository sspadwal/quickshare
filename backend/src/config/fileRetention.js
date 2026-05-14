/**
 * Minutes before uploaded files are removed from Cloudinary and the File record is deleted.
 * Set FILE_TTL_MINUTES in env (e.g. 5–60). Invalid values fall back to 15.
 */
export function fileTtlMinutes() {
  const n = Number(process.env.FILE_TTL_MINUTES);
  if (Number.isFinite(n) && n > 0 && n <= 24 * 60) return Math.floor(n);
  return 15;
}

export function fileTtlMs() {
  return fileTtlMinutes() * 60 * 1000;
}
