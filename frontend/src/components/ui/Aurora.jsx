import { useEffect, useRef } from "react";

const VERT = `
attribute vec2 position;
void main(){gl_Position=vec4(position,0,1);}
`;

const FRAG = `
precision mediump float;
uniform float u_time;
uniform vec2  u_resolution;

vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.,i1.z,i2.z,1.))
    +i.y+vec4(0.,i1.y,i2.y,1.))
    +i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

uniform vec3  u_color1;
uniform vec3  u_color2;
uniform vec3  u_color3;
uniform vec3  u_color4;
uniform float u_speed;
uniform float u_intensity;
uniform float u_blend;

void main(){
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float t  = u_time * u_speed;

  float n1 = snoise(vec3(uv * 1.8, t * 0.4));
  float n2 = snoise(vec3(uv * 2.2 + 3.7, t * 0.3 + 1.0));
  float n3 = snoise(vec3(uv * 1.5 + 7.3, t * 0.5 + 2.5));

  float curtain = smoothstep(0.3, 0.85, uv.y + n1 * 0.18)
                * smoothstep(1.0, 0.5,  uv.y + n2 * 0.12);

  float band1 = smoothstep(0.0, 0.6, n1 * 0.5 + 0.5);
  float band2 = smoothstep(0.0, 0.6, n2 * 0.5 + 0.5);
  float band3 = smoothstep(0.0, 0.6, n3 * 0.5 + 0.5);

  vec3 col = mix(u_color1, u_color2, band1);
  col      = mix(col,      u_color3, band2 * u_blend);
  col      = mix(col,      u_color4, band3 * u_blend * 0.7);

  float alpha = curtain * u_intensity * (0.55 + 0.45 * band1);

  gl_FragColor = vec4(col * alpha, alpha);
}
`;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return s;
}

export default function Aurora({
  colorStops = ["#3A29FF", "#FF94B4", "#FF3232"],
  amplitude = 1.0,
  speed = 0.5,
  blend = 0.5,
}) {
  const canvasRef = useRef(null);
  const rafRef    = useRef(null);
  const propsRef  = useRef({ speed, amplitude, blend });
  propsRef.current = { speed, amplitude, blend };

  // Derive 4 colours from colorStops
  const colors = [
    colorStops[0] ?? "#3A29FF",
    colorStops[1] ?? "#FF94B4",
    colorStops[2] ?? "#FF3232",
    colorStops[3] ?? colorStops[0] ?? "#3A29FF",
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false });
    if (!gl) return;

    // Build program
    const vert = compileShader(gl, gl.VERTEX_SHADER,   VERT);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Full-screen quad
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    // Uniforms
    const uTime       = gl.getUniformLocation(prog, "u_time");
    const uRes        = gl.getUniformLocation(prog, "u_resolution");
    const uColor1     = gl.getUniformLocation(prog, "u_color1");
    const uColor2     = gl.getUniformLocation(prog, "u_color2");
    const uColor3     = gl.getUniformLocation(prog, "u_color3");
    const uColor4     = gl.getUniformLocation(prog, "u_color4");
    const uSpeed      = gl.getUniformLocation(prog, "u_speed");
    const uIntensity  = gl.getUniformLocation(prog, "u_intensity");
    const uBlend      = gl.getUniformLocation(prog, "u_blend");

    gl.uniform3fv(uColor1, hexToRgb(colors[0]));
    gl.uniform3fv(uColor2, hexToRgb(colors[1]));
    gl.uniform3fv(uColor3, hexToRgb(colors[2]));
    gl.uniform3fv(uColor4, hexToRgb(colors[3]));

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    let start = null;

    function resize() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function tick(ts) {
      if (!start) start = ts;
      const t = (ts - start) / 1000;
      resize();
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uSpeed,     propsRef.current.speed);
      gl.uniform1f(uIntensity, propsRef.current.amplitude);
      gl.uniform1f(uBlend,     propsRef.current.blend);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      gl.deleteProgram(prog);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
