// 컴포넌트 데모 구동용 스크립트 (demo.js)
import Clock from './components/Clock.js';
import SerialConnector from './components/SerialConnector.js';
import AlarmScheduler from './components/AlarmScheduler.js';
import SensorMonitor from './components/SensorMonitor.js';
import AlarmTriggerOverlay from './components/AlarmTriggerOverlay.js';

// 가상 시뮬레이터 상태
const simState = {
  isConnected: false,
  isAlarmTriggered: false,
  virtualDist: 80,
  virtualSwitch: 0,
  alarmConfig: null,      // { hour, minute, mission, threshold }
  alarmFiredToday: false  // 중복 작동 방지
};

// 1. 컴포넌트 인스턴스화
const clock = new Clock('clock-container');
const monitor = new SensorMonitor('monitor-container');
const scheduler = new AlarmScheduler('scheduler-container', {
  onAlarmSet: (config) => {
    simState.alarmConfig = config;
    simState.alarmFiredToday = false;
    console.log('[시뮬레이터] 알람 설정 완료됨:', config);
  },
  onAlarmCancel: () => {
    simState.alarmConfig = null;
    simState.alarmFiredToday = false;
    console.log('[시뮬레이터] 알람 예약 취소됨');
  }
});

// 알람 해제 오버레이 컴포넌트
const overlay = new AlarmTriggerOverlay('overlay-container', {
  onMissionComplete: () => {
    handleSimAlarmOff();
  }
});

// 시리얼 커넥터 컴포넌트 (데모 연결 핸들러 바인딩)
const serial = new SerialConnector('serial-container', {
  onConnect: () => {
    simState.isConnected = true;
    updateSimulatorConnectUI('connected');
  },
  onDisconnect: () => {
    simState.isConnected = false;
    monitor.reset();
    updateSimulatorConnectUI('disconnected');
    if (simState.isAlarmTriggered) {
      handleSimAlarmOff();
    }
  }
});

// 2. 시뮬레이터 UI 제어 바인딩
const simBtnConnect = document.getElementById('sim-btn-connect');
const simBtnError = document.getElementById('sim-btn-error');
const simBtnDisconnect = document.getElementById('sim-btn-disconnect');

const simDistSlider = document.getElementById('sim-dist-slider');
const simDistValText = document.getElementById('sim-dist-val');

const simBtnSwitch = document.getElementById('sim-btn-switch');
const simBtnTriggerAlarm = document.getElementById('sim-btn-trigger-alarm');

// 연결 상태 버튼 제어
simBtnConnect.addEventListener('click', () => {
  simState.isConnected = true;
  serial.isConnected = true;
  serial.updateStatus('connected', '연결 완료 (가상)');
  serial.btnEl.textContent = '연결 해제하기';
  serial.cardEl.classList.add('neon-border-purple');
  updateSimulatorConnectUI('connected');
});

simBtnError.addEventListener('click', () => {
  simState.isConnected = false;
  serial.isConnected = false;
  serial.updateStatus('error', '연결 에러 (가상)');
  serial.btnEl.textContent = '연결 완료하기';
  serial.cardEl.classList.remove('neon-border-purple');
  updateSimulatorConnectUI('error');
  monitor.reset();
  if (simState.isAlarmTriggered) {
    handleSimAlarmOff();
  }
});

simBtnDisconnect.addEventListener('click', () => {
  simState.isConnected = false;
  serial.isConnected = false;
  serial.updateStatus('disconnected', '연결 해제 (가상)');
  serial.btnEl.textContent = '연결 완료하기';
  serial.cardEl.classList.remove('neon-border-purple');
  updateSimulatorConnectUI('disconnected');
  monitor.reset();
  if (simState.isAlarmTriggered) {
    handleSimAlarmOff();
  }
});

