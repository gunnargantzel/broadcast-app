// clock.js
export const updateClock = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('no-NO', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            const clockElement = document.getElementById('currentTime');
            if (clockElement) {
                clockElement.textContent = timeString;
            }
        };

export function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}
