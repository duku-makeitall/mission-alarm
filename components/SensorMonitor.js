// 센서 모니터링 컴포넌트 (SensorMonitor Component)
const style = document.createElement('style');
style.textContent = `
  .monitor-container {
    display: flex;
    flex-direction: column;
  }
  .monitor-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  .monitor-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 18px;
    text-align: center;
    background: var(--bg-card);
  }
  .monitor-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: 8px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .monitor-value {
    font-family: var(--font-digital);
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-primary);
    transition: text-shadow 0.3s ease, color 0.3s ease;
  }
  .monitor-unit {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-family: var(--font-main);
    margin-left: 2px;
  }
  .monitor-lamp {
    width: 36px;
    height: 12px;
    border-radius: 6px;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: all 0.3s ease;
    margin-top: 10px;
  }
  .monitor-lamp.active {
    background-color: var(--color-success);
    box-shadow: 0 0 10px var(--color-success);
    border-color: var(--color-success);
  }
  .monitor-lamp-text {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 4px;
  }
`;
document.head.appendChild(style);

export default class SensorMonitor {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="monitor-container">
        <span class="title-medium">📊 실시간 기기 상태 모니터링</span>
        <div class="monitor-grid">
          <!-- 초음파 거리 모니터링 -->
          <div class="glass-card monitor-card">
            <span class="monitor-label">📏 초음파 측정 거리</span>
            <div>
              <span class="monitor-value" id="monitor-distance-val">--</span>
              <span class="monitor-unit">cm</span>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 14px;">실시간 장애물 거리</div>
          </div>

          <!-- 택트 스위치 모니터링 -->
          <div class="glass-card monitor-card">
            <span class="monitor-label">🔘 스위치 눌림 상태</span>
            <div class="monitor-lamp" id="monitor-switch-lamp"></div>
            <div class="monitor-lamp-text" id="monitor-switch-text">안 눌림</div>
          </div>
        </div>
      </div>
    `;

    this.distValEl = this.container.querySelector('#monitor-distance-val');
    this.switchLampEl = this.container.querySelector('#monitor-switch-lamp');
    this.switchTextEl = this.container.querySelector('#monitor-switch-text');
  }

  // 실시간 수신된 데이터를 대시보드에 업데이트
  updateData(data) {
    const { dist, swState } = data; // swState: 0(안눌림), 1(눌림)

    // 초음파 거리 업데이트
    if (dist !== undefined) {
      const fixedDist = parseFloat(dist).toFixed(1);
      this.distValEl.textContent = fixedDist;
      
      // 거리가 가까워지면(예: 15cm 이내) 모니터 텍스트에 부드러운 화이트 글로우 추가
      if (dist < 15) {
        this.distValEl.style.color = '#FFF';
        this.distValEl.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.4)';
      } else {
        this.distValEl.style.color = 'var(--text-primary)';
        this.distValEl.style.textShadow = 'none';
      }
    }

    // 택트 스위치 상태 업데이트
    if (swState !== undefined) {
      if (swState === 1) {
        this.switchLampEl.classList.add('active');
        this.switchTextEl.textContent = '눌림';
        this.switchTextEl.style.color = 'var(--color-success)';
      } else {
        this.switchLampEl.classList.remove('active');
        this.switchTextEl.textContent = '안 눌림';
        this.switchTextEl.style.color = 'var(--text-secondary)';
      }
    }
  }

  reset() {
    this.distValEl.textContent = '--';
    this.switchLampEl.classList.remove('active');
    this.switchTextEl.textContent = '안 눌림';
    this.switchTextEl.style.color = 'var(--text-secondary)';
  }
}
