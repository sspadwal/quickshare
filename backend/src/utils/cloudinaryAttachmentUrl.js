/**
 * Cloudinary URL with fl_attachment so browsers offer a download (PDF, images, etc.).
 * @see https://cloudinary.com/documentation/media_delivery
 */
export function cloudinaryAttachmentUrl(secureUrl, filename = "file") {
  if (!secureUrl || typeof secureUrl !== "string") return secureUrl;
  const safe = String(filename).replace(/[^\w.\-]/g, "_").slice(0, 180) || "file";
  const marker = /\/(image|raw|video|auto)\/upload\//;
  if (!marker.test(secureUrl)) return secureUrl;
  return secureUrl.replace(marker, `/$1/upload/fl_attachment:${safe}/`);
}
