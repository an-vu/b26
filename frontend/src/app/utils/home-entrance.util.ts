/** Shared Home entrance: 44px travel, stiffness 135, damping 15.2, mass 1.
 * Individual translate leaves each element's layout/hover/scroll transform intact. */
export function animateHomeEntrance(element: Element, delay = 150): Animation {
  const frequency = Math.sqrt(135 - 7.6 ** 2);
  const frames = Array.from({ length: 61 }, (_, index) => {
    const time = index / 60;
    const displacement = Math.exp(-7.6 * time) * (Math.cos(frequency * time) + 7.6 / frequency * Math.sin(frequency * time));
    return { translate: `0 ${index === 60 ? 0 : 44 * displacement}px`, opacity: Math.min(1, Math.max(0, 1 - displacement)) };
  });
  return element.animate(frames, { duration: 1000, delay, fill: 'backwards', easing: 'linear' });
}