function updateSimulatorConnectUI(state) {
  simBtnConnect.classList.remove('active');
  simBtnError.classList.remove('active');
  simBtnDisconnect.classList.remove('active');

  if (state === 'connected') {
    simBtnConnect.classList.add('active');
  } else if (state === 'error') {
    simBtnError.classList.add('active');
  } else {
    simBtnDisconnect.classList.add('active');
  }
}

// 거리 센서 시뮬레이션 제어
simDistSlider.addEventListener('input', (e) => {
  const dist = parseInt(e.target.value);
  simState.virtualDist = dist;
  simDistValText.textContent = dist;

  // 모니터 대시보드 갱신
  monitor.updateData({ dist });

  // 알람 동작 중일 경우 오버레이에도 데이터 피딩
  if (simState.isAlarmTriggered) {
    overlay.updateRealtimeData({ dist });
  }
});

// 스위치 누름 (Hold) 시뮬레이션 제어
const setSwitchState = (swState) => {
  simState.virtualSwitch = swState;
  
  // 모니터 대시보드 갱신
  monitor.updateData({ swState });

  // 알람 구동 중일 경우 오버레이에도 데이터 피딩
  if (simState.isAlarmTriggered) {
    overlay.updateRealtimeData({ swState });
  }
};

// 마우스 및 터치 프레스 시 '눌림' 상태 처리
simBtnSwitch.addEventListener('mousedown', () => setSwitchState(1));
simBtnSwitch.addEventListener('mouseup', () => setSwitchState(0));
simBtnSwitch.addEventListener('mouseleave', () => setSwitchState(0));

simBtnSwitch.addEventListener('touchstart', (e) => {
  e.preventDefault();
  setSwitchState(1);
});
simBtnSwitch.addEventListener('touchend', (e) => {
  e.preventDefault();
  setSwitchState(0);
});

// 알람 강제 구동 시뮬레이션
simBtnTriggerAlarm.addEventListener('click', () => {
  if (simState.isAlarmTriggered) {
    handleSimAlarmOff();
  } else {
    handleSimAlarmOn();
  }
});

function handleSimAlarmOn() {
  simState.isAlarmTriggered = true;
  simState.alarmFiredToday = true;
  simBtnTriggerAlarm.textContent = '🔕 가상 알람 강제 해제';
  simBtnTriggerAlarm.style.borderColor = 'var(--color-success)';
  simBtnTriggerAlarm.style.boxShadow = '0 0 10px rgba(0, 230, 118, 0.4)';

  // 오버레이 강제 호출
  overlay.trigger(scheduler.selectedMission, scheduler.distanceThreshold);
  console.log('[시뮬레이터] 알람 구동:', scheduler.selectedMission, '임계값:', scheduler.distanceThreshold);
}

function handleSimAlarmOff() {
  simState.isAlarmTriggered = false;
  simBtnTriggerAlarm.textContent = '🚨 알람 즉시 터뜨리기';
  simBtnTriggerAlarm.style.borderColor = 'var(--color-danger)';
  simBtnTriggerAlarm.style.boxShadow = '0 0 8px rgba(255, 23, 68, 0.2)';
  
  overlay.overlayEl.style.display = 'none';
  scheduler.cancelAlarm();
  console.log('[시뮬레이터] 알람 정지 완료');
}

// 3. 시뮬레이터 실시간 알람 시간 감시 루프
setInterval(() => {
  if (!simState.alarmConfig || simState.isAlarmTriggered || simState.alarmFiredToday) return;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // 설정 시/분이 일치할 경우 알람 구동
  if (currentHour === simState.alarmConfig.hour && currentMinute === simState.alarmConfig.minute) {
    handleSimAlarmOn();
  }
}, 1000);

// 매 분 변경 시 중복 작동 방지 해제
setInterval(() => {
  if (simState.alarmConfig && simState.alarmFiredToday) {
    const now = new Date();
    if (now.getHours() !== simState.alarmConfig.hour || now.getMinutes() !== simState.alarmConfig.minute) {
      simState.alarmFiredToday = false; 
    }
  }
}, 30000);
