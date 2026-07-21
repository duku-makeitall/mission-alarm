// 알람 오버레이 컴포넌트 (AlarmTriggerOverlay Component)
const style = document.createElement('style');
style.textContent = `
  .overlay-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(10, 14, 23, 0.98);
    z-index: 9999;
    display: none;
    justify-content: center;
    align-items: center;
    padding: 24px;
    box-sizing: border-box;
  }
  .overlay-content {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 24px;
  }
  .overlay-title {
    font-size: 2.2rem;
    font-weight: 900;
    color: var(--color-danger);
    text-shadow: 0 0 10px rgba(255, 23, 68, 0.8),
                 0 0 20px rgba(255, 23, 68, 0.4);
    letter-spacing: 2px;
    animation: flashTitle 1s infinite alternate;
  }
  @keyframes flashTitle {
    from { opacity: 0.6; transform: scale(0.98); }
    to { opacity: 1; transform: scale(1.02); }
  }

  /* 서클 프로그레스 바 스타일 (스위치 3초 미션) */
  .circle-progress-wrapper {
    position: relative;
    width: 150px;
    height: 150px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .progress-ring {
    transform: rotate(-90deg);
  }
  .progress-ring__circle {
    transition: stroke-dashoffset 0.1s linear;
    stroke-dasharray: 377; /* 2 * PI * r (r=60) */
    stroke-dashoffset: 377;
  }
  .circle-inner-text {
    position: absolute;
    font-family: var(--font-digital);
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  /* 수학 문제 UI */
  .math-card {
    width: 100%;
    padding: 24px;
  }
  .math-question {
    font-size: 2rem;
    font-weight: 700;
    font-family: var(--font-digital);
    margin-bottom: 20px;
    color: var(--text-primary);
    text-shadow: 0 0 8px rgba(255,255,255,0.2);
  }
  .math-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    border-radius: 12px;
    padding: 14px;
    font-size: 1.5rem;
    text-align: center;
    outline: none;
    margin-bottom: 16px;
    transition: border-color 0.2s;
  }
  .math-input:focus {
    border-color: var(--color-danger);
  }
  .math-input.error {
    border-color: var(--color-danger);
    animation: mathShake 0.3s ease;
  }
  @keyframes mathShake {
    0% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    50% { transform: translateX(6px); }
    75% { transform: translateX(-6px); }
    100% { transform: translateX(0); }
  }

  /* 초음파 미션 게이지 */
  .ultrasonic-gauge-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 10px 0;
  }
  .gauge-track {
    width: 100%;
    height: 18px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 9px;
    overflow: hidden;
    position: relative;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .gauge-fill {
    height: 100%;
    width: 0%;
    background: linear-gradient(90deg, var(--color-neon-purple), var(--color-danger));
    transition: width 0.3s ease;
    box-shadow: 0 0 10px rgba(255, 23, 68, 0.5);
  }
  .gauge-fill.target-reached {
    background: linear-gradient(90deg, var(--color-neon-purple), var(--color-success));
    box-shadow: 0 0 10px var(--color-success);
  }
  .gauge-target-line {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    background-color: #FFF;
    box-shadow: 0 0 6px #FFF;
  }
  .gauge-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  /* 랜덤 룰렛 UI */
  .roulette-wrapper {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--color-neon-purple);
    padding: 20px;
    animation: pulseGlow 1s infinite alternate;
  }
  @keyframes pulseGlow {
    from { text-shadow: 0 0 4px rgba(138,43,226,0.3); }
    to { text-shadow: 0 0 15px rgba(138,43,226,0.8); }
  }
`;
document.head.appendChild(style);

export default class AlarmTriggerOverlay {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onMissionComplete = options.onMissionComplete || (() => {});
    
    // 미션 진행에 사용할 상태값
    this.activeMission = null; // 'switch', 'ultrasonic', 'math'
    this.threshold = 50; 
    
