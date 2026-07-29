export function normalizeTopicLabel(raw) {
  if (!raw) return 'General';

  let label = String(raw).replace(/\r/g, '').trim();

  // Clean common keyword-group header formatting, e.g. "# === AI ==="
  label = label
    .replace(/^#\s*/, '')
    .replace(/^=+\s*/, '')
    .replace(/\s*=+$/, '')
    .trim();

  const parts = label
    .split(/\n|[#=]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 0) {
    label = parts.find((part) => /[A-Za-z0-9]/.test(part)) || parts[0];
  }

  return label || 'General';
}

