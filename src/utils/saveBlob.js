// Browser-side blob saver. Replaces `file-saver`, whose package files are
// stored as cloud-only placeholders (0 bytes) by Google Drive in this
// project's shared folder, making its `saveAs` import resolve to undefined
// at runtime — exports would silently fail after blob generation.
export function saveAs(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
