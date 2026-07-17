/**
 * This module takes charge of the user input via keyboard
 */
'use strict';
import { PikaUserInput } from './physics.js';

/**
 * Class representing a keyboard used to control a player
 */
export class PikaKeyboard extends PikaUserInput {
  constructor(left, right, up, down, powerHit, downRight = null) {
    super();

    this.powerHitKeyIsDownPrevious = false;

    this.leftKey = new Key(left);
    this.rightKey = new Key(right);
    this.upKey = new Key(up);
    this.downKey = new Key(down);
    this.powerHitKey = new Key(powerHit);
    this.downRightKey = new Key(downRight);

    // 🌟 [추가] 조이스틱 인스턴스 초기화
    this.joystick = null;
  }

  getInput() {
    // 🌟 조이스틱 입력 상태 반영
    if (this.joystick) {
      this.joystick.updateKeys(this.leftKey, this.rightKey, this.upKey, this.downKey);
    }

    if (this.leftKey.isDown) {
      this.xDirection = -1;
    } else if (
      this.rightKey.isDown ||
      (this.downRightKey && this.downRightKey.isDown)
    ) {
      this.xDirection = 1;
    } else {
      this.xDirection = 0;
    }

    // 위/아래 방향 판단
    if (this.upKey.isDown) {
      this.yDirection = -1;
    } else if (
      this.downKey.isDown ||
      (this.downRightKey && this.downRightKey.isDown)
    ) {
      this.yDirection = 1;
    } else {
      this.yDirection = 0;
    }

    const isDown = this.powerHitKey.isDown;
    if (!this.powerHitKeyIsDownPrevious && isDown) {
      this.powerHit = 1;
    } else {
      this.powerHit = 0;
    }
    this.powerHitKeyIsDownPrevious = isDown;
  }

  subscribe() {
    this.leftKey.subscribe();
    this.rightKey.subscribe();
    this.upKey.subscribe();
    this.downKey.subscribe();
    this.powerHitKey.subscribe();
    this.downRightKey.subscribe();

    // 🌟 [추가] 조이스틱 이벤트 활성화
    if (!this.joystick) {
      this.joystick = new JoystickController('joystick-zone', 'joystick-base', 'joystick-knob');
    }
    this.joystick.attach();
  }

  unsubscribe() {
    this.leftKey.unsubscribe();
    this.rightKey.unsubscribe();
    this.upKey.unsubscribe();
    this.downKey.unsubscribe();
    this.powerHitKey.unsubscribe();
    this.downRightKey.unsubscribe();

    // 🌟 [추가] 조이스틱 이벤트 제거
    if (this.joystick) {
      this.joystick.detach();
    }
  }
}

/**
 * 🌟 [추가] 브롤스타즈 스타일 가상 조이스틱 컨트롤러 클래스
 */
class JoystickController {
  constructor(zoneId, baseId, knobId) {
    this.zone = document.getElementById(zoneId);
    this.base = document.getElementById(baseId);
    this.knob = document.getElementById(knobId);

    this.active = false;
    this.touchId = null;
    this.startX = 0;
    this.startY = 0;

    // 조이스틱 최대 이동 반경 (px)
    this.maxRadius = 40;

    // 현재 조이스틱의 방향 상태
    this.dirX = 0; // -1 (좌), 0 (정지), 1 (우)
    this.dirY = 0; // -1 (상), 0 (정지), 1 (하)

    // 이벤트 바인딩 유지용
    this.onStart = this.handleStart.bind(this);
    this.onMove = this.handleMove.bind(this);
    this.onEnd = this.handleEnd.bind(this);
  }

  attach() {
    if (!this.zone) return;
    this.zone.addEventListener('touchstart', this.onStart, { passive: false });
    window.addEventListener('touchmove', this.onMove, { passive: false });
    window.addEventListener('touchend', this.onEnd);
    window.addEventListener('touchcancel', this.onEnd);
  }

  detach() {
    if (!this.zone) return;
    this.zone.removeEventListener('touchstart', this.onStart);
    window.removeEventListener('touchmove', this.onMove);
    window.removeEventListener('touchend', this.onEnd);
    window.removeEventListener('touchcancel', this.onEnd);
    this.reset();
  }

  handleStart(e) {
    e.preventDefault();
    if (this.active) return;

    const touch = e.changedTouches[0];
    this.touchId = touch.identifier;
    this.active = true;

    // 터치 시작 지점 기준으로 가상 중심 계산
    const rect = this.base.getBoundingClientRect();
    this.startX = rect.left + rect.width / 2;
    this.startY = rect.top + rect.height / 2;
  }

