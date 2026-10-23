import * as THREE from "three";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { Frame } from "./drives";
import { mats } from "./kit";
import { buildSet, type SetData, type SetId } from "./sets";
import { Car, Person } from "./vehicles";

// One WebGL renderer, drawn into whichever 2D canvas asks for a frame. Sharing one context keeps
// the app's two simulator views and the video's overlapping clips cheap.

const EYE = new THREE.Vector3(-0.37, 1.22, 0.25);
const SUN_DIR = new THREE.Vector3(-0.55, 0.78, -0.3).normalize();

const SKY = {
  day: { top: "#3F78B5", horizon: "#CFDDE8", ground: "#B9C2BD", sun: "#FFE4B8", stars: 0, clouds: 0.85 },
  night: { top: "#03060C", horizon: "#16202F", ground: "#0A0D12", sun: "#000000", stars: 1, clouds: 0 },
};

function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      ground: { value: new THREE.Color() },
      sunColor: { value: new THREE.Color() },
      sunDir: { value: SUN_DIR.clone() },
      stars: { value: 0 },
      clouds: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunColor; uniform vec3 sunDir; uniform float stars;
      varying vec3 vDir;
      uniform float clouds;
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float h2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 c = mix(horizon, top, pow(clamp(h, 0.0, 1.0), 0.5));
        c = mix(c, ground, smoothstep(0.0, -0.06, h));
        float s = max(dot(d, sunDir), 0.0);
        c += sunColor * (pow(s, 900.0) * 8.0 + pow(s, 14.0) * 0.18);
        if (clouds > 0.0 && h > 0.0) {
          vec2 uv = d.xz / (h + 0.12) * 1.6;
          float n = fbm(uv + vec2(3.1, 7.7));
          float cov = smoothstep(0.52, 0.78, n) * smoothstep(0.0, 0.18, h);
          vec3 cc = mix(vec3(0.82, 0.85, 0.9), vec3(1.0), smoothstep(0.5, 0.9, n));
          c = mix(c, cc * (0.9 + 0.25 * s), cov * clouds);
        }
        if (stars > 0.0 && h > 0.04) {
          vec3 q = floor(d * 380.0);
          float st = step(0.9975, hash(q));
          c += vec3(0.75, 0.8, 0.9) * st * smoothstep(0.04, 0.3, h) * (0.4 + 0.6 * hash(q + 1.0));
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
}

type Target = { w: number; h: number; rt: THREE.WebGLRenderTarget; bloom: UnrealBloomPass; used: number };

export type View = {
  /** Project a world point to pixels in the drawn frame; null when behind the camera. */
  project: (x: number, y: number, z: number) => { x: number; y: number; d: number } | null;
};

