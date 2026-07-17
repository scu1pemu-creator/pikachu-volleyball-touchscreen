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

    /** @type {boolean} */
    this.powerHitKeyIsDownPrevious = false;

    /** @type {Key} */
    this.leftKey = new Key(left);
    /** @type {Key} */
    this.rightKey = new Key(right);
    /** @type {Key} */
    this.upKey = new Key(up);
    /** @type {Key} */
    this.downKey = new Key(down);
    /** @type {Key} */
    this.powerHitKey = new Key(powerHit);
    /** @type {Key} */
    this.downRightKey = new Key(downRight);

    // 🌟 동적 조이스틱 컨트롤러 인스턴스
    this.dynamicJoystick = null;
  }

  getInput() {
    // 실시간 동적 조이스틱 방향 업데이트 반영
    if (this.dynamicJoystick && this.dynamicJoystick.active) {
      this.dynamicJoystick.updateKeys(this.leftKey, this.rightKey, this.upKey, this.downKey);
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
    if (this.downRightKey) this.downRightKey.subscribe();

    // 1P 플레이어(방향키가 알파벳 계열인 경우)에만 모바일 터치 패널 제어 기능 연결
    if (this.leftKey.value && typeof this.leftKey.value === 'string' && !this.leftKey.value.startsWith('Arrow')) {
      if (!this.dynamicJoystick) {
        this.dynamicJoystick = new DynamicJoystick();
      }
      this.dynamicJoystick.attach();
      this.bindActionButtons();
    }
  }

  unsubscribe() {
    this.leftKey.unsubscribe();
    this.rightKey.unsubscribe();
    this.upKey.unsubscribe();
    this.downKey.unsubscribe();
    this.powerHitKey.unsubscribe();
    if (this.downRightKey) this.downRightKey.unsubscribe();

    if (this.dynamicJoystick) {
      this.dynamicJoystick.detach();
    }
    this.unbindActionButtons();
  }

  bindActionButtons() {
    const jumpBtn = document.getElementById('btn-jump');
    const attackBtn = document.getElementById('btn-attack');

    if (jumpBtn) {
      this._jumpStart = (e) => { e.preventDefault(); this.upKey.isDown = true; this.upKey.isUp = false; };
      this._jumpEnd = (e) => { e.preventDefault(); this.upKey.isDown = false; this.upKey.isUp = true; };
      jumpBtn.addEventListener('touchstart', this._jumpStart, { passive: false });
      jumpBtn.addEventListener('touchend', this._jumpEnd);
      jumpBtn.addEventListener('touchcancel', this._jumpEnd);
    }

    if (attackBtn) {
      this._attackStart = (e) => { e.preventDefault(); this.powerHitKey.isDown = true; this.powerHitKey.isUp = false; };
      this._attackEnd = (e) => { e.preventDefault(); this.powerHitKey.isDown = false; this.powerHitKey.isUp = true; };
      attackBtn.addEventListener('touchstart', this._attackStart, { passive: false });
      attackBtn.addEventListener('touchend', this._attackEnd);
      attackBtn.addEventListener('touchcancel', this._attackEnd);
    }
  }

  unbindActionButtons() {
    const jumpBtn = document.getElementById('btn-jump');
    const attackBtn = document.getElementById('btn-attack');

    if (jumpBtn && this._jumpStart) {
      jumpBtn.removeEventListener('touchstart', this._jumpStart);
      jumpBtn.removeEventListener('touchend', this._jumpEnd);
      jumpBtn.removeEventListener('touchcancel', this._jumpEnd);
    }
    if (attackBtn && this._attackStart) {
      attackBtn.removeEventListener('touchstart', this._attackStart);
      attackBtn.removeEventListener('touchend', this._attackEnd);
      attackBtn.removeEventListener('touchcancel', this._attackEnd);
    }
  }
}

/**
 * 🌟 [브롤스타즈 스타일] 동적 터치 무브 컨트롤러 클래스
 */