  handleMove(e) {
    if (!this.active) return;

    // 현재 사용 중인 터치 포인트 탐색
    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchId) {
        touch = e.touches[i];
        break;
      }
    }
    if (!touch) return;
    e.preventDefault();

    // 시작 지점(중심)으로부터 현재 터치 좌표 간의 거리 계산
    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 각도 계산 (라디안)
    const angle = Math.atan2(deltaY, deltaX);

    // 최대 반경 제한을 적용한 실제 이동 거리
    const cappedDistance = Math.min(distance, this.maxRadius);
    const moveX = Math.cos(angle) * cappedDistance;
    const moveY = Math.sin(angle) * cappedDistance;

    // 손잡이(Knob) UI 이동시키기
    this.knob.style.transform = `translate(${moveX}px, ${moveY}px)`;

    // 8방향 매핑용 알고리즘 (일정 수치 이상 밀었을 때 작동)
    const deadZone = 12; // 미세 오작동을 방지하는 영역
    if (distance > deadZone) {
      // 대각선 입력을 보장하기 위해 각도 영역을 넓게 분할합니다.
      // -0.38 ~ 0.38 라디안 범위는 온전히 '우측'으로 봅니다.
      this.dirX = Math.cos(angle) > 0.38 ? 1 : (Math.cos(angle) < -0.38 ? -1 : 0);
      this.dirY = Math.sin(angle) > 0.38 ? 1 : (Math.sin(angle) < -0.38 ? -1 : 0);
    } else {
      this.dirX = 0;
      this.dirY = 0;
    }
  }

  handleEnd(e) {
    if (!this.active) return;

    // 터치가 끝났는지 체크
    let touchEnded = false;
    if (e.changedTouches) {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.touchId) {
          touchEnded = true;
          break;
        }
      }
    } else {
      touchEnded = true;
    }

    if (touchEnded) {
      this.reset();
    }
  }

  reset() {
    this.active = false;
    this.touchId = null;
    this.dirX = 0;
    this.dirY = 0;
    if (this.knob) {
      this.knob.style.transform = 'translate(0px, 0px)';
    }
  }

  /**
   * 조이스틱 방향 데이터를 피카츄 배구의 물리 키 인스턴스에 주입합니다.
   */
  updateKeys(leftKey, rightKey, upKey, downKey) {
    if (!this.active) return; // 활성화되지 않았을 때는 키보드 값을 덮어쓰지 않음

    leftKey.isDown = (this.dirX === -1);
    leftKey.isUp = !leftKey.isDown;

    rightKey.isDown = (this.dirX === 1);
    rightKey.isUp = !rightKey.isDown;

    upKey.isDown = (this.dirY === -1);
    upKey.isUp = !upKey.isDown;

    downKey.isDown = (this.dirY === 1);
    downKey.isUp = !downKey.isDown;
  }
}

/**
 * Class representing a key on a keyboard
 */
class Key {
  constructor(value) {
    this.value = value;
    this.isDown = false;
    this.isUp = true;

    this.downListener = this.downHandler.bind(this);
    this.upListener = this.upHandler.bind(this);
    this.subscribe();
  }

  downHandler(event) {
    if (event.code === this.value) {
      this.isDown = true;
      this.isUp = false;
      event.preventDefault();
    }
  }

  upHandler(event) {
    if (event.code === this.value) {
      this.isDown = false;
      this.isUp = true;
      event.preventDefault();
    }
  }

  getTouchElement() {
    return document.getElementById(this.value);
  }

  subscribe() {
    window.addEventListener('keyup', this.upListener);
    window.addEventListener('keydown', this.downListener);

    // 🌟 우측 'Enter'와 'ArrowUp' 버튼용 ♡별 터치 이벤트는 유지합니다.
    const touchEl = this.getTouchElement();
    if (touchEl) {
      this.touchStartListener = (e) => {
        e.preventDefault();
        this.isDown = true;
        this.isUp = false;
      };
      this.touchEndListener = (e) => {
        e.preventDefault();
        this.isDown = false;
        this.isUp = true;
      };

      touchEl.addEventListener('touchstart', this.touchStartListener);
      touchEl.addEventListener('touchend', this.touchEndListener);
    }
  }

  unsubscribe() {
    window.removeEventListener('keydown', this.downListener);
    window.removeEventListener('keyup', this.upListener);

    const touchEl = this.getTouchElement();
    if (touchEl) {
      if (this.touchStartListener) touchEl.removeEventListener('touchstart', this.touchStartListener);
      if (this.touchEndListener) touchEl.removeEventListener('touchend', this.touchEndListener);
    }

    this.isDown = false;
    this.isUp = true;
  }
}