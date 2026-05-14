/**
 * Max bytes per file for Multer + pre-upload checks.
 * Cloudinary Free = 10 MiB (10485760). Files slightly over "10 MB" often exceed that.
 * Raise MAX_FILE_SIZE_BYTES when your Cloudinary plan allows (e.g. 104857600 for 100 MiB).
 */
const TEN_MIB = 10 * 1024 * 1024;
const ABSOLUTE_CAP = 100 * 1024 * 1024;

export function maxFileSizeBytes() {
  const n = Number(process.env.MAX_FILE_SIZE_BYTES);
  if (Number.isFinite(n) && n > 0 && n <= ABSOLUTE_CAP) return Math.floor(n);
  return TEN_MIB;
}

/** Human label for errors and UI (1 decimal). */
export function maxFileSizeMiBLabel() {
  const b = maxFileSizeBytes();
  return `${(b / (1024 * 1024)).toFixed(1)} MiB`;
}
