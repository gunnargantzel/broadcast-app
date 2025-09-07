// clock.js
export function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('nb-NO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const el = document.getElementById('currentTime');
  if (el) el.textContent = timeString;
}

export function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
