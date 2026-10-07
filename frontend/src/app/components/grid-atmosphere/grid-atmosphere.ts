import { PageActivityService } from '../../services/page-activity.service';
import { Subscription } from 'rxjs';
import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, OnChanges, ViewChild, inject } from '@angular/core';

type Point = { x: number; y: number };
type Trail = { points: Point[]; head: number; speed: number; length: number; phase: number; tint: string; fading?: number };

@Component({
  selector: 'app-grid-atmosphere', standalone: true,
  template: '<canvas #canvas aria-hidden="true"></canvas>',
  styles: [':host { display:block; position:absolute; inset:0; overflow:hidden; } canvas { display:block; width:100%; height:100%; }'],
})
export class GridAtmosphereComponent implements AfterViewInit, OnDestroy, OnChanges {
  @Input() intensity: 'light' | 'medium' | 'heavy' = 'light';
  @Input() darkInk = false;
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;
  private zone = inject(NgZone);
  private observer?: ResizeObserver;
  private activity = inject(PageActivityService);
  private visibility?: Subscription;
  private initialized = false;
  private elapsed = 0;
  private frame = 0;
  private previous = 0;
  private staticFrame = '';
  private trails: Trail[] = [];
  private seed = 78341;
  private lattice?: Path2D;
  private gridLayer?: HTMLCanvasElement;
  private gridSignature = '';
  private cells: { path: Path2D; born: number; duration: number; tint: string }[] = [];
  // A mild, symmetric cylindrical view, shared by grid, cells, and moving paths.
  private project(p: Point): Point {
    const u = (p.x - 800) / 800;
    return { x: 800 + 800 * Math.sin(u * .35) / Math.sin(.35), y: 500 + (p.y - 500) * (1 + .045 * u * u) };
  }
  private gridPath(x: number, y: number, width: number, height: number) {
    const path = new Path2D();
    const corners = [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }, { x, y }];
    const start = this.project(corners[0]); path.moveTo(start.x, start.y);
    for (let i = 1; i < corners.length; i++) {
      const a = corners[i - 1], b = corners[i];
      const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 24));
      for (let j = 1; j <= steps; j++) { const p = this.project({ x: a.x + (b.x - a.x) * j / steps, y: a.y + (b.y - a.y) * j / steps }); path.lineTo(p.x, p.y); }
    }
    return path;
  }
  private motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  private resize = () => {
    if (!this.activity.visible) return;
    const canvas = this.canvas.nativeElement, bounds = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    const width = Math.round(bounds.width * ratio), height = Math.round(bounds.height * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width; canvas.height = height; this.invalidate();
    }
  };
  private random() { this.seed ^= this.seed << 13; this.seed ^= this.seed >>> 17; this.seed ^= this.seed << 5; return (this.seed >>> 0) / 4294967296; }
  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      if (typeof ResizeObserver !== 'undefined') { this.observer = new ResizeObserver(this.resize); this.observer.observe(this.canvas.nativeElement); }
      else window.addEventListener('resize', this.resize);
      this.initialized = true;
      this.motion?.addEventListener('change', this.invalidate);
      this.resize();
      this.visibility = this.activity.visible$.subscribe(visible => {
        if (visible) { this.resize(); this.wake(); } else this.stop();
      });
    });
  }
  ngOnChanges() { this.invalidate(); }
  private stop() { cancelAnimationFrame(this.frame); this.frame = 0; this.previous = 0; }
  private wake() {
    if (!this.initialized || !this.activity.visible || this.frame) return;
    this.zone.runOutsideAngular(() => { this.frame = requestAnimationFrame(this.draw); });
  }
  private invalidate = () => { this.staticFrame = ''; this.wake(); };
  ngOnDestroy() {
    this.initialized = false; this.stop(); this.visibility?.unsubscribe();
    this.observer?.disconnect(); window.removeEventListener('resize', this.resize);
    this.motion?.removeEventListener('change', this.invalidate);
  }
  private spawn(): Trail {
    const nodes: Point[] = [{ x: (2 + Math.floor(this.random() * 28)) * 48, y: (2 + Math.floor(this.random() * 15)) * 48 }];
    let direction = Math.floor(this.random() * 4);
    for (let n = 0; n < 6; n++) {
      const previous = nodes[n], length = (2 + Math.floor(this.random() * 4)) * 48;
      let dx = [1, 0, -1, 0][direction], dy = [0, 1, 0, -1][direction];
      if (previous.x + dx * length < 0 || previous.x + dx * length > 1584 || previous.y + dy * length < 0 || previous.y + dy * length > 1008) { direction = (direction + 2) % 4; dx *= -1; dy *= -1; }
      nodes.push({ x: previous.x + dx * length, y: previous.y + dy * length });
      direction = (direction + (this.random() > .5 ? 1 : 3)) % 4;
    }
    const points: Point[] = [nodes[0]];
    const line = (end: Point) => {
      const start = points[points.length - 1], count = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / 4));
      for (let j = 1; j <= count; j++) points.push({ x: start.x + (end.x - start.x) * j / count, y: start.y + (end.y - start.y) * j / count });
    };
    for (let n = 1; n < nodes.length - 1; n++) {
      const a = nodes[n - 1], b = nodes[n], c = nodes[n + 1];
      const enter = { x: b.x - Math.sign(b.x - a.x) * 10, y: b.y - Math.sign(b.y - a.y) * 10 };
      const leave = { x: b.x + Math.sign(c.x - b.x) * 10, y: b.y + Math.sign(c.y - b.y) * 10 };
      line(enter);
      for (let j = 1; j <= 6; j++) { const t = j / 6, u = 1 - t; points.push({ x: u*u*enter.x + 2*u*t*b.x + t*t*leave.x, y: u*u*enter.y + 2*u*t*b.y + t*t*leave.y }); }
    }
    line(nodes[nodes.length - 1]);
    return { points: points.map(p => this.project(p)), phase: this.random() * Math.PI * 2, head: 0, speed: .6 + this.random() * .65, length: this.random(), tint: ['216,235,255', '237,220,255', '255,231,207', '242,247,255'][Math.floor(this.random() * 4)] };
  }
  private draw = (timestamp: number) => {
    this.frame = 0;
    if (!this.initialized || !this.activity.visible) return;
    const canvas = this.canvas.nativeElement, ctx = canvas.getContext('2d');
    if (!ctx) return;
    const signature = `${canvas.width}:${canvas.height}:${this.intensity}:${this.darkInk}`;
    if (this.motion?.matches && this.staticFrame === signature) return;
    this.staticFrame = this.motion?.matches ? signature : '';
    const level = this.intensity === 'heavy' ? 2 : this.intensity === 'medium' ? 1 : 0;
    const count = [7, 12, 17][level];
    const tailLength = (trail: Trail) => Math.round(9 + trail.length * [15, 25, 37][level]);
    const dt = this.previous ? Math.min((timestamp - this.previous) / 1000, .04) : 0;
    this.previous = timestamp;
    // Animation time excludes the hidden interval, preserving collisions and cell fades.
    if (!this.motion?.matches) this.elapsed += dt * 1000;
    const now = this.elapsed;
    while (this.trails.length < count) { const trail = this.spawn(); trail.head = this.random() * trail.points.length * .5; this.trails.push(trail); }
    if (this.trails.length > count) this.trails.length = count;
    ctx.setTransform(canvas.width / 1600, 0, 0, canvas.height / 1000, 0, 0); ctx.clearRect(0, 0, 1600, 1000);
    ctx.strokeStyle = this.darkInk ? '#52678120' : '#d9e7ff20'; ctx.lineWidth = .65;
    if (!this.lattice) {
      this.lattice = new Path2D();
      for (let x = 0; x <= 1600; x += 48) this.lattice.addPath(this.gridPath(x, 0, 0, 1000));
      for (let y = 0; y <= 1000; y += 48) this.lattice.addPath(this.gridPath(0, y, 1600, 0));
    }
    const gridSignature = `${canvas.width}:${canvas.height}:${this.darkInk}`;
    if (this.gridSignature !== gridSignature) {
      this.gridLayer ??= document.createElement('canvas');
      this.gridLayer.width = canvas.width; this.gridLayer.height = canvas.height;
      const grid = this.gridLayer.getContext('2d');
      if (grid) {
        grid.setTransform(canvas.width / 1600, 0, 0, canvas.height / 1000, 0, 0);
        grid.strokeStyle = ctx.strokeStyle; grid.lineWidth = .65; grid.stroke(this.lattice);
      }
      this.gridSignature = gridSignature;
    }
    if (this.gridLayer) ctx.drawImage(this.gridLayer, 0, 0, 1600, 1000);
    if (!this.motion?.matches) {
      this.cells = this.cells.filter(cell => now - cell.born < cell.duration);
      while (this.cells.length < [7, 10, 13][level]) {
        this.cells.push({ path: this.gridPath(Math.floor(this.random() * 33) * 48, Math.floor(this.random() * 21) * 48, 48, 48), born: now + this.random() * 2200, duration: 2500 + this.random() * 3500, tint: ['207,225,255', '229,213,248', '248,225,203'][Math.floor(this.random() * 3)] });
      }
      for (const cell of this.cells) {
        const t = Math.max(0, (now - cell.born) / cell.duration);
        ctx.fillStyle = `rgba(${this.darkInk ? '90,110,140' : cell.tint},${Math.sin(t * Math.PI) ** 2 * .045})`;
        ctx.fill(cell.path);
      }
    }
    // A small spatial hash detects contact anywhere along the visible tails.
    const occupied = new Map<string, Trail>();
    for (const trail of this.trails) {
      if (!this.motion?.matches && trail.fading === undefined) trail.head += dt * [13, 15, 17][level] * trail.speed;
      if (trail.fading !== undefined || this.motion?.matches) continue;
      for (let j = Math.max(0, Math.floor(trail.head) - tailLength(trail)); j < Math.min(trail.points.length, trail.head); j++) {
        const p = trail.points[j], key = `${Math.round(p.x / 8)},${Math.round(p.y / 8)}`, other = occupied.get(key);
        if (other && other !== trail && other.fading === undefined) { trail.fading = now; other.fading = now; break; }
        occupied.set(key, trail);
      }
    }
    for (const trail of this.trails) {
      const age = trail.fading === undefined ? 0 : now - trail.fading;
      const opacity = Math.max(0, 1 - Math.max(0, age - 120) / 460);
      const end = Math.min(trail.points.length - 1, Math.floor(trail.head)), start = Math.max(0, Math.floor(trail.head) - tailLength(trail));
      ctx.lineCap = 'round';
      if (end <= start) continue;
      const a = trail.points[start], sample = trail.points[end], next = trail.points[Math.min(end + 1, trail.points.length - 1)];
      const fraction = Math.min(1, Math.max(0, trail.head - end));
      const b = { x: sample.x + (next.x - sample.x) * fraction, y: sample.y + (next.y - sample.y) * fraction };
      const twinkle = this.motion?.matches ? .8 : .7 + .2 * Math.sin(now / 730 + trail.phase) * Math.sin(now / 1130 + trail.phase);
      const contact = trail.fading === undefined ? 1 : 1 + .25 * Math.sin(age / 65) ** 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y);
      for (let j = start + 1; j <= end; j++) ctx.lineTo(trail.points[j].x, trail.points[j].y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = `rgba(${trail.tint},${opacity * .04})`; ctx.lineWidth = 5; ctx.stroke();
      const gradient = ctx.createLinearGradient(a.x, a.y, b.x === a.x && b.y === a.y ? b.x + 1 : b.x, b.y);
      gradient.addColorStop(0, `rgba(105,130,165,${opacity * .04})`);
      gradient.addColorStop(.7, `rgba(${trail.tint},${opacity * .16})`);
      gradient.addColorStop(1, this.darkInk ? `rgba(65,90,125,${opacity * twinkle * contact * .8})` : `rgba(255,255,255,${opacity * twinkle * contact})`);
      ctx.strokeStyle = gradient; ctx.lineWidth = 1.3; ctx.stroke();
      // The narrow leading stroke breathes in brightness; no separate round head.
    }
    if (!this.motion?.matches) this.trails = this.trails.filter(t => (t.fading === undefined || now - t.fading < 580) && t.head - tailLength(t) < t.points.length);
    if (!this.motion?.matches) this.wake();
    else this.previous = 0;
  };
}
