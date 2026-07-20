// 알람 설정 컴포넌트 (AlarmScheduler Component)
const style = document.createElement('style');
style.textContent = `
  .scheduler-card {
    display: flex;
    flex-direction: column;
  }
  .time-picker-row {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .time-input-group {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .time-input-label {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-bottom: 6px;
    text-transform: uppercase;
    font-weight: 600;
    letter-spacing: 1px;
  }
  .time-select {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 1.3rem;
    font-family: var(--font-digital);
    font-weight: 700;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
    text-align: center;
  }
  .time-select:focus {
    border-color: var(--color-neon-purple);
  }
  .mission-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }
  .mission-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px 12px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .mission-card:hover {
    border-color: rgba(138, 43, 226, 0.4);
    background: rgba(138, 43, 226, 0.05);
  }
  .mission-card.selected {
    border-color: var(--color-neon-purple);
    background: rgba(138, 43, 226, 0.15);
    box-shadow: 0 0 12px rgba(138, 43, 226, 0.4);
  }
  .mission-icon {
    font-size: 1.5rem;
  }
  .mission-name {
    font-size: 0.85rem;
    font-weight: 600;
  }
  .distance-slider-group {
    display: none;
    flex-direction: column;
    margin-bottom: 20px;
    animation: schedulerFadeIn 0.3s ease forwards;
  }
  .distance-slider-header {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    margin-bottom: 8px;
    color: var(--text-secondary);
  }
  .distance-slider {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.1);
    outline: none;
  }
  .distance-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--color-neon-purple);
    cursor: pointer;
    box-shadow: 0 0 8px var(--color-neon-purple);
    transition: transform 0.1s;
  }
  .distance-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }
  .active-alarm-info {
    display: none;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 10px 0;
    animation: schedulerFadeIn 0.3s ease forwards;
  }
  .active-alarm-time {
    font-family: var(--font-digital);
    font-size: 2.4rem;
    font-weight: 700;
    color: var(--color-success);
    text-shadow: 0 0 10px rgba(0, 230, 118, 0.4);
    margin: 8px 0;
  }
  @keyframes schedulerFadeIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

export default class AlarmScheduler {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onAlarmSet = options.onAlarmSet || (() => {});
    this.onAlarmCancel = options.onAlarmCancel || (() => {});

    this.selectedMission = 'switch'; // 기본 택트 스위치 미션
    this.alarmTime = null; // { hour, minute }
    this.distanceThreshold = 50; // 기본 초음파 거리 임계값 50cm
    this.isAlarmSet = false;

    this.render();
    this.bindEvents();
  }

  render() {
    this.container.innerHTML = `
      <div class="glass-card scheduler-card">
        <span class="title-medium">⏰ 알람 및 미션 예약</span>
        
        <!-- 알람이 활성화된 상태의 UI -->
        <div class="active-alarm-info" id="active-alarm-info">
          <p class="text-desc">지정된 시간에 미션 알람이 울립니다</p>
          <div class="active-alarm-time" id="active-alarm-time">00:00</div>
          <p class="text-desc" style="margin-bottom: 16px;" id="active-alarm-mission-text">미션: 택트 스위치 3초 누르기</p>
          <button class="btn-neon" id="btn-cancel-alarm" style="border-color: var(--color-danger); box-shadow: 0 0 8px rgba(255, 23, 68, 0.2);">알람 예약 취소</button>
        </div>

        <!-- 알람 설정 대기 UI -->
        <div id="setup-alarm-info">
          <!-- 시간 선택기 -->
          <div class="time-picker-row">
            <div class="time-input-group">
              <span class="time-input-label">시간 (시)</span>
              <select class="time-select" id="select-hour">
                ${Array.from({ length: 24 }, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
              </select>
            </div>
            <div class="time-input-group" style="justify-content: center; font-size: 1.8rem; font-family: var(--font-digital); font-weight: 700; color: var(--text-secondary); margin-top: 22px;">
              :
            </div>
            <div class="time-input-group">
              <span class="time-input-label">분 (분)</span>
              <select class="time-select" id="select-minute">
                ${Array.from({ length: 60 }, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- 미션 그리드 -->
          <span class="time-input-label" style="display: block; margin-bottom: 8px;">미션 종류 선택</span>
          <div class="mission-grid">
            <div class="mission-card selected" data-mission="switch">
              <span class="mission-icon">🔘</span>
              <span class="mission-name">스위치 누르기</span>
            </div>
            <div class="mission-card" data-mission="ultrasonic">
              <span class="mission-icon">📏</span>
              <span class="mission-name">초음파 거리</span>
            </div>
            <div class="mission-card" data-mission="math">
              <span class="mission-icon">➕</span>
              <span class="mission-name">수학 풀기</span>
            </div>
            <div class="mission-card" data-mission="random">
              <span class="mission-icon">🎲</span>
              <span class="mission-name">랜덤 미션</span>
            </div>
          </div>

          <!-- 초음파 슬라이더 -->
          <div class="distance-slider-group" id="distance-slider-group">
            <div class="distance-slider-header">
              <span>해제 임계 거리</span>
              <span id="slider-value">50 cm</span>
            </div>
            <input type="range" min="10" max="150" value="50" class="distance-slider" id="distance-slider">
          </div>

          <button class="btn-neon" id="btn-set-alarm">알람 설정하기</button>
        </div>
      </div>
    `;

    this.setupView = this.container.querySelector('#setup-alarm-info');
    this.activeView = this.container.querySelector('#active-alarm-info');
    this.activeTimeEl = this.container.querySelector('#active-alarm-time');
    this.activeMissionEl = this.container.querySelector('#active-alarm-mission-text');
    
    this.hourSelect = this.container.querySelector('#select-hour');
    this.minuteSelect = this.container.querySelector('#select-minute');
    this.sliderGroup = this.container.querySelector('#distance-slider-group');
    this.slider = this.container.querySelector('#distance-slider');
    this.sliderVal = this.container.querySelector('#slider-value');
    
    this.btnSet = this.container.querySelector('#btn-set-alarm');
    this.btnCancel = this.container.querySelector('#btn-cancel-alarm');
    this.missionCards = this.container.querySelectorAll('.mission-card');

    // 기본 시간은 현재 시간 + 5분 후로 초기값 설정
    this.setDefaultTime();
  }

  setDefaultTime() {
    const now = new Date();
    let future = new Date(now.getTime() + 5 * 60 * 1000);
    this.hourSelect.value = future.getHours();
    this.minuteSelect.value = future.getMinutes();
  }

  bindEvents() {
    // 미션 카드 선택 이벤트
    this.missionCards.forEach(card => {
      card.addEventListener('click', () => {
        this.missionCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMission = card.dataset.mission;

        // 초음파 임계 거리 설정 슬라이더의 토글 처리
        if (this.selectedMission === 'ultrasonic' || this.selectedMission === 'random') {
          this.sliderGroup.style.display = 'flex';
        } else {
          this.sliderGroup.style.display = 'none';
        }
      });
    });

    // 슬라이더 값 변경
    this.slider.addEventListener('input', (e) => {
      this.distanceThreshold = parseInt(e.target.value);
      this.sliderVal.textContent = `${this.distanceThreshold} cm`;
    });

    // 알람 설정 버튼
    this.btnSet.addEventListener('click', () => {
      const hour = parseInt(this.hourSelect.value);
      const minute = parseInt(this.minuteSelect.value);
      this.setAlarm(hour, minute);
    });

    // 알람 취소 버튼
    this.btnCancel.addEventListener('click', () => {
      this.cancelAlarm();
    });
  }

  setAlarm(hour, minute) {
    this.alarmTime = { hour, minute };
    this.isAlarmSet = true;
    
    // UI 전환
    this.setupView.style.display = 'none';
    this.activeView.style.display = 'flex';
    
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    this.activeTimeEl.textContent = timeStr;

    let missionText = '';
    switch (this.selectedMission) {
      case 'switch':
        missionText = '미션: 택트 스위치 3초 누르기';
        break;
      case 'ultrasonic':
        missionText = `미션: 초음파 센서 멀어지기 (${this.distanceThreshold} cm 이상)`;
        break;
      case 'math':
        missionText = '미션: 수학 사칙연산 풀기';
        break;
      case 'random':
        missionText = `미션: 랜덤 미션 (초음파 임계값: ${this.distanceThreshold} cm)`;
        break;
    }
    this.activeMissionEl.textContent = missionText;

    this.onAlarmSet({
      hour,
      minute,
      mission: this.selectedMission,
      threshold: this.distanceThreshold
    });
  }

  cancelAlarm() {
    this.alarmTime = null;
    this.isAlarmSet = false;

    // UI 전환
    this.activeView.style.display = 'none';
    this.setupView.style.display = 'block';
    
    this.onAlarmCancel();
  }
}
