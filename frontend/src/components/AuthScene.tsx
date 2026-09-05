import { useEffect, useRef } from 'react';
import {
  AmbientLight,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';

function beltPoints(leftX: number, rightX: number, radius: number, count: number) {
  const pts: Vector3[] = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    let x: number;
    let y: number;
    let z: number;
    if (t < 0.25) {
      const u = t / 0.25;
      x = leftX + (rightX - leftX) * u;
      y = radius;
      z = Math.sin(u * Math.PI) * 0.1;
    } else if (t < 0.5) {
      const u = (t - 0.25) / 0.25;
      const a = Math.PI / 2 - u * Math.PI;
      x = rightX + Math.cos(a) * radius;
      y = Math.sin(a) * radius;
      z = 0;
    } else if (t < 0.75) {
      const u = (t - 0.5) / 0.25;
      x = rightX + (leftX - rightX) * u;
      y = -radius;
      z = -Math.sin(u * Math.PI) * 0.1;
    } else {
      const u = (t - 0.75) / 0.25;
      const a = -Math.PI / 2 - u * Math.PI;
      x = leftX + Math.cos(a) * radius;
      y = Math.sin(a) * radius;
      z = 0;
    }
    pts.push(new Vector3(x, y, z));
  }
  return pts;
}

function createRibbon(curve: CatmullRomCurve3, width: number, segments: number) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const up = new Vector3(0, 1, 0);
  let lastBinormal = new Vector3(0, 0, 1);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const binormal = new Vector3().crossVectors(up, tangent);
    if (binormal.lengthSq() < 1e-6) {
      binormal.copy(lastBinormal);
    } else {
      binormal.normalize();
    }
    if (binormal.dot(lastBinormal) < 0) binormal.negate();
    lastBinormal.copy(binormal);

    const left = p.clone().addScaledVector(binormal, -width / 2);
    const right = p.clone().addScaledVector(binormal, width / 2);
    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    uvs.push(t * 10, 0, t * 10, 1);

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function makeReel(flange: MeshPhysicalMaterial, hub: MeshPhysicalMaterial) {
  const group = new Group();
  const outer = new Mesh(new CylinderGeometry(0.78, 0.78, 0.028, 64), flange);
  const inner = new Mesh(new CylinderGeometry(0.78, 0.78, 0.028, 64), flange);
  const core = new Mesh(new CylinderGeometry(0.2, 0.2, 0.14, 32), hub);
  outer.position.y = 0.07;
  inner.position.y = -0.07;
  group.add(outer, inner, core);
  group.rotation.z = Math.PI / 2;
  return group;
}

export default function AuthScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      host.dataset.fallback = 'true';
      return;
    }

    const scene = new Scene();
    scene.background = new Color('#111214');
    scene.fog = new Fog('#111214', 5.5, 12);

    const camera = new PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(2.6, 0.55, 4.4);

    renderer.setClearColor('#111214');
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    host.appendChild(renderer.domElement);

    const silver = new MeshPhysicalMaterial({
      color: '#c6c1b4',
      metalness: 0.92,
      roughness: 0.28,
      clearcoat: 0.35,
      clearcoatRoughness: 0.4,
    });
    const iron = new MeshPhysicalMaterial({
      color: '#2a2c31',
      metalness: 0.8,
      roughness: 0.45,
    });

    const filmMat = new ShaderMaterial({
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uSilver: { value: new Color('#d2cdc0') },
        uGate: { value: new Color('#171614') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = -mv.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSilver;
        uniform vec3 uGate;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float x = fract(vUv.x + uTime * 0.04);
          float along = fract(x * 2.4);
          float window = step(0.16, along) * step(along, 0.86) * step(0.2, vUv.y) * step(vUv.y, 0.8);
          float sprocket = (step(vUv.y, 0.11) + step(0.89, vUv.y))
            * step(0.32, fract(x * 18.0)) * step(fract(x * 18.0), 0.68);
          vec3 col = mix(uSilver, uGate, window * 0.92);
          col = mix(col, uGate * 0.35, sprocket);
          vec3 n = normalize(vNormal);
          vec3 v = normalize(vView);
          float fresnel = pow(1.0 - max(dot(n, v), 0.0), 2.6);
          col += fresnel * 0.16;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });

    const ambient = new AmbientLight('#c9c4b8', 0.35);
    const key = new DirectionalLight('#f0d2a8', 1.35);
    key.position.set(3.2, 4.2, 2.4);
    const rim = new DirectionalLight('#8ea0b8', 0.55);
    rim.position.set(-3.4, 0.4, -2.2);
    scene.add(ambient, key, rim);

    const stage = new Group();
    scene.add(stage);

    const leftReel = makeReel(silver, iron);
    const rightReel = makeReel(silver, iron);
    leftReel.position.set(-1.35, 0, 0);
    rightReel.position.set(1.35, 0, 0);
    stage.add(leftReel, rightReel);

    const curve = new CatmullRomCurve3(beltPoints(-1.35, 1.35, 0.82, 220), true);
    const tape = new Mesh(createRibbon(curve, 0.16, 220), filmMat);
    stage.add(tape);

    stage.rotation.x = -0.18;
    stage.rotation.y = 0.42;

    const pointer = { x: 0, y: 0 };
    const damped = { x: 0, y: 0 };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    function resize() {
      const el = hostRef.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    function onPointer(e: PointerEvent) {
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    }
    host.addEventListener('pointermove', onPointer);

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!document.hidden && !reduce.matches) {
        elapsed += dt;
        damped.x += (pointer.x - damped.x) * 0.04;
        damped.y += (pointer.y - damped.y) * 0.04;
        stage.rotation.y = 0.42 + damped.x * 0.18;
        stage.rotation.x = -0.18 + damped.y * 0.08;
        leftReel.rotation.x = elapsed * 0.35;
        rightReel.rotation.x = elapsed * 0.35;
        filmMat.uniforms.uTime.value = elapsed;
      }
      camera.lookAt(0.05, 0.02, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    }

    if (reduce.matches) {
      camera.lookAt(0.05, 0.02, 0);
      renderer.render(scene, camera);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      host.removeEventListener('pointermove', onPointer);
      tape.geometry.dispose();
      filmMat.dispose();
      silver.dispose();
      iron.dispose();
      leftReel.traverse((obj) => {
        if (obj instanceof Mesh) obj.geometry.dispose();
      });
      rightReel.traverse((obj) => {
        if (obj instanceof Mesh) obj.geometry.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={hostRef} className="auth-scene" aria-hidden="true" />;
}
