// 디지털 시계 컴포넌트 (Clock Component)
const style = document.createElement('style');
style.textContent = `
  .clock-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px 0;
  }
  .clock-display {
    font-family: var(--font-digital);
    font-size: 3.2rem;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text-primary);
    text-shadow: 0 0 10px rgba(138, 43, 226, 0.6),
                 0 0 20px rgba(138, 43, 226, 0.3);
  }
  .clock-ampm {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 2px;
    margin-bottom: 2px;
    text-transform: uppercase;
  }
`;
document.head.appendChild(style);

export default class Clock {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.timer = null;
    this.render();
    this.start();
  }

  render() {
    this.container.innerHTML = `
      <div class="clock-wrapper">
        <div class="clock-ampm" id="clock-ampm">오전</div>
        <div class="clock-display" id="clock-time">00:00:00</div>
      </div>
    `;
    this.ampmEl = this.container.querySelector('#clock-ampm');
    this.timeEl = this.container.querySelector('#clock-time');
  }

  start() {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const ampm = hours >= 12 ? '오후' : '오전';
      
      // 12시간제로 변환
      hours = hours % 12;
      hours = hours ? hours : 12; // 0시는 12시로 표시
      
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const hoursStr = String(hours).padStart(2, '0');

      if (this.ampmEl && this.timeEl) {
        this.ampmEl.textContent = ampm;
        this.timeEl.textContent = `${hoursStr}:${minutes}:${seconds}`;
      }
    };

    updateTime();
    this.timer = setInterval(updateTime, 1000);
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
