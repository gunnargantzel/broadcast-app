// news.js
// Placeholder for news rotation. Replace with your actual implementation as needed.
export function rotateNews() {
  // no-op until wired to Dataverse or RSS
}

export function startNewsRotation(intervalMs = 15000) {
  rotateNews();
  if (!window.__newsRotationTimer) {
    window.__newsRotationTimer = setInterval(rotateNews, intervalMs);
  }
}
