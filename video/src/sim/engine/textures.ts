import * as THREE from "three";
import { rng } from "./motion";

// Procedural textures, drawn once into canvases and shared by every renderer.

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return { c, g: c.getContext("2d")! };
}

function tex(c: HTMLCanvasElement, opts: { repeat?: boolean; color?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (opts.color !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

/** Fine grain over a base colour, with soft larger blotches. */
function grain(g: CanvasRenderingContext2D, w: number, h: number, base: [number, number, number], amount: number, seed: number, blotch = 0) {
  const r = rng(seed);
  const img = g.createImageData(w, h);
  // Low-frequency variation from a coarse grid, bilinearly sampled.
  const gs = 8;
  const grid = Array.from({ length: (gs + 1) * (gs + 1) }, () => r() - 0.5);
  const at = (x: number, y: number) => {
    const fx = (x / w) * gs;
    const fy = (y / h) * gs;
    const ix = Math.floor(fx) % gs;
    const iy = Math.floor(fy) % gs;
    const tx = fx - Math.floor(fx);
    const ty = fy - Math.floor(fy);
    const v = (i: number, j: number) => grid[(j % gs) * (gs + 1) + (i % gs)];
    return v(ix, iy) * (1 - tx) * (1 - ty) + v(ix + 1, iy) * tx * (1 - ty) + v(ix, iy + 1) * (1 - tx) * ty + v(ix + 1, iy + 1) * tx * ty;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = (r() - 0.5) * amount + at(x, y) * blotch;
      const i = (y * w + x) * 4;
      img.data[i] = base[0] + n;
      img.data[i + 1] = base[1] + n;
      img.data[i + 2] = base[2] + n;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
}

let cache: ReturnType<typeof make> | null = null;
export const textures = () => (cache ??= make());

function make() {
  // Asphalt: dark grain with lighter aggregate.
  const asphalt = (() => {
    const { c, g } = canvas(512, 512);
    grain(g, 512, 512, [74, 78, 83], 26, 0.31, 22);
    const r = rng(0.77);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? "200,200,196" : "30,32,35"},${0.12 + r() * 0.2})`;
      g.fillRect(r() * 512, r() * 512, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    return tex(c);
  })();

  const grass = (() => {
    const { c, g } = canvas(512, 512);
    grain(g, 512, 512, [104, 128, 82], 30, 0.52, 34);
    const r = rng(0.13);
    for (let i = 0; i < 5000; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? "150,170,110" : "70,94,58"},${0.15 + r() * 0.2})`;
      g.fillRect(r() * 512, r() * 512, 1, 2 + r() * 3);
    }
    return tex(c);
  })();

  // Sidewalk: pale concrete with joints every slab. One texture repeat is one 1.6 m slab.
  const concrete = (() => {
    const { c, g } = canvas(256, 256);
    grain(g, 256, 256, [196, 194, 187], 14, 0.91, 10);
    g.strokeStyle = "rgba(110,108,102,0.55)";
    g.lineWidth = 2;
    g.strokeRect(1, 1, 254, 254);
    return tex(c);
  })();

  const gravel = (() => {
    const { c, g } = canvas(256, 256);
    grain(g, 256, 256, [150, 142, 128], 40, 0.42, 20);
    return tex(c);
  })();

  // Clapboard siding, one repeat per metre.
  const siding = (() => {
    const { c, g } = canvas(256, 256);
    grain(g, 256, 256, [236, 236, 232], 6, 0.6, 4);
    for (let y = 0; y < 256; y += 32) {
      g.fillStyle = "rgba(0,0,0,0.13)";
      g.fillRect(0, y + 28, 256, 4);
      g.fillStyle = "rgba(255,255,255,0.25)";
      g.fillRect(0, y, 256, 2);
    }
    return tex(c);
  })();

  const shingles = (() => {
    const { c, g } = canvas(256, 256);
    grain(g, 256, 256, [92, 90, 88], 26, 0.25, 14);
    for (let y = 0; y < 256; y += 21) {
      g.fillStyle = "rgba(0,0,0,0.28)";
      g.fillRect(0, y, 256, 3);
      const off = (y / 21) % 2 ? 16 : 0;
      for (let x = off; x < 256; x += 32) g.fillRect(x, y, 2, 21);
    }
    return tex(c);
  })();

  // Facades: an 8 x 8 grid of window modules. Night versions light a random set of windows.
  type Style = { wall: string; frame: string; glass: [string, string]; win: [number, number, number, number]; brick?: boolean; band?: string };
  const facade = (style: Style, seed: number) => {
    const N = 8;
    const M = 128;
    const day = canvas(N * M, N * M);
    const night = canvas(N * M, N * M);
    const r = rng(seed);
    day.g.fillStyle = style.wall;
    day.g.fillRect(0, 0, N * M, N * M);
    night.g.fillStyle = "#000";
    night.g.fillRect(0, 0, N * M, N * M);
    if (style.brick) {
      for (let y = 0; y < N * M; y += 6) {
        day.g.fillStyle = "rgba(255,255,255,0.08)";
        day.g.fillRect(0, y, N * M, 1);
        for (let x = (y / 6) % 2 ? 0 : 7; x < N * M; x += 14) day.g.fillRect(x, y, 1, 6);
      }
    }
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const [wx, wy, ww, wh] = style.win;
        const x = i * M + wx * M;
        const y = j * M + wy * M;
        const w = ww * M;
        const h = wh * M;
        if (style.band) {
          day.g.fillStyle = style.band;
          day.g.fillRect(i * M, j * M + M * 0.86, M, M * 0.14);
        }
        day.g.fillStyle = style.frame;
        day.g.fillRect(x - 4, y - 4, w + 8, h + 8);
        const gr = day.g.createLinearGradient(x, y, x + w * 0.4, y + h);
        gr.addColorStop(0, style.glass[0]);
        gr.addColorStop(1, style.glass[1]);
        day.g.fillStyle = gr;
        day.g.fillRect(x, y, w, h);
        // Some blinds half drawn.
        if (r() < 0.3) {
          day.g.fillStyle = "rgba(225,222,212,0.85)";
          day.g.fillRect(x, y, w, h * (0.2 + r() * 0.5));
        }
        day.g.fillStyle = style.frame;
        day.g.fillRect(x + w / 2 - 2, y, 4, h);
        const lit = r();
        if (lit < 0.38) {
          const warm = r() < 0.8;
          const a = 0.55 + r() * 0.45;
          night.g.fillStyle = warm ? `rgba(255,${196 + Math.floor(r() * 30)},${120 + Math.floor(r() * 40)},${a})` : `rgba(200,220,255,${a * 0.8})`;
          night.g.fillRect(x, y, w, h);
          night.g.fillStyle = "rgba(0,0,0,0.6)";
          night.g.fillRect(x + w / 2 - 2, y, 4, h);
        } else if (lit < 0.48) {
          night.g.fillStyle = "rgba(80,90,120,0.25)";
          night.g.fillRect(x, y, w, h);
        }
      }
    return { map: tex(day.c), night: tex(night.c) };
  };

  const brickRed = facade({ wall: "#8E5A47", frame: "#E8E2D6", glass: ["#4F6576", "#22303B"], win: [0.24, 0.16, 0.52, 0.6], brick: true }, 0.21);
  const brickTan = facade({ wall: "#B49272", frame: "#3B4148", glass: ["#5A7183", "#26333E"], win: [0.2, 0.18, 0.6, 0.56], brick: true }, 0.37);
  const stucco = facade({ wall: "#D9D2C3", frame: "#F4F1EA", glass: ["#61798B", "#2A3843"], win: [0.18, 0.2, 0.64, 0.5] }, 0.49);
  const stuccoGrey = facade({ wall: "#B7BCBD", frame: "#E9EBEA", glass: ["#5D7487", "#25323C"], win: [0.16, 0.22, 0.68, 0.46] }, 0.53);
  const office = facade({ wall: "#7D8A95", frame: "#AEB8BF", glass: ["#7F9BB1", "#3A5265"], win: [0.04, 0.06, 0.92, 0.72], band: "#9AA5AD" }, 0.61);

  // Ground-floor shopfronts: one module is a 5 m bay, 4.4 m tall.
  const storefront = (() => {
    const N = 4;
    const M = 256;
    const day = canvas(N * M, M);
    const night = canvas(N * M, M);
    const r = rng(0.83);
    const awnings = ["#2F4A3F", "#7A2E2A", "#2C3E5A", "#4A4F55", "#8A6A2E"];
    night.g.fillStyle = "#000";
    night.g.fillRect(0, 0, N * M, M);
    for (let i = 0; i < N; i++) {
      const x = i * M;
      day.g.fillStyle = "#2D3338";
      day.g.fillRect(x, 0, M, M);
      day.g.fillStyle = awnings[Math.floor(r() * awnings.length)];
      day.g.fillRect(x, 0, M, M * 0.17);
      const gr = day.g.createLinearGradient(x, M * 0.22, x + M * 0.5, M);
      gr.addColorStop(0, "#71879A");
      gr.addColorStop(1, "#27333D");
      day.g.fillStyle = gr;
      day.g.fillRect(x + 12, M * 0.22, M - 24, M * 0.7);
      day.g.fillStyle = "#1E2327";
      day.g.fillRect(x + M * 0.62, M * 0.22, 5, M * 0.7);
      day.g.fillRect(x + 12, M * 0.6, M * 0.6, 4);
      // Warm interiors at night.
      const g2 = night.g.createLinearGradient(x, M * 0.22, x, M);
      g2.addColorStop(0, "rgba(255,214,150,0.95)");
      g2.addColorStop(1, "rgba(255,190,120,0.7)");
      night.g.fillStyle = g2;
      night.g.fillRect(x + 12, M * 0.22, M - 24, M * 0.7);
      night.g.fillStyle = "rgba(255,240,220,0.5)";
      night.g.fillRect(x, M * 0.03, M, M * 0.1);
    }
    return { map: tex(day.c), night: tex(night.c) };
  })();

  const stop = (() => {
    const { c, g } = canvas(256, 256);
    const oct = (r: number) => {
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI / 8) * (2 * i + 1);
        g.lineTo(128 + r * Math.cos(a), 128 + r * Math.sin(a));
      }
      g.closePath();
    };
    g.fillStyle = "#ffffff";
    oct(128);
    g.fill();
    g.fillStyle = "#B42C24";
    oct(116);
    g.fill();
    g.fillStyle = "#ffffff";
    g.font = `800 74px "Overpass Variable", "Helvetica Neue", Arial, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("STOP", 128, 134);
    return tex(c, { repeat: false });
  })();

  // Grey-on-black masks: alpha maps read the green channel, and additive sprites add nothing where black.
  const glow = (() => {
    const { c, g } = canvas(128, 128);
    g.fillStyle = "#000";
    g.fillRect(0, 0, 128, 128);
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 63);
    gr.addColorStop(0, "rgb(255,255,255)");
    gr.addColorStop(0.2, "rgb(140,140,140)");
    gr.addColorStop(0.5, "rgb(31,31,31)");
    gr.addColorStop(1, "rgb(0,0,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return tex(c, { repeat: false, color: false });
  })();

  // Soft dark patch under cars.
  const contact = (() => {
    const { c, g } = canvas(128, 128);
    g.fillStyle = "#000";
    g.fillRect(0, 0, 128, 128);
    g.filter = "blur(10px)";
    g.fillStyle = "#fff";
    g.beginPath();
    g.roundRect(30, 16, 68, 96, 24);
    g.fill();
    g.filter = "none";
    return tex(c, { repeat: false, color: false });
  })();

  return { asphalt, grass, concrete, gravel, siding, shingles, brickRed, brickTan, stucco, stuccoGrey, office, storefront, stop, glow, contact };
}
