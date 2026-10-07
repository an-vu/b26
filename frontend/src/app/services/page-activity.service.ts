import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

/** Visibility, not keyboard focus: a visible side-by-side window should still animate. */
@Injectable({ providedIn: 'root' })
export class PageActivityService {
  private readonly state = new BehaviorSubject(!document.hidden);
  readonly visible$ = this.state.asObservable().pipe(distinctUntilChanged());
  get visible() { return this.state.value; }
  constructor() {
    const update = () => this.setVisible(!document.hidden);
    const hide = () => this.setVisible(false);
    inject(NgZone).runOutsideAngular(() => {
      document.addEventListener('visibilitychange', update);
      window.addEventListener('pagehide', hide);
      window.addEventListener('pageshow', update);
      update();
    });
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('pageshow', update);
      document.documentElement.removeAttribute('data-page-hidden');
      this.state.complete();
    });
  }
  private setVisible(visible: boolean) {
    document.documentElement.toggleAttribute('data-page-hidden', !visible);
    if (visible !== this.state.value) this.state.next(visible);
  }
}
