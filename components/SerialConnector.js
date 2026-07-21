// Web Serial 연결 컴포넌트 (SerialConnector Component)
const style = document.createElement('style');
style.textContent = `
  .connector-card {
    display: flex;
    flex-direction: column;
  }
  .connector-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .status-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: var(--text-secondary);
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.2);
    transition: all 0.3s ease;
  }
  .status-dot.connected {
    background-color: var(--color-success);
    box-shadow: 0 0 10px var(--color-success);
  }
  .status-dot.disconnected {
    background-color: var(--text-secondary);
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.2);
  }
  .status-dot.error {
    background-color: var(--color-danger);
    box-shadow: 0 0 10px var(--color-danger);
  }
  .status-text {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary);
    transition: color 0.3s ease;
  }
  .status-text.connected {
    color: var(--text-primary);
  }
  .btn-connector {
    padding: 12px;
    font-size: 0.95rem;
  }
`;
document.head.appendChild(style);

export default class SerialConnector {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onConnect = options.onConnect || (() => {});
    this.onDisconnect = options.onDisconnect || (() => {});
    this.onData = options.onData || (() => {});
    this.onError = options.onError || (() => {});

    this.port = null;
    this.reader = null;
    this.readableStreamClosed = null;
    this.keepReading = false;
    this.isConnected = false;

    this.render();
    this.bindEvents();
    this.checkCompatibility();
    
    // 페이지 리로드 시 이전에 승인했던 포트가 있다면 자동 재연결 시도
    this.autoConnect();
  }

  render() {
    this.container.innerHTML = `
      <div class="glass-card connector-card" id="connector-card">
        <div class="connector-status-bar">
          <span class="title-medium" style="margin-bottom: 0;">🔌 아두이노 장치 연결</span>
          <div class="status-indicator">
            <div class="status-dot disconnected" id="status-dot"></div>
            <span class="status-text" id="status-text">연결 대기</span>
          </div>
        </div>
        <p class="text-desc" style="margin-bottom: 16px;">
          시리얼 포트를 통해 아두이노 범용 펌웨어와 실시간으로 센서 데이터를 송수신하고 명령을 전송합니다.
        </p>
        <button class="btn-neon btn-connector" id="btn-connect">연결 완료하기</button>
      </div>
    `;

    this.dotEl = this.container.querySelector('#status-dot');
    this.textEl = this.container.querySelector('#status-text');
    this.btnEl = this.container.querySelector('#btn-connect');
    this.cardEl = this.container.querySelector('#connector-card');
  }

  bindEvents() {
    this.btnEl.addEventListener('click', () => {
      if (this.isConnected) {
        this.disconnect();
      } else {
        this.connect();
      }
    });

    // 브라우저 포트 이탈 및 연결 해제 이벤트 감지
    if (navigator.serial) {
      navigator.serial.addEventListener('disconnect', (event) => {
        if (this.port === event.target) {
          this.handleDisconnectUI('포트 단선됨');
          this.onDisconnect();
        }
      });
    }
  }

  checkCompatibility() {
    if (!navigator.serial) {
      this.updateStatus('error', '브라우저 미지원');
      this.btnEl.disabled = true;
      this.btnEl.style.opacity = '0.5';
      this.btnEl.style.cursor = 'not-allowed';
      this.btnEl.textContent = 'Chrome/Edge 권장';
    }
  }

  async autoConnect() {
    if (!navigator.serial) return;
    try {
      const ports = await navigator.serial.getPorts();
      if (ports.length > 0) {
        console.log('[자동 재연결] 기존에 허가된 포트를 감지했습니다. 연결을 재시도합니다.');
        this.port = ports[0];
        await this.port.open({ baudRate: 115200 });
        this.writer = this.port.writable.getWriter();
        
        this.isConnected = true;
        this.updateStatus('connected', '연결 완료 (자동)');
        this.btnEl.textContent = '연결 해제하기';
        this.cardEl.classList.add('neon-border-purple');
        this.onConnect();

        this.keepReading = true;
        this.readLoop();
      }
    } catch (err) {
      console.warn('[자동 재연결 실패]:', err);
    }
  }

  async connect() {
    try {
      this.updateStatus('disconnected', '연결 시도 중...');
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });
      
      // 단일 writer를 생성하여 유지 (매 쓰기마다 getWriter/releaseLock 반복으로 인한 락 충돌 방지)
      this.writer = this.port.writable.getWriter();

      this.isConnected = true;
      this.updateStatus('connected', '연결 완료');
      this.btnEl.textContent = '연결 해제하기';
      this.cardEl.classList.add('neon-border-purple');
      this.onConnect();

      // 읽기 루프 기동
      this.keepReading = true;
      this.readLoop();
    } catch (err) {
      console.error(err);
      this.updateStatus('error', '연결 실패');
      this.onError('장치를 찾지 못했거나 연결이 거부되었습니다.');
    }
  }

  async readLoop() {
    const textDecoder = new TextDecoderStream();
    this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    this.reader = reader;

    let buffer = '';

    try {
      while (this.keepReading) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          buffer += value;
          // 라인 단위로 잘라서 데이터 처리
          let lastNewlineIndex = buffer.lastIndexOf('\n');
          if (lastNewlineIndex !== -1) {
            let lines = buffer.substring(0, lastNewlineIndex).split('\n');
            buffer = buffer.substring(lastNewlineIndex + 1);

            for (let line of lines) {
              line = line.trim();
              if (line.length > 0) {
                this.onData(line);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Read error:', err);
      this.handleDisconnectUI('통신 수신 에러');
      this.onDisconnect();
    } finally {
      reader.releaseLock();
    }
  }

  async disconnect() {
    this.keepReading = false;
    if (this.reader) {
      try {
        await this.reader.cancel();
        await this.readableStreamClosed.catch(() => {});
      } catch (err) {
        console.error(err);
      }
    }

    // 연결 종료 전에 아두이노 부저 및 모터를 강제로 끄고 스트림 정리 (안전 정지)
    if (this.writer) {
      try {
        const encoder = new TextEncoder();
        await this.writer.write(encoder.encode('BUZZER:0\n'));
        await new Promise(resolve => setTimeout(resolve, 50));
        await this.writer.write(encoder.encode('MOTOR:0\n'));
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (err) {
        console.error('Disconnect safety write error:', err);
      }

      try {
        this.writer.releaseLock();
        this.writer = null;
      } catch (err) {
        console.error(err);
      }
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (err) {
        console.error(err);
      }
    }

    this.handleDisconnectUI('연결 해제');
    this.onDisconnect();
  }

  handleDisconnectUI(statusText = '연결 해제') {
    this.isConnected = false;
    this.updateStatus('disconnected', statusText);
    this.btnEl.textContent = '연결 완료하기';
    this.cardEl.classList.remove('neon-border-purple');
    this.port = null;
    this.reader = null;
    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch (e) {}
      this.writer = null;
    }
  }

  updateStatus(state, text) {
    // state: connected, disconnected, error
    this.dotEl.className = `status-dot ${state}`;
    this.textEl.textContent = text;
    if (state === 'connected') {
      this.textEl.classList.add('connected');
    } else {
      this.textEl.classList.remove('connected');
    }
  }

  // 아두이노로 명령 송신 유틸리티 (단일 writer 재사용)
  async write(command) {
    if (!this.writer) {
      console.warn('포트가 열려있지 않아 명령을 보낼 수 없습니다.');
      return;
    }
    const encoder = new TextEncoder();
    try {
      await this.writer.write(encoder.encode(command + '\n'));
    } catch (err) {
      console.error('Write error:', err);
    }
  }
}
