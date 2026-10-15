import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, input } from '@angular/core';
import { PageActivityService } from '../../services/page-activity.service';
import { LAVA_FRAGMENT } from './lava-shader';
import { hexToRgb, LAVA_LOOKS, lavaColors, lavaScale, lavaWarp } from './lava-looks';

@Component({ selector: 'app-lava-atmosphere', standalone: true,
  template: '<canvas aria-hidden="true"></canvas>',
  host: { '[style.--lava-glow]': 'glow()' },
  styles: [':host { position:absolute; inset:0; opacity:.65; background:radial-gradient(ellipse at 30% 60%, var(--lava-glow), transparent 65%); transition: background .6s ease; } canvas { width:100%; height:100%; display:block; }'] })
export class LavaAtmosphereComponent {
  readonly intensity = input<'light' | 'medium' | 'heavy'>('light');
  readonly boardColor = input('#f9f8f6');
  protected readonly glow = computed(() => LAVA_LOOKS[this.intensity()].glow);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroy = inject(DestroyRef);
  private readonly activity = inject(PageActivityService);
  constructor() { afterNextRender(() => this.start()); }
  private start() {
    const canvas = this.host.querySelector('canvas')!;
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!; shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, 'precision mediump float; attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0.,1.);}');
    const fragment = compile(gl.FRAGMENT_SHADER, LAVA_FRAGMENT);
    const program = gl.createProgram()!;
    if (!vertex || !fragment) { shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); return; }
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); return; }
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(program, name);
    // Speed is folded into uTime (see draw), so switching levels never jumps the flow.
    for (const [name, value] of Object.entries({ uSpeed:1, uFrequency:1, uMouseInfluence:1, uParallax:.5, uNoise:.08, uBandWidth:6 })) gl.uniform1f(u(name), value);
    gl.uniform2f(u('uRot'), 0, 1); gl.uniform2f(u('uPointer'), 0, 0);
    gl.uniform1i(u('uTransparent'), 1); gl.uniform1i(u('uIterations'), 1);
    const timeUniform = u('uTime'), intensityUniform = u('uIntensity'), sizeUniform = u('uCanvas');
    const scaleUniform = u('uScale'), warpUniform = u('uWarpStrength'), countUniform = u('uColorCount'), colorsUniform = u('uColors');
    const colors = new Float32Array(24);
    let paletteKey = '';
    const applyLook = () => {
      const level = this.intensity(), look = LAVA_LOOKS[level];
      const key = level + this.boardColor();
      if (key !== paletteKey) {
        paletteKey = key;
        const palette = lavaColors(level, this.boardColor());
        colors.fill(0); palette.forEach((hex, i) => colors.set(hexToRgb(hex), i * 3));
        gl.uniform1i(countUniform, palette.length); gl.uniform3fv(colorsUniform, colors);
        gl.uniform1f(intensityUniform, look.brightness);
      }
      // Blob size and warp breathe on slow, unrelated cycles (roughly 30-70 s), scaled per level.
      gl.uniform1f(scaleUniform, lavaScale(look, clock));
      gl.uniform1f(warpUniform, lavaWarp(look, clock));
      return look;
    };
    let frame = 0, last = 0, clock = 0, flow = 0;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const draw = (now: number) => {
      frame = 0;
      if (!this.activity.visible || gl.isContextLost()) return;
      if (now - last >= 33 || motion.matches) {
        const step = last && !motion.matches ? Math.min(now - last, 100) / 1000 : 0;
        last = now;
        const look = applyLook();
        clock += step; flow += step * look.speed;
        gl.uniform1f(timeUniform, flow);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (!motion.matches) frame = requestAnimationFrame(draw);
    };
    const resume = () => { cancelAnimationFrame(frame); frame = 0; last = 0; if (this.activity.visible) frame = requestAnimationFrame(draw); };
    const resize = new ResizeObserver(() => {
      const { width, height } = this.host.getBoundingClientRect();
      const scale = Math.min(1, 1000 / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
      gl.viewport(0, 0, canvas.width, canvas.height); gl.uniform2f(sizeUniform, width, height); resume();
    });
    resize.observe(this.host);
    const subscription = this.activity.visible$.subscribe(resume);
    motion.addEventListener('change', resume);
    this.destroy.onDestroy(() => { cancelAnimationFrame(frame); subscription.unsubscribe(); resize.disconnect(); motion.removeEventListener('change', resume); gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); });
  }
}
