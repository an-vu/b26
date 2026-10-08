import { Injectable, signal } from '@angular/core';

/** Device preference: changing performance settings must not restyle visitors' boards. */
@Injectable({ providedIn: 'root' })
export class ChromeBlurService {
  private readonly key = 'b26_chrome_blur';
  readonly enabled = signal(this.read());

  constructor() { this.apply(); }

  setEnabled(enabled: boolean) {
    this.enabled.set(enabled);
    this.apply();
    try { localStorage.setItem(this.key, String(enabled)); } catch { /* Storage may be unavailable. */ }
  }

  private read() {
    try { return localStorage.getItem(this.key) !== 'false'; } catch { return true; }
  }

  private apply() {
    document.documentElement.toggleAttribute('data-chrome-blur-off', !this.enabled());
  }
}