class DynamicJoystick {
  constructor() {
    this.active = false;
    this.touchId = null;

    this.startX = 0; // 터치가 시작되어 베이스가 생성될 기준점 X
    this.startY = 0; // 터치가 시작되어 베이스가 생성될 기준점 Y

    this.maxRadius = 50; // 조이스틱 노브 최대 이동 거리 (px)

    this.dirX = 0; // -1: 좌, 0: 대기, 1: 우
    this.dirY = 0; // -1: 상, 0: 대기, 1: 하

    // DOM 동적 생성
    this.base = document.getElementById('dynamic-joystick-base');
    this.knob = document.getElementById('dynamic-joystick-knob');

    this.onStart = this.handleStart.bind(this);
    this.onMove = this.handleMove.bind(this);
    this.onEnd = this.handleEnd.bind(this);
  }

  attach() {
    // 윈도우 전체에서 발생하는 터치를 감지하지만, '화면 왼쪽 영역'에서 터치가 시작될 때만 반응하도록 설계
    window.addEventListener('touchstart', this.onStart, { passive: false });
    window.addEventListener('touchmove', this.onMove, { passive: false });
    window.addEventListener('touchend', this.onEnd, { passive: false });
    window.addEventListener('touchcancel', this.onEnd, { passive: false });
  }

  detach() {
    window.removeEventListener('touchstart', this.onStart);
    window.removeEventListener('touchmove', this.onMove);
    window.removeEventListener('touchend', this.onEnd);
    window.removeEventListener('touchcancel', this.onEnd);
    this.reset();
  }

  handleStart(e) {
    if (this.active) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      
      // 🌟 화면 중앙선(window.innerWidth / 2)을 기준으로 '왼쪽 영역'에서 일어난 터치만 무브 컨트롤러로 간주
      if (touch.clientX < window.innerWidth / 2) {
        e.preventDefault();
        this.touchId = touch.identifier;
        this.active = true;

        this.startX = touch.clientX;
        this.startY = touch.clientY;

        // 조이스틱 엘리먼트를 손가락이 닿은 정확한 지점으로 표시
        if (this.base && this.knob) {
          this.base.style.left = `${this.startX}px`;
          this.base.style.top = `${this.startY}px`;
          this.base.style.display = 'block';
          this.knob.style.transform = 'translate(-50%, -50%) translate(0px, 0px)';
        }
        break;
      }
    }
  }

  handleMove(e) {
    if (!this.active) return;

    let touch = null;
    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === this.touchId) {
        touch = e.touches[i];
        break;
      }
    }
    if (!touch) return;
    e.preventDefault();

    const deltaX = touch.clientX - this.startX;
    const deltaY = touch.clientY - this.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    const angle = Math.atan2(deltaY, deltaX);
    const cappedDistance = Math.min(distance, this.maxRadius);
    
    // 스와이프한 만큼 노브 이미지 움직임 처리
    const moveX = Math.cos(angle) * cappedDistance;
    const moveY = Math.sin(angle) * cappedDistance;

    if (this.knob) {
      this.knob.style.transform = `translate(-50%, -50%) translate(${moveX}px, ${moveY}px)`;
    }

    // 터치 입력 감지 기준 (데드존)
    const deadZone = 10;
    if (distance > deadZone) {
      const nx = deltaX / distance;
      const ny = deltaY / distance;

      // X축 방향 설정 (-1, 0, 1)
      if (nx < -0.38) {
        this.dirX = -1;
      } else if (nx > 0.38) {
        this.dirX = 1;
      } else {
        this.dirX = 0;
      }

      // Y축 방향 설정 (-1, 0, 1)
      if (ny < -0.38) {
        this.dirY = -1;
      } else if (ny > 0.38) {
        this.dirY = 1;
      } else {
        this.dirY = 0;
      }
    } else {
      this.dirX = 0;
      this.dirY = 0;
    }
  }

  handleEnd(e) {
    if (!this.active) return;

    let touchEnded = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.touchId) {
        touchEnded = true;
        break;
      }
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
    if (this.base) {
      this.base.style.display = 'none';
    }
  }

  updateKeys(leftKey, rightKey, upKey, downKey) {
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

    const touchEl = this.getTouchElement();
    if (touchEl && (this.value === 'ArrowUp' || this.value === 'Enter')) {
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