import { afterNextRender, DestroyRef, Directive, inject } from '@angular/core';

let nextGlassId = 0;
interface GlassRecord { id: string; dimensions: string; svg?: SVGSVGElement; }
const surfaces = '.bottom-actions, .utility-panel, .widget, .board-card, button.app-button, a.app-button';
/** Inline styles that can change a lens: corner radius variables on the theme roots. */
const styledRoots = '[data-theme], .home-stage';
/** Displacement maps depend only on geometry, so equal-sized surfaces share one texture. */
const textures = new Map<string, string>();
const TEXTURE_CACHE_LIMIT = 48;

const touchesSurface = (nodes: NodeList) => Array.prototype.some.call(nodes, (node: Node) =>
  node instanceof Element && !(node instanceof SVGElement) && (node.matches(surfaces) || !!node.querySelector(surfaces)));

/** One observer for Berry materials. Maps are cached by geometry; no animation loop.
 * CSS owns material selection, including the inverted material for buttons.
 */
@Directive({ selector: '[appBerryMaterials]', standalone: true })
export class BerryMaterialsDirective {
  private readonly destroy = inject(DestroyRef);
  private readonly records = new Map<HTMLElement, GlassRecord>();
  private resize?: ResizeObserver;
  private mutations?: MutationObserver;
  private frame = 0;
  constructor() {
    afterNextRender(() => {
      if (!/Chrome|Chromium|Edg\//.test(navigator.userAgent) || /CriOS|iPhone|iPad/.test(navigator.userAgent)) return;
      this.resize = new ResizeObserver(() => this.schedule());
      this.mutations = new MutationObserver(changes => {
        if (changes.some(change => this.relevant(change))) this.schedule();
      });
      this.mutations.observe(document.documentElement, { subtree: true, childList: true, attributes: true,
        attributeFilter: ['data-theme', 'data-color-mode', 'data-chrome-blur-off', 'class', 'style', 'open'] });
      this.schedule();
    });
    this.destroy.onDestroy(() => {
      this.mutations?.disconnect(); this.resize?.disconnect(); cancelAnimationFrame(this.frame);
      for (const [element, record] of this.records) { record.svg?.remove(); element.style.removeProperty('--berry-refraction'); }
    });
  }
  /** Ignore our own lens SVGs, particle/spring style writes and unrelated DOM churn. */
  private relevant(change: MutationRecord) {
    const target = change.target;
    if (!(target instanceof Element) || target instanceof SVGElement) return false;
    if (change.type === 'childList') return touchesSurface(change.addedNodes) || touchesSurface(change.removedNodes);
    switch (change.attributeName) {
      case 'style': return target.matches(styledRoots);
      case 'class': return target.matches(surfaces) || this.records.has(target as HTMLElement) || target.matches(styledRoots);
      default: return true;
    }
  }
  private schedule() {
    if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.sync(); });
  }
  private sync() {
    const reduced = window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
    const berry = !reduced && !!document.querySelector("[data-theme='berry']");
    // Read phase: every computed-style read happens before any write, so one style recalc serves the batch.
    const candidates = new Map<HTMLElement, { width: number; height: number; radius: string }>();
    if (berry) for (const element of Array.from(document.querySelectorAll<HTMLElement>(surfaces))) {
      if (element.closest('[data-theme]')?.getAttribute('data-theme') !== 'berry') continue;
      const style = getComputedStyle(element);
      if (style.getPropertyValue('--berry-refractive').trim() !== '1') continue;
      candidates.set(element, { width: Math.round(element.clientWidth), height: Math.round(element.clientHeight), radius: style.borderTopLeftRadius });
    }
    // Write phase.
    for (const [element, record] of this.records) if (!candidates.has(element)) {
      this.resize?.unobserve(element); record.svg?.remove(); element.style.removeProperty('--berry-refraction'); this.records.delete(element);
    }
    for (const [element, geometry] of candidates) {
      let record = this.records.get(element);
      if (!record) {
        record = { id: `berry-lens-${++nextGlassId}`, dimensions: '' };
        this.records.set(element, record); this.resize?.observe(element);
      }
      this.update(element, record, geometry);
    }
  }
  private update(element: HTMLElement, record: GlassRecord, { width, height, radius: borderRadius }: { width: number; height: number; radius: string }) {
    if (!width || !height) return;
    const key = `${width}:${height}:${borderRadius}`;
    if (key !== record.dimensions) {
      const map = texture(key, width, height, parseFloat(borderRadius) || 0);
      if (!map) return;
      record.svg ??= document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      record.svg.setAttribute('aria-hidden', 'true');
      record.svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
      const scale = Math.min(height, 80) * .32;
      record.svg.innerHTML = `<defs><filter id="${record.id}" x="-30%" y="-100%" width="160%" height="300%" color-interpolation-filters="sRGB">
        <feImage href="${map}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>
        <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale * 1.132}" xChannelSelector="R" yChannelSelector="G"/>
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
        <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale * 1.066}" xChannelSelector="R" yChannelSelector="G"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
        <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
        <feComposite in="red" in2="green" operator="arithmetic" k2="1" k3="1" result="rg"/>
        <feComposite in="rg" in2="blue" operator="arithmetic" k2="1" k3="1"/>
      </filter></defs>`;
      if (!record.svg.isConnected) element.append(record.svg);
      record.dimensions = key;
    }
    const value = `url("#${record.id}")`;
    if (element.style.getPropertyValue('--berry-refraction') !== value) element.style.setProperty('--berry-refraction', value);
  }
}

/** Render (or reuse) the capsule normal map for one geometry as a data URL. */
function texture(key: string, width: number, height: number, borderRadius: number) {
  const cached = textures.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  const ratio = Math.min(1, 768 / Math.max(width, height));
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const data = ctx.createImageData(canvas.width, canvas.height);
  const radius = Math.min(width / 2, height / 2, borderRadius);
  const band = Math.max(6, height * .24);
  // Signed distance to a capsule gives a continuous normal around its curved rim.
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const px = (x + .5) / ratio;
      const py = (y + .5) / ratio;
      const cx = Math.max(radius, Math.min(width - radius, px));
      const cy = Math.max(radius, Math.min(height - radius, py));
      const dx = px - cx, dy = py - cy;
      const distance = Math.hypot(dx, dy);
      const depth = radius - distance;
      const edge = Math.max(0, Math.min(1, 1 - depth / band));
      const bend = depth >= 0 ? Math.sin(edge * Math.PI / 2) ** 2 : 0;
      const i = (y * canvas.width + x) * 4;
      data.data[i] = Math.round(128 + (distance ? dx / distance : 0) * bend * 110);
      data.data[i + 1] = Math.round(128 + (distance ? dy / distance : 0) * bend * 110);
      data.data[i + 2] = 128;
      data.data[i + 3] = 255;
    }
  }
  ctx.putImageData(data, 0, 0);
  const url = canvas.toDataURL();
  if (textures.size >= TEXTURE_CACHE_LIMIT) textures.delete(textures.keys().next().value!);
  textures.set(key, url);
  return url;
}
