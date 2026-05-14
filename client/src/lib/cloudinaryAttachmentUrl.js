/** Cloudinary rejects fl_attachment:… if the name contains "." etc. — only [a-zA-Z0-9_-]. */
function cloudinarySafeAttachmentFilename(name) {
  const n = String(name || "file").trim() || "file";
  return n.replace(/[^a-zA-Z0-9_-]/g, "_").replace(/_+/g, "_").slice(0, 120) || "file";
}

/** Used if download_url is missing on older payloads. */
export function cloudinaryAttachmentUrl(secureUrl, filename = "file") {
  if (!secureUrl || typeof secureUrl !== "string") return secureUrl;
  const safe = cloudinarySafeAttachmentFilename(filename);
  const marker = /\/(image|raw|video|auto)\/upload\//;
  if (!marker.test(secureUrl)) return secureUrl;
  return secureUrl.replace(marker, `/$1/upload/fl_attachment:${safe}/`);
}
