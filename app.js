// 메인 컨트롤러 애플리케이션 (Main Controller app.js)
import Clock from './components/Clock.js';
import SerialConnector from './components/SerialConnector.js';
import AlarmScheduler from './components/AlarmScheduler.js';
import SensorMonitor from './components/SensorMonitor.js';
import AlarmTriggerOverlay from './components/AlarmTriggerOverlay.js';

// 전역 애플리케이션 상태 (State)
const state = {
  isConnected: false,
  alarmConfig: null,      // { hour, minute, mission, threshold }
  isAlarmTriggered: false, // 알람이 실제 울리고 있는지 여부
  alarmFiredToday: false  // 당일 알람 중복 작동 방지 플래그
};

// 1. 컴포넌트 초기화 및 조립
const clock = new Clock('clock-container');
const monitor = new SensorMonitor('monitor-container');

// 알람 미션 해제 오버레이 컴포넌트
const overlay = new AlarmTriggerOverlay('overlay-container', {
  onMissionComplete: () => {
    handleAlarmOff();
  }
});

// Web Serial 포트 통신 컴포넌트
const serial = new SerialConnector('serial-container', {
  onConnect: () => {
    state.isConnected = true;
  },
  onDisconnect: () => {
    state.isConnected = false;
    monitor.reset();
    // 알람 작동 중 연결 해제 시 안전장치 작동 (강제 정지)
    if (state.isAlarmTriggered) {
      handleAlarmOffForce();
    }
  },
  onData: (line) => {
    handleIncomingSerialData(line);
  },
  onError: (errorMsg) => {
    alert(`[장치 에러] ${errorMsg}`);
  }
});

// 알람 예약 스케줄러 컴포넌트
const scheduler = new AlarmScheduler('scheduler-container', {
  onAlarmSet: (config) => {
    state.alarmConfig = config;
    state.alarmFiredToday = false; // 새 알람 설정 시 플래그 리셋
    console.log('알람 설정 완료:', config);
  },
  onAlarmCancel: () => {
    state.alarmConfig = null;
    state.alarmFiredToday = false;
    console.log('알람 설정 취소됨');
  }
});

// 2. 아두이노 수신 데이터 파싱 및 가공 분배 (3단계: 센서 모니터링 및 미션 연동 활성화)
function handleIncomingSerialData(line) {
  if (!line.startsWith('DATA:')) {
    console.log('수신 데이터 디버그:', line);
    return;
  }

  try {
    const jsonStr = line.substring(5);
    const parsedData = JSON.parse(jsonStr);

    const swState = parsedData.switch;  // 0 or 1
    const dist = parsedData.dist;      // 거리 (cm)

    // 대시보드 화면 갱신
    monitor.updateData({ dist, swState });

    // 3단계: 알람 작동 중일 경우 미션 검증 엔진으로 전달
    if (state.isAlarmTriggered) {
      overlay.updateRealtimeData({ dist, swState });
    }
  } catch (err) {
    console.warn('JSON 파싱 오류: ', err, ' 원본 데이터: ', line);
  }
}

// 3. 매 초 알람 감시 타이머 루프 (2단계: 활성화)
setInterval(() => {
  if (!state.alarmConfig || state.isAlarmTriggered || state.alarmFiredToday) return;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // 설정 시/분이 일치할 경우 알람 구동
  if (currentHour === state.alarmConfig.hour && currentMinute === state.alarmConfig.minute) {
    handleAlarmOn();
  }
}, 1000);

// 매 분 변경 시 중복 작동 방지 해제 (2단계: 활성화)
setInterval(() => {
  if (state.alarmConfig && state.alarmFiredToday) {
    const now = new Date();
    if (now.getHours() !== state.alarmConfig.hour || now.getMinutes() !== state.alarmConfig.minute) {
      state.alarmFiredToday = false; 
    }
  }
}, 30000);

// 딜레이 헬퍼 함수 (시리얼 전송 락 경합 방지용)
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// 4. 알람 시작 제어 (Alarm On) (2단계: 활성화)
async function handleAlarmOn() {
  state.isAlarmTriggered = true;
  state.alarmFiredToday = true;

  console.log('🔔 알람 발동!');

  // 아두이노로 피에조 부저 1000Hz 발생 & DC 모터 작동 명령 전송
  if (state.isConnected) {
    // 100ms 딜레이를 주어 Web Serial Stream 락 경합 및 수신 버퍼 뭉개짐 방지
    await serial.write('BUZZER:1000');
    await delay(100);
    
    // 소프트웨어 소프트 스타트(Soft Start) 기법 적용
    // 모터의 최대 구동 세기를 130으로 낮추고, 3단계로 서서히 인가하여 기동 과전류(Inrush Current)로 인한 USB 리셋 현상을 억제합니다.
    await serial.write('MOTOR:60');
    await delay(150);
    await serial.write('MOTOR:100');
    await delay(150);
    await serial.write('MOTOR:130');
  } else {
    console.warn('장치가 연결되지 않은 상태에서 알람이 예약 작동되었습니다.');
  }

  // 전체 화면 사이렌 오버레이 팝업 기동
  overlay.trigger(state.alarmConfig.mission, state.alarmConfig.threshold);
}

// 5. 알람 해제 제어 (Alarm Off - 미션 성공 시) (2단계: 활성화)
async function handleAlarmOff() {
  state.isAlarmTriggered = false;
  state.alarmFiredToday = false; // 즉시 중복 감지 방지 플래그 초기화
  console.log('🔕 알람 해제 성공!');

  // 아두이노에 피에조 부저 OFF & DC 모터 정지 명령 송신
  if (state.isConnected) {
    // 100ms 딜레이를 주어 Web Serial Stream 락 경합 및 수신 버퍼 뭉개짐 방지
    await serial.write('BUZZER:0');
    await delay(100);
    await serial.write('MOTOR:0');
  }

  // 스케줄러 상태 초기화 (해제 성공 후 알람 예약을 자동 취소 처리)
  scheduler.cancelAlarm();
}

// 6. 비상 강제 해제 제어 (2단계: 활성화)
function handleAlarmOffForce() {
  state.isAlarmTriggered = false;
  state.alarmFiredToday = false; // 즉시 중복 감지 방지 플래그 초기화
  console.warn('🚨 연결 해제로 인해 안전 모드(강제 해제)가 발동되었습니다.');
  
  // 아두이노가 혹시라도 살아있을 때 연결이 유실된 것이므로 오버레이만 조용히 닫음
  overlay.overlayEl.style.display = 'none';
  scheduler.cancelAlarm();
}

// [2단계 UI 테스트 지원용] 개발자 도구 콘솔에서 알람 오버레이 레이아웃을 테스트해볼 수 있도록 전역 헬퍼 제공
window.triggerTestAlarm = function(missionType = 'switch', threshold = 50) {
  console.log(`[2단계 UI 테스트] ${missionType} 미션으로 알람 오버레이를 기동합니다.`);
  state.isAlarmTriggered = true;
  overlay.trigger(missionType, threshold);
};

window.dismissTestAlarm = function() {
  console.log('[2단계 UI 테스트] 알람 오버레이를 닫습니다.');
  state.isAlarmTriggered = false;
  overlay.overlayEl.style.display = 'none';
};

