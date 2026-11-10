import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * InfoParticleBackground
 * 
 * An interactive, organic particle background for the director's Info/About page.
 * Features:
 * - Fluid cursor disturbance with swirling wake trails that settle in 1-2 seconds
 * - Atmospheric, softly sculpted organic particle formation with gentle ambient breathing
 * - Soft charcoal, slate grey, and sparse muted lavender accents over translucent white
 * - Normal alpha blending with soft feathered radial particle texture
 * - Low density behind the biography column to guarantee crisp legibility
 * - Non-blocking pointer/touch listeners, zero interference with scrolling or clicks
 * - Automatic device scaling, software WebGL detection, reduced-motion & WebGL fallbacks
 * - Strict resource cleanup on unmount to prevent leaks upon repeated opening/closing
 */
export const InfoParticleBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fallbackRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Probe WebGL capabilities
    const isWebGLSupported = (() => {
      try {
        const testCanvas = document.createElement('canvas');
        return Boolean(
          window.WebGLRenderingContext &&
            (testCanvas.getContext('webgl2') || testCanvas.getContext('webgl'))
        );
      } catch {
        return false;
      }
    })();

    // Fallback if WebGL unavailable
    if (!isWebGLSupported) {
      const fallbackCanvas = fallbackRef.current;
      if (fallbackCanvas) {
        fallbackCanvas.style.display = 'block';
        const ctx = fallbackCanvas.getContext('2d');
        if (ctx) {
          const w = (fallbackCanvas.width = window.innerWidth);
          const h = (fallbackCanvas.height = window.innerHeight);
          ctx.fillStyle = '#fafaf9';
          ctx.fillRect(0, 0, w, h);
          // Draw subtle static speckles
          ctx.fillStyle = 'rgba(70, 70, 78, 0.25)';
          for (let i = 0; i < 400; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const r = Math.random() * 2 + 0.8;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      return;
    }

    // Detect software rendering
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return false;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();

    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    // Particle count adapted to device capability
    const particleCount = prefersReducedMotion
      ? isMobile ? 2500 : 6000
      : isSoftwareGl
      ? 3500
      : isMobile
      ? 4500
      : isTablet
      ? 9000
      : 13500;

    // Setup Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );
    camera.position.z = 320;

    // Setup Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl && !isMobile,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const pixelRatio = isSoftwareGl
      ? 1
      : isMobile
      ? Math.min(window.devicePixelRatio, 1.25)
      : Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0); // transparent background

    const domElement = renderer.domElement;
    domElement.style.position = 'absolute';
    domElement.style.inset = '0';
    domElement.style.width = '100%';
    domElement.style.height = '100%';
    domElement.style.pointerEvents = 'none';
    container.appendChild(domElement);

    // Create feathered circular particle texture procedurally
    const particleTexture = (() => {
      const size = 64;
      const cvs = document.createElement('canvas');
      cvs.width = size;
      cvs.height = size;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        const center = size / 2;
        const grad = ctx.createRadialGradient(center, center, 0, center, center, center);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.22, 'rgba(255, 255, 255, 0.88)');
        grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.35)');
        grad.addColorStop(0.85, 'rgba(255, 255, 255, 0.08)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }
      const tex = new THREE.CanvasTexture(cvs);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      return tex;
    })();

    // Buffers for Particle Physics & Visuals
    const positions = new Float32Array(particleCount * 3);
    const basePositions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);

    // Color definitions
    // Soft charcoal & slate greys with extremely sparse, muted lavender accents
    const palette = [
      { r: 0.18, g: 0.18, b: 0.21, weight: 0.36 }, // Soft deep charcoal
      { r: 0.38, g: 0.38, b: 0.44, weight: 0.36 }, // Soft slate grey
      { r: 0.62, g: 0.61, b: 0.68, weight: 0.22 }, // Light heather grey
      { r: 0.58, g: 0.53, b: 0.70, weight: 0.06 }, // Sparse muted lavender accent
    ];

    function pickColor() {
      const rand = Math.random();
      let accum = 0;
      for (const col of palette) {
        accum += col.weight;
        if (rand <= accum) {
          // Slight micro-variation for organic realism
          const jitter = (Math.random() - 0.5) * 0.04;
          return {
            r: Math.max(0, Math.min(1, col.r + jitter)),
            g: Math.max(0, Math.min(1, col.g + jitter)),
            b: Math.max(0, Math.min(1, col.b + jitter)),
          };
        }
      }
      return palette[0];
    }

    // Geometry Generation: Sculpted organic formation
    // Open space is primarily towards the right and outer perimeters;
    // Biography sits on the left on desktop (x < -10, y in [-90, 80]).
    const aspect = window.innerWidth / window.innerHeight;
    const viewWidth = 265 * aspect;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      phases[i] = Math.random() * Math.PI * 2;

      // Layer distribution:
      // 60% Sculpted primary ribbon/eddy (focused on right & upper/lower bounds)
      // 25% Secondary atmospheric branch
      // 15% Ambient dispersed background dust (with reduced density in bio area)
      const group = Math.random();
      let x = 0;
      let y = 0;
      let z = 0;

      if (group < 0.60) {
        // Primary ribbon: parametric sweeping curve across right side & top/bottom
        const t = Math.random() * Math.PI * 2;
        const curveX = Math.cos(t) * 110 + Math.sin(t * 2) * 35 + 40;
        const curveY = Math.sin(t) * 95 + Math.cos(t * 3) * 20;
        const spread = 28 + Math.random() * 32;
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.sqrt(Math.random()) * spread;

        x = curveX + Math.cos(angle) * rad;
        y = curveY + Math.sin(angle) * rad;
        z = (Math.sin(t * 3) * 35) + (Math.random() - 0.5) * 45;
      } else if (group < 0.85) {
        // Secondary delicate filament branching toward the top & bottom right
        const t = (Math.random() - 0.5) * 2.5; // [-1.25, 1.25]
        const curveX = 60 + t * 90 + Math.sin(t * 4) * 25;
        const curveY = t * 110 + Math.cos(t * 3) * 30;
        const spread = 20 + Math.random() * 25;

        x = curveX + (Math.random() - 0.5) * spread;
        y = curveY + (Math.random() - 0.5) * spread;
        z = (Math.random() - 0.5) * 50;
      } else {
        // Dispersed ambient dust
        x = (Math.random() - 0.5) * (viewWidth * 1.1);
        y = (Math.random() - 0.5) * 250;
        z = (Math.random() - 0.5) * 80;

        // Density protection: If in the left biography zone on desktop, shift or thin out
        if (window.innerWidth >= 1024 && x > -190 && x < -10 && y > -90 && y < 90) {
          // Push 75% of them out toward the right or edges
          if (Math.random() < 0.75) {
            x += 180 + Math.random() * 60;
          }
        }
      }

      basePositions[i3] = x;
      basePositions[i3 + 1] = y;
      basePositions[i3 + 2] = z;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      velocities[i3] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 0;

      let col = pickColor();
      // Density & contrast protection: If in left biography zone on desktop, keep very low contrast
      if (window.innerWidth >= 1024 && x > -200 && x < -10 && y > -100 && y < 100) {
        col = { r: 0.76, g: 0.75, b: 0.80 }; // Soft, low-contrast subtle dust
      }
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;

      // Particle size variation
      sizes[i] = (Math.random() * 2.8 + 2.2) * (isMobile ? 0.75 : 1.0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Points Material using normal alpha blending for light background
    const material = new THREE.PointsMaterial({
      size: isMobile ? 3.8 : 4.6,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Interactive pointer & fluid tracking
    // All coordinates in 3D world plane at z=0
    const mouse = {
      worldX: 0,
      worldY: 0,
      prevWorldX: 0,
      prevWorldY: 0,
      velX: 0,
      velY: 0,
      isActive: false,
      normX: 0,
      normY: 0,
      lastMoved: 0,
    };

    function updatePointerWorld(clientX: number, clientY: number) {
      const normX = (clientX / window.innerWidth) * 2 - 1;
      const normY = -(clientY / window.innerHeight) * 2 + 1;
      mouse.normX = normX;
      mouse.normY = normY;

      // Unproject to z=0 plane in 3D space
      const tanHalfFov = Math.tan((camera.fov * Math.PI) / 360);
      const aspectCurrent = window.innerWidth / window.innerHeight;
      const curWorldX = normX * camera.position.z * tanHalfFov * aspectCurrent;
      const curWorldY = normY * camera.position.z * tanHalfFov;

      if (!mouse.isActive) {
        mouse.prevWorldX = curWorldX;
        mouse.prevWorldY = curWorldY;
        mouse.worldX = curWorldX;
        mouse.worldY = curWorldY;
        mouse.isActive = true;
        mouse.velX = 0;
        mouse.velY = 0;
      } else {
        mouse.velX = curWorldX - mouse.worldX;
        mouse.velY = curWorldY - mouse.worldY;
        mouse.prevWorldX = mouse.worldX;
        mouse.prevWorldY = mouse.worldY;
        mouse.worldX = curWorldX;
        mouse.worldY = curWorldY;
      }
      mouse.lastMoved = performance.now();
    }

    // Passive, non-blocking pointer events
    const handlePointerMove = (e: PointerEvent) => {
      updatePointerWorld(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        updatePointerWorld(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handlePointerLeave = () => {
      mouse.isActive = false;
      mouse.velX = 0;
      mouse.velY = 0;
    };

    if (!prefersReducedMotion) {
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('touchmove', handleTouchMove, { passive: true });
      window.addEventListener('pointerleave', handlePointerLeave, { passive: true });
    }

    // Resize handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation & Fluid Simulation Loop
    let animationFrameId = 0;
    let lastTime = performance.now();
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Render single frame for reduced motion
    if (prefersReducedMotion) {
      renderer.render(scene, camera);
      return () => {
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        geometry.dispose();
        material.dispose();
        particleTexture.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
        if (domElement.parentNode) {
          domElement.parentNode.removeChild(domElement);
        }
      };
    }

    // Fluid dynamics constants
    const FLUID_RADIUS = isMobile ? 65 : 85; // Interaction influence radius in world units
    const SPRING_K = 3.2; // Restoring spring force coefficient
    const DAMPING = 0.92; // Damping per 1/60s frame (settles in 1.2-1.8s)

    const animate = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isTabVisible) return;

      const elapsedMs = currentTime - lastTime;
      lastTime = currentTime;
      // Cap delta time to prevent explosion after tab backgrounding
      const dt = Math.min(elapsedMs / 1000, 0.05);
      const time = currentTime * 0.001;

      // Damp mouse velocity if inactive
      const timeSinceMoved = currentTime - mouse.lastMoved;
      if (timeSinceMoved > 80) {
        mouse.velX *= 0.85;
        mouse.velY *= 0.85;
      }

      const mouseVx = mouse.velX;
      const mouseVy = mouse.velY;
      const mouseSpeed = Math.sqrt(mouseVx * mouseVx + mouseVy * mouseVy);
      const hasPointerMotion = mouse.isActive && (mouseSpeed > 0.05 || timeSinceMoved < 1500);

      // Subtle camera parallax drift
      const targetCamX = mouse.normX * 9;
      const targetCamY = mouse.normY * 6;
      camera.position.x += (targetCamX - camera.position.x) * 0.025;
      camera.position.y += (targetCamY - camera.position.y) * 0.025;
      camera.lookAt(0, 0, 0);

      // Update particle physics
      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const posArray = posAttr.array as Float32Array;
      const dampStep = Math.pow(DAMPING, dt * 60);

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const phase = phases[i];

        // Gentle ambient undulating breathing movement
        const ambientX = Math.sin(time * 0.35 + phase) * 3.2 + Math.cos(time * 0.2 + phase * 2.0) * 1.8;
        const ambientY = Math.cos(time * 0.3 + phase * 1.4) * 2.8;
        const ambientZ = Math.sin(time * 0.25 + phase * 0.8) * 3.5;

        const homeX = basePositions[i3] + ambientX;
        const homeY = basePositions[i3 + 1] + ambientY;
        const homeZ = basePositions[i3 + 2] + ambientZ;

        let px = posArray[i3];
        let py = posArray[i3 + 1];
        let pz = posArray[i3 + 2];

        let vx = velocities[i3];
        let vy = velocities[i3 + 1];
        let vz = velocities[i3 + 2];

        // Cursor fluid disturbance
        if (hasPointerMotion) {
          const dx = px - mouse.worldX;
          const dy = py - mouse.worldY;
          const distSq = dx * dx + dy * dy;

          if (distSq < FLUID_RADIUS * FLUID_RADIUS) {
            const dist = Math.sqrt(distSq) + 0.001;
            const normDist = dist / FLUID_RADIUS;
            // Smooth quadratic falloff
            const w = (1 - normDist) * (1 - normDist);

            // 1. Flowing trail drag along mouse motion vector
            const dragForce = 0.35;
            vx += mouseVx * w * dragForce;
            vy += mouseVy * w * dragForce;

            // 2. Fluid curl / rotational vortex wake
            const swirlStrength = 0.22;
            const nx = -dy / dist;
            const ny = dx / dist;
            const dot = mouseVx * nx + mouseVy * ny;
            vx += nx * dot * w * swirlStrength;
            vy += ny * dot * w * swirlStrength;

            // 3. Gentle radial outward pressure
            const pushMag = Math.min(mouseSpeed, 35) * 0.08 + 0.6;
            vx += (dx / dist) * w * pushMag;
            vy += (dy / dist) * w * pushMag;

            // 4. Subtle 3D depth turbulence
            vz += Math.sin(phase + time * 3) * w * 1.5;
          }
        }

        // Restoring spring force pulling particle back to home
        const springFx = (homeX - px) * SPRING_K;
        const springFy = (homeY - py) * SPRING_K;
        const springFz = (homeZ - pz) * SPRING_K;

        vx += springFx * dt;
        vy += springFy * dt;
        vz += springFz * dt;

        // Damping velocity
        vx *= dampStep;
        vy *= dampStep;
        vz *= dampStep;

        // Integrate position
        px += vx * dt * 45;
        py += vy * dt * 45;
        pz += vz * dt * 45;

        // Store back
        velocities[i3] = vx;
        velocities[i3 + 1] = vy;
        velocities[i3 + 2] = vz;

        posArray[i3] = px;
        posArray[i3 + 1] = py;
        posArray[i3 + 2] = pz;
      }

      posAttr.needsUpdate = true;
      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // Comprehensive Resource Disposal on Unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      geometry.dispose();
      material.dispose();
      particleTexture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (domElement.parentNode) {
        domElement.parentNode.removeChild(domElement);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <canvas
        ref={fallbackRef}
        className="w-full h-full hidden"
        aria-hidden="true"
      />
    </div>
  );
};
