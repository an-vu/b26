import { afterNextRender, Component, DestroyRef, ElementRef, inject, input, NgZone } from '@angular/core';
import { PageActivityService } from '../../services/page-activity.service';
import { LAVA_FRAGMENT } from './lava-shader';

@Component({ selector: 'app-lava-atmosphere', standalone: true,
  template: '<canvas aria-hidden="true"></canvas>',
  styles: [':host { position:absolute; inset:0; opacity:.65; background:radial-gradient(ellipse at 30% 60%, #e8898b55, transparent 65%); } canvas { width:100%; height:100%; display:block; }'] })
export class LavaAtmosphereComponent {
  readonly intensity = input<'light' | 'medium' | 'heavy'>('light');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly destroy = inject(DestroyRef);
  private readonly activity = inject(PageActivityService);
  private readonly zone = inject(NgZone);
  constructor() { afterNextRender(() => this.zone.runOutsideAngular(() => this.start())); }
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
    for (const [name, value] of Object.entries({ uSpeed:.2, uScale:1, uFrequency:1, uWarpStrength:1, uMouseInfluence:1, uParallax:.5, uNoise:.08, uIntensity:1.5, uBandWidth:6 })) gl.uniform1f(u(name), value);
    gl.uniform2f(u('uRot'), 0, 1); gl.uniform2f(u('uPointer'), 0, 0);
    gl.uniform1i(u('uColorCount'), 0); gl.uniform1i(u('uTransparent'), 1); gl.uniform1i(u('uIterations'), 1);
    const timeUniform = u('uTime'), intensityUniform = u('uIntensity'), sizeUniform = u('uCanvas');
    let frame = 0, last = 0, elapsed = 0;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const draw = (now: number) => {
      frame = 0;
      if (!this.activity.visible || gl.isContextLost()) return;
      if (now - last >= 33 || motion.matches) {
        if (last && !motion.matches) elapsed += Math.min(now - last, 100) / 1000;
        last = now;
        gl.uniform1f(timeUniform, elapsed);
        gl.uniform1f(intensityUniform, { light: .8, medium: 1.15, heavy: 1.5 }[this.intensity()]);
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
