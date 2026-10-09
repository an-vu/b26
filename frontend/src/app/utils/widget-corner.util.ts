/** Keep the original three levels; add two progressively softer corners. */
export function widgetCornerRadius(step: number): number {
  return [6, 12, 24, 36, 48][step - 1] ?? 12;
}

/** Keep feed details close to square corners and clear of progressively rounder edges. */
export function widgetCornerInset(step: number): number {
  return [8, 10, 12, 16, 20][step - 1] ?? 10;
}
