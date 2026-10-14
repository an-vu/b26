import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HeroWordmarkDirective } from './hero-wordmark';
import { vi } from 'vitest';

@Component({ standalone: true, imports: [HeroWordmarkDirective], template: `
  <main class="app-page" style="scroll-padding-top: 64px">
    <div class="app-page-content"><div class="intro-auth-slot"></div><section class="community-board"></section></div>
    <div class="home-settings-anchor"><div class="home-auth-row" style="visibility: hidden"><a class="home-auth-button intro-login">Log in</a><a class="home-auth-button home-join-button">Sign up</a></div></div>
    <div><button style="font-size: 17px" [appHeroWordmark]="true">BlueBerry</button></div>
  </main>` })
class Host {}

describe('Home intro transition', () => {
  it('renders the hero at full resolution and fades the community heading before the header', () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
    const fixture = TestBed.createComponent(Host);
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    const button = main.querySelector('button')!;
    const content = main.querySelector('.app-page-content')!;
    const board = main.querySelector('.community-board')!;
    vi.spyOn(window, 'getComputedStyle').mockImplementation(element => ({
      fontSize: '17px', scrollPaddingTop: '64px',
    }) as CSSStyleDeclaration);
    Object.defineProperty(button, 'offsetWidth', { get: () => parseFloat(button.style.fontSize || '17') * 100 / 17 });
    Object.defineProperty(content, 'clientWidth', { value: 960 });
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ top: 664 } as DOMRect);
    const join = main.querySelector<HTMLElement>('.home-auth-row')!;
    const slot = main.querySelector('.intro-auth-slot')!;
    vi.spyOn(slot, 'getBoundingClientRect').mockReturnValue({ top: 400, left: 500, width: 160, height: 44 } as DOMRect);
    vi.spyOn(join.parentElement!, 'getBoundingClientRect').mockReturnValue({ top: 800, left: 440, width: 160, height: 32 } as DOMRect);
    const cancel = vi.fn();
    const animation = () => ({ cancel }) as unknown as Animation;
    const rowEntrance = vi.fn(animation);
    Object.defineProperty(button, 'animate', { value: vi.fn(animation) });
    Object.defineProperty(join, 'animate', { value: rowEntrance });
    fixture.detectChanges();
    expect(join.style.visibility).toBe('hidden');
    frames.splice(0).forEach(frame => frame(0));
    // The first paint already has both final hero positions; no intermediate dock/header frame.
    expect(join.style.visibility).toBe('visible');
    expect(button.style.visibility).toBe('visible');
    expect(rowEntrance).toHaveBeenCalledOnce();
    expect(join.querySelectorAll('.home-auth-button')).toHaveLength(2);
    expect(join.style.transform).toBe('translate(60px, -394px)');
    expect(parseFloat(button.style.fontSize)).toBeCloseTo(163.2);
    expect(button.style.transform).toContain('scale(1)');
    main.scrollTop = 600;
    main.dispatchEvent(new Event('scroll'));
    for (let i = 0; frames.length && i < 10; i++) frames.shift()!(i * 16);
    expect(main.style.getPropertyValue('--community-heading-opacity')).toBe('0');
    expect(button.style.transform).toContain('scale(0.104');
    expect(main.scrollTop).toBe(600);
    expect(join.style.transform).toBe('translate(0px, 0px)');
    expect(cancel).toHaveBeenCalledTimes(2);
  });

  afterEach(() => { TestBed.resetTestingModule(); vi.restoreAllMocks(); });
  it('leaves scrolling native until hero geometry is ready', () => {
    const fixture = TestBed.createComponent(Host); fixture.detectChanges();
    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    const scroll = vi.fn();
    Object.defineProperty(main, 'scrollTo', { value: scroll, configurable: true });
    for (const deltaY of [1000, 1000, 500, 100, 20, -500, 1000]) {
      const event = new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true });
      main.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(scroll).not.toHaveBeenCalled();
  });
});
