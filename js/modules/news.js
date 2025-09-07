// news.js
export const rotateNews = () => {
            this.currentNewsIndex = (this.currentNewsIndex + 1) % this.newsItems.length;
            const newsElement = document.getElementById('newsText');
            if (newsElement) {
                newsElement.textContent = this.newsItems[this.currentNewsIndex];
            }
        };

export function startNewsRotation() {
  // rotate immediately and then every 15s (adjust if needed)
  rotateNews();
  if (!window.__newsRotationTimer) {
    window.__newsRotationTimer = setInterval(rotateNews, 15000);
  }
}
