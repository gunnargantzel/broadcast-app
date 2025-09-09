// news.js
// Enhanced news ticker with stable speed and publication dates

let currentNewsIndex = 0;
let newsItems = [];
let tickerAnimation = null;

export function rotateNews() {
  if (newsItems.length === 0) return;
  
  currentNewsIndex = (currentNewsIndex + 1) % newsItems.length;
  const newsElement = document.getElementById('newsText');
  if (newsElement) {
    newsElement.textContent = newsItems[currentNewsIndex];
  }
}

export function updateNewsItems(newItems) {
  newsItems = newItems;
  currentNewsIndex = 0;
  
  // Update the ticker animation duration based on content length
  updateTickerSpeed();
  
  // Update the display
  const newsElement = document.getElementById('newsText');
  if (newsElement && newsItems.length > 0) {
    newsElement.textContent = newsItems[0];
  }
}

function updateTickerSpeed() {
  const newsElement = document.getElementById('newsText');
  if (!newsElement || newsItems.length === 0) return;
  
  // Calculate optimal duration based on content
  // Base duration: 30 seconds for readability
  // Additional time: 2 seconds per news item to prevent rushing
  const baseDuration = 30;
  const additionalDuration = newsItems.length * 2;
  const totalDuration = baseDuration + additionalDuration;
  
  // Update CSS animation duration
  newsElement.style.animationDuration = `${totalDuration}s`;
  
  console.log(`📰 News ticker speed updated: ${totalDuration}s for ${newsItems.length} items`);
}

export function startNewsRotation(intervalMs = 8000) {
  rotateNews();
  if (!window.__newsRotationTimer) {
    window.__newsRotationTimer = setInterval(rotateNews, intervalMs);
  }
}

export function stopNewsRotation() {
  if (window.__newsRotationTimer) {
    clearInterval(window.__newsRotationTimer);
    window.__newsRotationTimer = null;
  }
}