    // 3초 스위치 미션 카운터용
    this.switchHoldStartTime = null;
    this.switchHoldTimer = null;
    this.currentHoldSeconds = 0;
    
    // 수학 미션 정답 상태
    this.mathAnswer = null;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="overlay-backdrop alarm-active" id="alarm-overlay">
        <div class="overlay-content" id="overlay-content">
          <div class="overlay-title">📢 일어나세요!</div>
          <p class="text-desc" style="color: #FFF; font-size: 1rem;" id="mission-instruction">알람 해제 미션을 수행하세요</p>
          
          <!-- 미션 동적 장착 영역 -->
          <div id="dynamic-mission-area" style="width: 100%;"></div>

          <!-- 2단계: 비상 알람 해제 수동 버튼 -->
          <button class="btn-neon" id="btn-emergency-off" style="margin-top: 20px; border-color: var(--color-danger); box-shadow: 0 0 10px rgba(255, 23, 68, 0.4); background: rgba(255, 23, 68, 0.15);">
            비상 알람 해제 (수동 정지)
          </button>
        </div>
      </div>
    `;

    this.overlayEl = this.container.querySelector('#alarm-overlay');
    this.contentArea = this.container.querySelector('#dynamic-mission-area');
    this.instructionEl = this.container.querySelector('#mission-instruction');

    // 2단계: 수동 해제 이벤트 리스너
    this.emergencyBtn = this.container.querySelector('#btn-emergency-off');
    this.emergencyBtn.addEventListener('click', () => {
      console.log('[2단계 수동 해제] 비상 알람 해제 버튼 클릭됨');
      this.success();
    });
  }

  // 외부(app.js)에서 알람이 예약 도달했을 때 호출하여 오버레이 가동
  trigger(missionType, threshold) {
    // 3단계: 연속적인 알람 구동 시 이전 상태가 누적되어 오동작하지 않도록 변수 초기화
    this.activeMission = null;
    this.switchHoldStartTime = null;
    this.ultrasonicStartTime = null;
    this.mathAnswer = null;

    this.threshold = threshold;
    this.overlayEl.style.display = 'flex';
    this.contentArea.innerHTML = '';
    
    if (missionType === 'random') {
      this.runMissionRoulette();
    } else {
      this.activeMission = missionType;
      this.initMissionUI();
    }
  }

  // 랜덤 미션 선택 룰렛 연출
  runMissionRoulette() {
    this.instructionEl.textContent = '랜덤 미션을 결정하는 중...';
    this.contentArea.innerHTML = `
      <div class="glass-card math-card">
        <div class="roulette-wrapper" id="roulette-text">🎲 택트 스위치</div>
      </div>
    `;
    const rouletteTextEl = this.contentArea.querySelector('#roulette-text');
    const missions = [
      { id: 'switch', label: '🔘 택트 스위치 3초 누르기' },
      { id: 'ultrasonic', label: '📏 초음파 센서 멀어지기' },
      { id: 'math', label: '➕ 수학 사칙연산 풀기' }
    ];

    let counter = 0;
    const interval = setInterval(() => {
      rouletteTextEl.textContent = missions[counter % missions.length].label;
      counter++;
    }, 150);

    // 2초 룰렛 작동 후 최종 결정
    setTimeout(() => {
      clearInterval(interval);
      const chosen = missions[Math.floor(Math.random() * missions.length)];
      rouletteTextEl.textContent = `🎯 당첨: ${chosen.label.split(' ').slice(1).join(' ')}`;
      rouletteTextEl.style.color = 'var(--color-success)';

      setTimeout(() => {
        this.activeMission = chosen.id;
        this.initMissionUI();
      }, 1000);
    }, 2000);
  }

  // 선택된 미션 인터페이스 생성
  initMissionUI() {
    this.contentArea.innerHTML = '';
    
    if (this.activeMission === 'switch') {
      this.instructionEl.textContent = '아두이노 스위치를 3초 동안 꾹 누르고 있으세요.';
      this.contentArea.innerHTML = `
        <div class="circle-progress-wrapper" style="margin: 0 auto;">
          <svg class="progress-ring" width="140" height="140">
            <circle class="progress-ring__circle" stroke="var(--color-danger)" stroke-width="10" fill="transparent" r="60" cx="70" cy="70"/>
          </svg>
          <div class="circle-inner-text" id="hold-percentage">0%</div>
        </div>
      `;
      this.circleEl = this.contentArea.querySelector('.progress-ring__circle');
      this.percentageEl = this.contentArea.querySelector('#hold-percentage');
      this.setCircleProgress(0);
      
    } else if (this.activeMission === 'ultrasonic') {
      this.instructionEl.textContent = `센서와 멀어지세요! (목표: ${this.threshold}cm 이상)`;
      this.contentArea.innerHTML = `
        <div class="glass-card math-card">
          <div class="ultrasonic-gauge-wrapper">
            <div class="gauge-labels">
              <span>현재 거리</span>
              <span id="current-distance-text">-- cm</span>
            </div>
            <div class="gauge-track">
              <div class="gauge-fill" id="gauge-fill"></div>
            </div>
            <div class="gauge-labels">
              <span>0 cm</span>
              <span>목표: ${this.threshold} cm</span>
              <span>150 cm</span>
            </div>
          </div>
        </div>
      `;
      this.gaugeFillEl = this.contentArea.querySelector('#gauge-fill');
      this.currentDistTextEl = this.contentArea.querySelector('#current-distance-text');
      
    } else if (this.activeMission === 'math') {
      this.instructionEl.textContent = '아래 문제를 풀어 올바른 정답을 제출하세요.';
      
      // 수학 문제 무작위 출제 (두 자리 수 덧셈/뺄셈/곱셈)
      const ops = ['+', '-', '*'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      let num1, num2;
      
      if (op === '*') {
        num1 = Math.floor(Math.random() * 8) + 2; // 2 ~ 9
        num2 = Math.floor(Math.random() * 12) + 2; // 2 ~ 13
      } else {
        num1 = Math.floor(Math.random() * 80) + 10; // 10 ~ 89
        num2 = Math.floor(Math.random() * 80) + 10; // 10 ~ 89
      }
      
      let result = 0;
      if (op === '+') result = num1 + num2;
      else if (op === '-') result = num1 - num2;
      else if (op === '*') result = num1 * num2;
      this.mathAnswer = result;
      const symbol = op === '*' ? '×' : op;

      this.contentArea.innerHTML = `
        <div class="glass-card math-card">
          <div class="math-question">${num1} ${symbol} ${num2} = ?</div>
          <input type="number" class="math-input" id="input-math-ans" placeholder="정답 입력" autofocus pattern="\\d*">
          <button class="btn-neon" id="btn-math-submit" style="border-color: var(--color-danger); box-shadow: 0 0 8px rgba(255,23,68,0.2);">정답 제출</button>
        </div>
      `;

      this.mathInput = this.contentArea.querySelector('#input-math-ans');
      this.mathSubmitBtn = this.contentArea.querySelector('#btn-math-submit');
      
      // 이벤트 바인딩
      this.mathSubmitBtn.addEventListener('click', () => this.checkMathAnswer());
      this.mathInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.checkMathAnswer();
      });
    }
  }

  // 3초 스위치 홀드 프로그레스 링 제어
  setCircleProgress(percent) {
    if (!this.circleEl) return;
    const radius = this.circleEl.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    this.circleEl.style.strokeDashoffset = offset;
    
    if (this.percentageEl) {
      this.percentageEl.textContent = `${Math.round(percent)}%`;
    }
  }

  // 실시간 아두이노 수신 데이터를 미션 해제 조건과 비교 판정
  updateRealtimeData(data) {
    if (this.overlayEl.style.display === 'none') return;
    const { dist, swState } = data;

    // 1. 택트 스위치 미션
    if (this.activeMission === 'switch' && swState !== undefined) {
      if (swState === 1) {
        if (!this.switchHoldStartTime) {
          this.switchHoldStartTime = Date.now();
          this.circleEl.style.stroke = 'var(--color-success)';
          this.circleEl.style.filter = 'drop-shadow(0 0 6px var(--color-success))';
        }
        
        const elapsedTime = Date.now() - this.switchHoldStartTime;
        let percent = (elapsedTime / 3000) * 100;
        
        if (percent >= 100) {
          percent = 100;
          this.setCircleProgress(100);
          this.success();
        } else {
          this.setCircleProgress(percent);
        }
      } else {
        // 손가락을 떼면 리셋
        this.switchHoldStartTime = null;
        this.circleEl.style.stroke = 'var(--color-danger)';
        this.circleEl.style.filter = 'none';
        this.setCircleProgress(0);
        this.instructionEl.textContent = '아두이노 스위치를 3초 동안 꾹 누르고 있으세요.';
        this.instructionEl.style.color = '#FFF';
      }
    }

    // 2. 초음파 센서 미션
    if (this.activeMission === 'ultrasonic' && dist !== undefined) {
      if (this.currentDistTextEl && this.gaugeFillEl) {
        const fixedDist = parseFloat(dist).toFixed(1);
        this.currentDistTextEl.textContent = `${fixedDist} cm`;
        
        // 150cm 맥스 기준으로 진행률 계산
        let fillPercent = (dist / 150) * 100;
        if (fillPercent > 100) fillPercent = 100;
        
        // 임계값 타겟 라인 위치
        const targetPercent = (this.threshold / 150) * 100;
        
        // 게이지 바 채우기
        this.gaugeFillEl.style.width = `${fillPercent}%`;
        
        if (dist >= this.threshold) {
          this.gaugeFillEl.classList.add('target-reached');
          
          // 임계값을 연속 2회(4초) 유지하는 조건 만족 시 해제
          if (!this.ultrasonicStartTime) {
            this.ultrasonicStartTime = Date.now();
          }
          
          const heldTime = Date.now() - this.ultrasonicStartTime;
          if (heldTime >= 3000) {
            this.success();
          } else {
            this.instructionEl.textContent = `그대로 거리를 유지하세요! (${Math.ceil((3000 - heldTime) / 1000)}초 남음)`;
            this.instructionEl.style.color = 'var(--color-success)';
          }
        } else {
          this.gaugeFillEl.classList.remove('target-reached');
          this.ultrasonicStartTime = null;
          this.instructionEl.textContent = `센서와 멀어지세요! (목표: ${this.threshold}cm 이상)`;
          this.instructionEl.style.color = '#FFF';
        }
      }
    }
  }

  // 3. 수학 문제 정답 제출 검사
  checkMathAnswer() {
    const inputVal = parseInt(this.mathInput.value);
    
    if (inputVal === this.mathAnswer) {
      this.mathInput.classList.remove('error');
      this.success();
    } else {
      // 흔들기 애니메이션 & 에러 상태 부여
      this.mathInput.classList.add('error');
      this.mathInput.value = '';
      this.mathInput.focus();
      
      // 애니메이션 끝나면 클래스 제거
      setTimeout(() => {
        this.mathInput.classList.remove('error');
      }, 300);
    }
  }

  // 성공 처리
  success() {
    this.instructionEl.textContent = '🎉 미션 성공! 알람을 정지합니다.';
    this.instructionEl.style.color = 'var(--color-success)';
    
    // 상태 리셋
    this.switchHoldStartTime = null;
    this.ultrasonicStartTime = null;
    
    setTimeout(() => {
      this.overlayEl.style.display = 'none';
      this.onMissionComplete();
    }, 1500);
  }
}
