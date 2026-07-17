attach() {
    if (!this.zone) return;
    // 🌟 { passive: false } 옵션을 명시적으로 부착하여 브라우저의 기본 스크롤/스와이프 행동을 완벽히 정지시킵니다.
    this.zone.addEventListener('touchstart', this.onStart, { passive: false });
    window.addEventListener('touchmove', this.onMove, { passive: false });
    window.addEventListener('touchend', this.onEnd, { passive: false });
    window.addEventListener('touchcancel', this.onEnd, { passive: false });
  }

  detach() {
    if (!this.zone) return;
    this.zone.removeEventListener('touchstart', this.onStart);
    window.removeEventListener('touchmove', this.onMove);
    window.removeEventListener('touchend', this.onEnd);
    window.removeEventListener('touchcancel', this.onEnd);
    this.reset();
  }