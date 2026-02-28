"use client";

import { useEffect, useRef } from "react";

import { auroraSignal } from "./auroraSignal";

const vertexSource = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentSource = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform float uSpeed;
uniform float uScale;
uniform float uIntensity;
uniform vec3 uColor1;
uniform vec3 uColor2;

void main() {
  vec2 U = gl_FragCoord.xy;
  vec2 uv = U / iResolution.xy;
  float t = iTime * uSpeed * 0.5;
  float w1 = sin(uv.x * 5.0 * uScale + t) * cos(uv.x * 3.0 - t * 0.5);
  float w2 = sin(uv.x * 7.0 * uScale - t * 0.7) * cos(uv.x * 2.0 + t);
  float y = uv.y - 0.5;
  float aurora = exp(-abs(y - w1 * 0.2) * 10.0) * 0.5 + exp(-abs(y - w2 * 0.15 - 0.1) * 8.0) * 0.5;
  vec3 col = mix(uColor2, uColor1, aurora) + aurora * vec3(0.34, 0.06, 0.26);
  gl_FragColor = vec4(col * uIntensity, 1.0);
}
`;

const createShader = (gl: WebGLRenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: true,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    if (!buffer) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    if (positionLocation < 0) {
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const resolutionLocation = gl.getUniformLocation(program, "iResolution");
    const timeLocation = gl.getUniformLocation(program, "iTime");
    const speedLocation = gl.getUniformLocation(program, "uSpeed");
    const scaleLocation = gl.getUniformLocation(program, "uScale");
    const intensityLocation = gl.getUniformLocation(program, "uIntensity");
    const color1Location = gl.getUniformLocation(program, "uColor1");
    const color2Location = gl.getUniformLocation(program, "uColor2");

    const dprLimit = 2;
    const renderScale = 0.75;
    const targetFps = 30;
    const frameInterval = 1000 / targetFps;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprLimit);
      const cssWidth = Math.max(window.innerWidth, document.documentElement.clientWidth, 1);
      const cssHeight = Math.max(window.innerHeight, document.documentElement.clientHeight, 1);
      const width = Math.max(1, Math.ceil(cssWidth * dpr * renderScale));
      const height = Math.max(1, Math.ceil(cssHeight * dpr * renderScale));

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      canvas.style.display = "block";

      gl.viewport(0, 0, width, height);
      if (resolutionLocation) gl.uniform2f(resolutionLocation, width, height);
    };

    resize();
    window.addEventListener("resize", resize);

    if (speedLocation) gl.uniform1f(speedLocation, 0.85);
    if (scaleLocation) gl.uniform1f(scaleLocation, 1.05);
    if (intensityLocation) gl.uniform1f(intensityLocation, 0.92);
    if (color1Location) gl.uniform3f(color1Location, 1.0, 0.35, 0.72);
    if (color2Location) gl.uniform3f(color2Location, 0.03, 0.01, 0.03);

    let rafId = 0;
    let lastFrame = performance.now();
    let time = 0;

    const render = (now: number) => {
      rafId = window.requestAnimationFrame(render);
      if (auroraSignal.paused) return;
      if (now - lastFrame < frameInterval) return;
      const delta = now - lastFrame;
      lastFrame = now;
      time += delta / 1000;
      if (timeLocation) gl.uniform1f(timeLocation, time);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    rafId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />;
}
