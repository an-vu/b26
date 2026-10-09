import { afterEach, expect, it, vi } from 'vitest';
import { PanelCloseAnimation } from './panel-close-animation';

afterEach(() => vi.unstubAllGlobals());

function animatedDialog(reduced = false) {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  const dialog = document.createElement('dialog'); dialog.open = true;
  let finish!: () => void;
  const animation = { finished: new Promise<void>(resolve => { finish = resolve; }), cancel: vi.fn() };
  dialog.animate = vi.fn(() => animation as unknown as Animation);
  return { dialog, animation, finish };
}

it('keeps a dialog visible until exit finishes and ignores duplicate closes', async () => {
  const { dialog, finish } = animatedDialog();
  const exit = new PanelCloseAnimation();
  const complete = vi.fn(() => { dialog.open = false; });
  exit.close(dialog, complete); exit.close(dialog, complete);
  expect(dialog.open).toBe(true); expect(dialog.animate).toHaveBeenCalledOnce();
  finish(); await Promise.resolve();
  expect(complete).toHaveBeenCalledOnce(); expect(dialog.open).toBe(false);
});

it('cancels a pending exit so reopening cannot be closed by its old callback', async () => {
  const { dialog, animation, finish } = animatedDialog();
  const exit = new PanelCloseAnimation(); const complete = vi.fn();
  exit.close(dialog, complete); exit.cancel(dialog);
  finish(); await Promise.resolve();
  expect(animation.cancel).toHaveBeenCalledOnce(); expect(complete).not.toHaveBeenCalled();
  expect(dialog.open).toBe(true); expect(exit.closing).toBe(false);
});

it('closes immediately when reduced motion is requested', () => {
  const { dialog } = animatedDialog(true);
  const complete = vi.fn(); new PanelCloseAnimation().close(dialog, complete);
  expect(complete).toHaveBeenCalledOnce(); expect(dialog.animate).not.toHaveBeenCalled();
});
