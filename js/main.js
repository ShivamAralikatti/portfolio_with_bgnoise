import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';

// === GLSL 3D simplex noise (Ashima) ===
const NOISE3D = `
// https://github.com/ashima/webgl-noise
vec3 mod289(vec3 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 mod289(vec4 x){return x - floor(x * (1.0/289.0)) * 289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
float snoise(vec3 v){
  const vec2  C = vec2(1.0/6.0,1.0/3.0);
  const vec4  D = vec4(0.0,0.5,1.0,2.0);
  vec3 i  = floor(v + dot(v,C.yyy));
  vec3 x0 = v - i + dot(i,C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy), i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(
    permute(
      permute(i.z + vec4(0.0,i1.z,i2.z,1.0))
      + i.y + vec4(0.0,i1.y,i2.y,1.0))
    + i.x + vec4(0.0,i1.x,i2.x,1.0)
  );
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z), y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy, y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy), b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0, s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.x, a0.y, h.x);
  vec3 p1 = vec3(a0.z, a0.w, h.y);
  vec3 p2 = vec3(a1.x, a1.y, h.z);
  vec3 p3 = vec3(a1.z, a1.w, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m = m*m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const canvas   = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);

const scene  = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1,1,1,-1,0,1);

// === Color palettes ===
// Dark mode: Federico’s navy→pale
const DARK_COLORS  = { c1: [10,  15,  40],  c2: [240, 240, 255] };
// Light mode: your original pink→purple
const LIGHT_COLORS = { c1: [255,   0, 150], c2: [100,   0, 255] };

// === Logo files ===
const DARK_LOGO_SRC  = 'img/logo-dark.png';
const LIGHT_LOGO_SRC = 'img/logo-light.png';

// === Uniforms ===
const uniforms = {
  u_time:             { value: 0 },
  u_resolution:       { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  u_point:            { value: new THREE.Vector2(0.5, 0.5) },
  u_ratio:            { value: window.innerWidth / window.innerHeight },
  u_mouseInteraction: { value: 0 },
  u_color1:           { value: new THREE.Vector3(...DARK_COLORS.c1) },
  u_color2:           { value: new THREE.Vector3(...DARK_COLORS.c2) }
};

// === Shader material ===
const material = new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = vec4(position,1.0);
    }
  `,
  fragmentShader: `
    varying vec2 vUv;
    uniform vec2 u_resolution, u_point;
    uniform float u_ratio, u_time, u_mouseInteraction;
    uniform vec3 u_color1, u_color2;
    ${NOISE3D}
    float circle_s(vec2 d, float r){
      return smoothstep(0.0, r, pow(dot(d,d),0.6)*0.1);
    }
    void main(){
      vec2 aspect = vec2(u_resolution.x/u_resolution.y,1.0);
      vec2 uv     = vUv * aspect;
      vec2 m      = vUv - u_point;
      m.y /= u_ratio;
      float t  = u_time * 0.3;
      float n  = snoise(vec3(uv,t));
      float n1 = snoise(vec3(uv+0.1,t));
      float n2 = snoise(vec3(uv-0.1,t));
      float alpha = (n+n1+n2)/3.0;
      alpha *= circle_s(m, 0.015 * u_mouseInteraction);
      float blendX = 1.0 - n;
      float f      = smoothstep(0.1,1.0,blendX);
      vec3 col     = mix(u_color1/255.0, u_color2/255.0, f);
      gl_FragColor = vec4(col, alpha);
    }
  `
});

// full-screen quad
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), material));

// === Resize & interaction ===
function onResize(){
  renderer.setSize(window.innerWidth, window.innerHeight);
  uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
  uniforms.u_ratio.value = window.innerWidth / window.innerHeight;
}
window.addEventListener('resize', onResize);
onResize();

window.addEventListener('mousemove', e => {
  uniforms.u_point.value.set(e.clientX/window.innerWidth, 1 - e.clientY/window.innerHeight);
  uniforms.u_mouseInteraction.value = 1.5;
});
window.addEventListener('mouseout', () => {
  uniforms.u_mouseInteraction.value = 0;
});