class Engine {
  canvas: HTMLCanvasElement;
  /** True when this engine draws straight into an on-screen canvas of exactly the requested size. */
  exact: boolean;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.05, 2400);
  rig = new THREE.Group();
  head = new THREE.Group();
  wheel = new THREE.Group();
  sun = new THREE.DirectionalLight("#FFF1DE", 2.9);
  hemi = new THREE.HemisphereLight("#DCE8F4", "#5E6B58", 0.75);
  beams: THREE.SpotLight[] = [];
  /** Instrument glow that lets the wheel and dash read at night. */
  glow = new THREE.PointLight("#AFC4E4", 0, 1.6, 2);
  sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  sets = new Map<SetId, SetData>();
  cars = new Map<string, Car>();
  people = new Map<string, Person>();
  env: { day: THREE.Texture; night: THREE.Texture };
  targets: Target[] = [];
  output = new OutputPass();
  mode: "day" | "night" | null = null;
  tick = 0;

  constructor(onScreen = false) {
    this.canvas = document.createElement("canvas");
    this.exact = onScreen;
    // Off screen, frames are copied out after drawing, so the buffer must survive until then.
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: !onScreen });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.output.renderToScreen = true;

    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), skyMaterial());
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    const sc = this.sun.shadow.camera;
    sc.left = -70;
    sc.right = 70;
    sc.top = 70;
    sc.bottom = -70;
    sc.near = 10;
    sc.far = 520;
    this.sun.shadow.bias = -0.00025;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.radius = 2.5;
    this.scene.add(this.sun, this.sun.target, this.hemi);

    this.buildCockpit();
    this.rig.rotation.order = "YXZ";
    this.scene.add(this.rig);

    this.env = { day: this.makeEnv("day"), night: this.makeEnv("night") };
  }

  private makeEnv(mode: "day" | "night") {
    const pm = new THREE.PMREMGenerator(this.renderer);
    const s = new THREE.Scene();
    const m = skyMaterial();
    this.paintSky(m, mode);
    m.uniforms.stars.value = 0;
    s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), m));
    const g = new THREE.Mesh(new THREE.CircleGeometry(50, 32), new THREE.MeshBasicMaterial({ color: mode === "day" ? "#6C7466" : "#07090C" }));
    g.rotation.x = -Math.PI / 2;
    g.position.y = -2;
    s.add(g);
    if (mode === "night") {
      // A few warm sources so paint and glass still catch light at night.
      for (const [x, z] of [
        [20, -10],
        [-25, 15],
        [5, 30],
      ]) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFC98A").multiplyScalar(2) }));
        b.position.set(x, 8, z);
        s.add(b);
      }
    }
    const tex = pm.fromScene(s, 0.02).texture;
    pm.dispose();
    return tex;
  }

  private paintSky(m: THREE.ShaderMaterial, mode: "day" | "night") {
    const k = SKY[mode];
    m.uniforms.top.value.set(k.top);
    m.uniforms.horizon.value.set(k.horizon);
    m.uniforms.ground.value.set(k.ground);
    m.uniforms.sunColor.value.set(k.sun);
    m.uniforms.stars.value = k.stars;
    m.uniforms.clouds.value = k.clouds;
  }

  private buildCockpit() {
    const soft = new THREE.MeshStandardMaterial({ color: "#16191D", roughness: 0.78, metalness: 0.0 });
    const satin = new THREE.MeshStandardMaterial({ color: "#8E959B", roughness: 0.35, metalness: 0.8 });
    const leather = new THREE.MeshStandardMaterial({ color: "#1B1E21", roughness: 0.55 });

    // Dashboard: a side profile extruded across the cabin.
    const prof = new THREE.Shape();
    prof.moveTo(-0.12, 0.58);
    prof.lineTo(-0.36, 0.8);
    prof.quadraticCurveTo(-0.42, 0.85, -0.5, 0.855);
    prof.lineTo(-1.08, 0.872);
    prof.lineTo(-1.12, 0.58);
    prof.closePath();
    const dash = new THREE.ExtrudeGeometry(prof, { depth: 3.2, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 8 });
    // Profile x is along the car (forward negative), y up; extrusion runs across.
    dash.rotateY(-Math.PI / 2);
    dash.translate(1.6 + EYE.x, 0, 0);
    const dm = new THREE.Mesh(dash, soft);
    dm.position.z = 0.25;
    dm.receiveShadow = true;
    this.rig.add(dm);
    // A satin line along the dash.
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.012, 0.012), satin);
    strip.position.set(EYE.x, 0.8, 0.25 - 0.37);
    this.rig.add(strip);
    // Instrument hood in front of the driver.
    const hood = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 12), soft);
    hood.rotation.z = Math.PI / 2;
    hood.scale.set(1, 1, 1.6);
    hood.position.set(EYE.x, 0.86, 0.25 - 0.66);
    this.rig.add(hood);

    // Steering wheel, tilted toward the driver.
    const tilt = new THREE.Group();
    tilt.position.set(EYE.x, 0.84, 0.25 - 0.56);
    tilt.rotation.x = -0.42;
    tilt.add(this.wheel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.026, 14, 56), leather);
    this.wheel.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.068, 0.06, 24), leather);
    hub.rotation.x = Math.PI / 2;
    this.wheel.add(hub);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.022, 24), satin);
    badge.position.z = 0.031;
    this.wheel.add(badge);
    for (const a of [0, Math.PI, -Math.PI / 2]) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.032, 0.018), leather);
      spoke.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0);
      spoke.rotation.z = a;
      this.wheel.add(spoke);
    }
    // A yellow mark at twelve o'clock shows the wheel turning.
    const mark = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.0275, 10, 8, 0.12), new THREE.MeshStandardMaterial({ color: "#F4B400", roughness: 0.5 }));
    mark.rotation.z = Math.PI / 2 - 0.06;
    this.wheel.add(mark);
    this.rig.add(tilt);

    this.head.position.copy(EYE);
    this.head.add(this.camera);
    this.rig.add(this.head);

    this.glow.position.set(EYE.x, 0.98, 0.25 - 0.95);
    this.rig.add(this.glow);

    // Low beams.
    for (const x of [-0.6, 0.6]) {
      const s = new THREE.SpotLight("#FFF4E0", 0, 95, 0.42, 1, 2);
      s.position.set(x, 0.7, -2.3);
      s.target.position.set(x * 0.4, -1.4, -50);
      this.rig.add(s, s.target);
      this.beams.push(s);
    }
  }

  /** Build a scene and compile its shaders without drawing it. */
  warm(id: SetId) {
    const set = this.setFor(id);
    const was = set.root.visible;
    set.root.visible = true;
    this.renderer.compile(this.scene, this.camera);
    set.root.visible = was;
  }

  private setFor(id: SetId) {
    let s = this.sets.get(id);
    if (!s) {
      s = buildSet(id);
      this.sets.set(id, s);
      this.scene.add(s.root);
    }
    return s;
  }

  private fog = { day: new THREE.Fog("#CFDDE8", 160, 950), night: new THREE.FogExp2("#0B1019", 0.0042) };

  /** Day or night. Applied on every draw: materials are shared with any other engine on the page. */
  private applyMode(mode: "day" | "night") {
    const night = mode === "night";
    const m = mats();
    if (this.mode !== mode) this.paintSky(this.sky.material, mode);
    this.mode = mode;
    this.scene.environment = night ? this.env.night : this.env.day;
    this.scene.environmentIntensity = night ? 0.35 : 0.75;
    this.scene.fog = night ? this.fog.night : this.fog.day;
    this.sun.intensity = night ? 0.12 : 3.3;
    this.sun.color.set(night ? "#9DB4E0" : "#FFF1DE");
    this.hemi.intensity = night ? 0.1 : 0.5;
    this.hemi.color.set(night ? "#3A4A6A" : "#DCE8F4");
    this.hemi.groundColor.set(night ? "#0B0D10" : "#5E6B58");
    for (const b of this.beams) b.intensity = night ? 260 : 0;
    this.glow.intensity = night ? 1.4 : 0;
    for (const f of [m.brickRed, m.brickTan, m.stucco, m.stuccoGrey, m.office]) f.emissiveIntensity = night ? 0.8 : 0;
    m.storefront.emissiveIntensity = night ? 0.75 : 0;
    m.window.emissiveIntensity = night ? 0.5 : 0;
    m.lampHead.emissiveIntensity = night ? 8 : 0;
    m.stopFace.emissiveIntensity = night ? 0.08 : 0;
    this.renderer.toneMappingExposure = night ? 1.15 : 0.95;
  }

  private target(w: number, h: number) {
    let t = this.targets.find((x) => x.w === w && x.h === h);
    if (!t) {
      const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.5, 1.1);
      if (this.targets.length >= 3) {
        // Drop the least recently used before adding the new one.
        const old = this.targets.sort((a, b) => b.used - a.used).pop()!;
        old.rt.dispose();
        old.bloom.dispose();
      }
      t = { w, h, rt, bloom, used: 0 };
      this.targets.push(t);
    }
    t.used = ++this.tick;
    return t;
  }

  draw(f: Frame, w: number, h: number, t: number, shadow = 4096): View {
    if (this.sun.shadow.mapSize.x !== shadow) {
      this.sun.shadow.mapSize.set(shadow, shadow);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    const set = this.setFor(f.set);
    for (const s of this.sets.values()) s.root.visible = s === set;
    this.applyMode(f.night ? "night" : "day");
    set.night.visible = f.night;

    // The driver's car.
    const vib = Math.min(1, f.v / 15);
    const shake = f.shake;
    this.rig.position.set(f.x, 0, f.z);
    this.rig.rotation.set(
      f.a * 0.0035 + vib * (Math.sin(t * 31) * 0.0005 + Math.sin(t * 17.3) * 0.0004) + shake * Math.sin(t * 53) * 0.02,
      -f.h,
      shake * Math.cos(t * 47) * 0.015,
    );
    this.head.rotation.y = -f.look;
    this.head.position.x = EYE.x + f.look * 0.04;
    this.wheel.rotation.z = -f.steer;

    // Other cars and people.
    const seen = new Set<string>();
    for (const c of f.cars) {
      const key = `${f.set}/${c.key}`;
      let car = this.cars.get(key);
      if (!car) {
        car = new Car(c.kind, c.paint);
        this.cars.set(key, car);
        this.scene.add(car.group);
      }
      car.place(c.x, c.z, c.h, { braking: c.braking, lights: c.lights });
      seen.add(key);
    }
    for (const [key, car] of this.cars) if (!seen.has(key)) car.group.visible = false;
    for (const p of f.peds) {
      const key = `${f.set}/${p.key}`;
      let person = this.people.get(key);
      if (!person) {
        person = new Person(p.seed);
        this.people.set(key, person);
        this.scene.add(person.group);
      }
      person.place(p.x, p.z, p.h, p.walked, true, p.y);
      seen.add(key);
    }
    for (const [key, person] of this.people) if (!seen.has(key)) person.group.visible = false;

    // Camera first, so signals can tell which way they face it.
    this.scene.updateMatrixWorld();
    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);

    // Signals.
    const m = mats();
    for (const head of set.signals) {
      const state = f.lights[head.approach];
      head.lamps.forEach((lamp, i) => {
        const c = (["red", "yellow", "green"] as const)[i];
        lamp.material = state === c ? m.lampOn[c] : m.lampOff[c];
      });
      const i = state ? ["red", "yellow", "green"].indexOf(state) : -1;
      // A lamp only glows toward the traffic it faces.
      const toCam = camPos.clone().sub(head.at[1]).normalize();
      const facing = THREE.MathUtils.smoothstep(toCam.dot(head.normal), 0.25, 0.7);
      head.halo.visible = i >= 0 && facing > 0;
      if (i >= 0) {
        head.halo.position.copy(head.at[i]);
        (head.halo.material as THREE.SpriteMaterial).color.set(["#FF5A40", "#FFC040", "#40F0A0"][i]);
        (head.halo.material as THREE.SpriteMaterial).opacity = (f.night ? 0.9 : 0.45) * facing;
        head.halo.scale.setScalar(f.night ? 2.4 : 1.2);
      }
    }

    // Camera and the sun's shadow box follow the driver.
    const aspect = w / h;
    // Hold the horizontal field of view at about 78 degrees on any screen shape.
    const hfov = (78 * Math.PI) / 180;
    this.camera.fov = (2 * Math.atan(Math.tan(hfov / 2) / aspect) * 180) / Math.PI;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.sky.position.copy(camPos);
    const fwd = new THREE.Vector3(Math.sin(f.h), 0, -Math.cos(f.h));
    const center = camPos.clone().setY(0).addScaledVector(fwd, 38);
    // Snap to shadow texels so static shadows don't shimmer as the camera moves.
    const L = SUN_DIR;
    const R = new THREE.Vector3(0, 1, 0).cross(L).normalize();
    const U = L.clone().cross(R).normalize();
    const texel = 140 / this.sun.shadow.mapSize.x;
    const snap = (v: number) => Math.round(v / texel) * texel;
    const cr = center.dot(R);
    const cu = center.dot(U);
    center.addScaledVector(R, snap(cr) - cr).addScaledVector(U, snap(cu) - cu);
    this.sun.target.position.copy(center);
    this.sun.position.copy(center).addScaledVector(L, 260);
    this.sun.target.updateMatrixWorld();

    // Render: HDR scene, bloom, then tone-mapped into the corner of the shared canvas.
    if (this.exact ? this.canvas.width !== w || this.canvas.height !== h : this.canvas.width < w || this.canvas.height < h) {
      this.renderer.setSize(this.exact ? w : Math.max(this.canvas.width, w), this.exact ? h : Math.max(this.canvas.height, h), false);
    }
    const tg = this.target(w, h);
    // Bloom only at night, for lamps, signals and headlights.
    tg.bloom.strength = 0.6;
    tg.bloom.radius = 0.5;
    tg.bloom.threshold = 1.3;
    this.renderer.setRenderTarget(tg.rt);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (f.night) tg.bloom.render(this.renderer, tg.rt, tg.rt, 0, false);
    this.renderer.setRenderTarget(null);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.setScissorTest(false);
    this.output.render(this.renderer, null as unknown as THREE.WebGLRenderTarget, tg.rt, 0, false);

    const v = new THREE.Vector3();
    const project = (x: number, y: number, z: number) => {
      v.set(x, y, z).applyMatrix4(this.camera.matrixWorldInverse);
      if (v.z > -0.1) return null;
      const d = -v.z;
      v.applyMatrix4(this.camera.projectionMatrix);
      return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, d };
    };
    return { project };
  }
}

export type { Engine };

let engine: Engine | null = null;
/** Shared off-screen engine: frames are copied into any number of 2D canvases (the video, and spare views). */
export const getEngine = () => (engine ??= new Engine());

let live: Engine | null = null;
/** The app's engine, drawing straight into its own on-screen canvas. */
export const getLiveEngine = () => (live ??= new Engine(true));

/** Build scenes ahead of time, one per idle moment, so moving between drives never stalls. */
export function prepare(ids: SetId[]) {
  const queue = [...new Set(ids)];
  let stopped = false;
  const next = () => {
    const id = queue.shift();
    if (!id || stopped) return;
    getLiveEngine().warm(id);
    idle(next);
  };
  idle(next);
  return () => {
    stopped = true;
  };
}

const idle = (fn: () => void) => ("requestIdleCallback" in window ? window.requestIdleCallback(fn, { timeout: 400 }) : setTimeout(fn, 60));