// === Animate ===
const clock = new THREE.Clock();
function animate(){
  uniforms.u_time.value = clock.getElapsedTime();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

// === Day/Night toggle ===
const modeBtn = document.getElementById('mode-toggle');
const bodyEl  = document.body;
const logoImg = document.getElementById('logo-img');



// restore saved or default to dark
if(localStorage.getItem('theme') === 'light'){
  bodyEl.classList.add('light-mode');
  // swap noise palette
  uniforms.u_color1.value.set(...LIGHT_COLORS.c1);
  uniforms.u_color2.value.set(...LIGHT_COLORS.c2);
  // swap logo
  logoImg.src = LIGHT_LOGO_SRC;
  // swap toggle icon
  modeBtn.innerHTML = `<span class="iconify" data-icon="ph:sun" data-inline="false"></span>`;
  Iconify.scan(modeBtn);
}

modeBtn.addEventListener('click', () => {
  const light = bodyEl.classList.toggle('light-mode');
  localStorage.setItem('theme', light ? 'light' : 'dark');

  // swap noise palette
  const pal = light ? LIGHT_COLORS : DARK_COLORS;
  uniforms.u_color1.value.set(...pal.c1);
  uniforms.u_color2.value.set(...pal.c2);

  // swap logo
  logoImg.src = light ? LIGHT_LOGO_SRC : DARK_LOGO_SRC;

  // swap toggle icon
  const icon = light ? 'ph:moon' : 'ph:sun';
  modeBtn.innerHTML = `<span class="iconify" data-icon="${icon}" data-inline="false"></span>`;
  Iconify.scan(modeBtn);
});

// — rolling greetings — 
function setupGreetings() {
  const container = document.querySelector('.greeting');
  if (!container) return; // no container → bail

  const greetings = [
    'Ciao','Hi','Namaste','Hola','Bonjour',
    'Hallo','Konnichiwa','Nǐ hǎo','Privet','Olá'
  ];

  greetings.forEach(text => {
    const span = document.createElement('span');
    span.textContent = text;
    container.appendChild(span);
  });

  const spans = container.querySelectorAll('span');
  let idx = 0;
  spans[0].classList.add('active');

  setInterval(() => {
    const prev = idx;
    idx = (idx + 1) % spans.length;

    // slide old one up
    spans[prev].classList.remove('active');
    spans[prev].classList.add('exit');

    // bring next one in
    spans[idx].classList.add('active');

    // clean up the old exit
    setTimeout(() => spans[prev].classList.remove('exit'), 500);
  }, 3000);
}

// delay until DOM is ready
if (document.readyState !== 'loading') {
  setupGreetings();
} else {
  document.addEventListener('DOMContentLoaded', setupGreetings);
}

// scroll buttons logic
const btnUp   = document.querySelector('.scroll-btn-up');
const btnDown = document.querySelector('.scroll-btn-down');

// click handlers stay the same
btnUp.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
btnDown.addEventListener('click', () => {
  window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
});

// new helper that shows/hides the up button
function updateUpBtnVisibility() {
  if (window.scrollY >= window.innerHeight) {
    btnUp.classList.add('visible');
  } else {
    btnUp.classList.remove('visible');
  }
}

// run on scroll…
window.addEventListener('scroll', updateUpBtnVisibility);
// …and once on load so it starts hidden
updateUpBtnVisibility();

// Tab switching for Professional Experience
document.querySelectorAll('.prof-nav .tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // activate the clicked button
    document.querySelectorAll('.prof-nav .tab-btn')
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // show corresponding panel
    const target = btn.dataset.tab;
    document.querySelectorAll('#professional-experience .tab-panel')
      .forEach(panel => {
        panel.classList.toggle('active', panel.id === target);
      });
  });
});

const aboutLink = document.getElementById('open-about');
const modal     = document.getElementById('about-modal');
const closeBtn  = modal.querySelector('.modal-close');

aboutLink.addEventListener('click', e => {
  e.preventDefault();
  modal.classList.add('open');
});

// only this button closes it
closeBtn.addEventListener('click', () => {
  modal.classList.remove('open');
});
