/* ============================================
   MindMirror — visualization.js
   Canvas-based neural brain visualization
   with floating nodes, connections, animations
============================================ */

const Visualization = (() => {

  let canvas, ctx, W, H;
  let nodes = [], connections = [];
  let animFrame;
  let deepMode = false;
  let hoveredNode = null;
  let currentResult = null;

  // ——— Init ———
  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onCanvasClick);
    canvas.addEventListener('mouseleave', () => {
      hoveredNode = null;
      UIController.hideTooltip();
    });
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width  = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.scale(devicePixelRatio, devicePixelRatio);
    W = rect.width;
    H = rect.height;

    // Reposition nodes after resize
    nodes.forEach(n => {
      n.x = Math.max(n.r, Math.min(W - n.r, n.x));
      n.y = Math.max(n.r, Math.min(H - n.r, n.y));
    });
  }

  // ——— Build from analysis result ———
  function build(result) {
    currentResult = result;
    nodes = [];
    connections = [];
    if (animFrame) cancelAnimationFrame(animFrame);

    const fragments = result.fragments;
    const cx = W / 2, cy = H / 2;

    fragments.forEach((frag, i) => {
      const angle = (i / fragments.length) * Math.PI * 2 - Math.PI / 2;
      const dist  = 80 + Math.random() * Math.min(W, H) * 0.25;
      const col   = AnalysisEngine.COLORS[frag.category];

      nodes.push({
        id: frag.id,
        text: frag.text,
        category: frag.category,
        insight: frag.insight,
        isKeyword: frag.isKeyword || false,
        color: col.base,
        glow:  col.glow,
        // Physics
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r:  (frag.size || 0.6) * 28,
        // Animation
        scale: 0, targetScale: 1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.02,
        spawnDelay: i * 80,
        born: Date.now()
      });
    });

    // Build connections (nearby nodes)
    buildConnections();

    // Start loop
    loop();
  }

  function buildConnections() {
    connections = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          connections.push({ a, b, opacity: 0, targetOpacity: 0.3 + Math.random() * 0.2, born: Date.now() + Math.random() * 500 });
        }
      }
    }
  }

  // ——— Deep mode: add more nodes ———
  function enableDeep() {
    deepMode = true;
    const deepInsights = [
      'subconscious pattern', 'hidden belief', 'core memory', 'shadow thought',
      'suppressed desire', 'inner voice', 'somatic echo', 'implicit bias',
      'childhood echo', 'future self', 'fear beneath fear', 'unexpressed need'
    ];

    const cx = W / 2, cy = H / 2;
    const cats = ['stress','positive','goals','negative','neutral'];

    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 40 + Math.random() * Math.min(W, H) * 0.35;
      const cat   = cats[Math.floor(Math.random() * cats.length)];
      const col   = AnalysisEngine.COLORS[cat];
      const label = deepInsights[Math.floor(Math.random() * deepInsights.length)];

      nodes.push({
        id: `deep-${i}-${Date.now()}`,
        text: label,
        category: cat,
        insight: 'A deeper layer of your mind — patterns that operate beneath conscious awareness.',
        isKeyword: true,
        color: col.base,
        glow: col.glow,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: 14 + Math.random() * 14,
        scale: 0, targetScale: 1,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.025 + Math.random() * 0.025,
        spawnDelay: i * 120,
        born: Date.now(),
        isDeep: true
      });
    }

    buildConnections();
  }

  function disableDeep() {
    deepMode = false;
    nodes = nodes.filter(n => !n.isDeep);
    buildConnections();
  }

  // ——— Main loop ———
  function loop() {
    ctx.clearRect(0, 0, W, H);

    const now = Date.now();

    // Draw connections
    drawConnections(now);

    // Draw central cluster glow
    drawCenterGlow();

    // Update & draw nodes
    nodes.forEach(n => updateNode(n, now));
    nodes.forEach(n => drawNode(n));

    animFrame = requestAnimationFrame(loop);
  }

  function drawConnections(now) {
    connections.forEach(conn => {
      if (now < conn.born) return;

      // Fade in
      if (conn.opacity < conn.targetOpacity) {
        conn.opacity = Math.min(conn.targetOpacity, conn.opacity + 0.004);
      }

      const ax = conn.a.x, ay = conn.a.y;
      const bx = conn.b.x, by = conn.b.y;

      const grad = ctx.createLinearGradient(ax, ay, bx, by);
      grad.addColorStop(0, conn.a.color + hexAlpha(conn.opacity * conn.a.scale));
      grad.addColorStop(1, conn.b.color + hexAlpha(conn.opacity * conn.b.scale));

      ctx.beginPath();
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.8;
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Animated pulse dot along connection
      const t = (now % 3000) / 3000;
      const px = ax + (bx - ax) * t;
      const py = ay + (by - ay) * t;
      ctx.beginPath();
      ctx.fillStyle = conn.a.color + '60';
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawCenterGlow() {
    if (!currentResult) return;
    const col = AnalysisEngine.COLORS[currentResult.dominant];
    const cx = W / 2, cy = H / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 120);
    grad.addColorStop(0, col.glow);
    grad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(cx, cy, 120, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateNode(n, now) {
    // Spawn delay
    if (now < n.born + n.spawnDelay) return;

    // Scale in
    if (n.scale < n.targetScale) {
      n.scale = Math.min(n.targetScale, n.scale + 0.04);
    }

    // Float physics
    n.pulse += n.pulseSpeed;
    n.x += n.vx + Math.sin(n.pulse * 0.7) * 0.15;
    n.y += n.vy + Math.cos(n.pulse * 0.9) * 0.12;

    // Gentle center attraction
    const cx = W / 2, cy = H / 2;
    const dx = cx - n.x, dy = cy - n.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 20) {
      n.vx += (dx / dist) * 0.015;
      n.vy += (dy / dist) * 0.015;
    }

    // Damping
    n.vx *= 0.97;
    n.vy *= 0.97;

    // Bounce off edges
    const pad = n.r + 20;
    if (n.x < pad) { n.vx += 0.3; }
    if (n.x > W - pad) { n.vx -= 0.3; }
    if (n.y < pad + 60) { n.vy += 0.3; }
    if (n.y > H - pad) { n.vy -= 0.3; }

    // Node repulsion
    nodes.forEach(other => {
      if (other === n) return;
      const ox = n.x - other.x, oy = n.y - other.y;
      const d = Math.sqrt(ox * ox + oy * oy);
      const minD = n.r + other.r + 10;
      if (d < minD && d > 0) {
        const force = (minD - d) / minD * 0.5;
        n.vx += (ox / d) * force;
        n.vy += (oy / d) * force;
      }
    });
  }

  function drawNode(n) {
    if (n.scale < 0.01) return;

    const now = Date.now();
    if (now < n.born + n.spawnDelay) return;

    ctx.save();
    ctx.translate(n.x, n.y);

    const isHovered = hoveredNode === n;
    const scl = n.scale * (isHovered ? 1.12 : 1);
    const pulseR = n.r * scl * (1 + Math.sin(n.pulse) * 0.06);

    // Outer glow
    const glowSize = pulseR * (isHovered ? 2.2 : 1.6);
    const gGlow = ctx.createRadialGradient(0, 0, pulseR * 0.5, 0, 0, glowSize);
    gGlow.addColorStop(0, n.glow);
    gGlow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.fillStyle = gGlow;
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // Node body
    const gBody = ctx.createRadialGradient(-pulseR * 0.3, -pulseR * 0.3, 0, 0, 0, pulseR);
    gBody.addColorStop(0, lighten(n.color, 0.3));
    gBody.addColorStop(1, n.color);
    ctx.beginPath();
    ctx.fillStyle = gBody;
    ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
    ctx.fill();

    // Border ring
    ctx.beginPath();
    ctx.strokeStyle = isHovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = isHovered ? 2 : 1;
    ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner dot for keywords
    if (n.isKeyword && pulseR < 20) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Label for larger nodes
    if (pulseR > 18 && !n.isKeyword) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `${Math.max(9, Math.min(12, pulseR * 0.4))}px 'DM Sans', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const maxW = pulseR * 1.6;
      const shortText = n.text.length > 20 ? n.text.slice(0, 18) + '…' : n.text;
      ctx.fillText(shortText, 0, 0, maxW);
    }

    ctx.restore();
  }

  // ——— Mouse interaction ———
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    hoveredNode = null;
    for (const n of nodes) {
      const dx = mx - n.x, dy = my - n.y;
      if (Math.sqrt(dx*dx + dy*dy) < n.r * n.scale * 1.2) {
        hoveredNode = n;
        break;
      }
    }

    if (hoveredNode) {
      canvas.style.cursor = 'pointer';
      UIController.showTooltip(hoveredNode.text, e.clientX, e.clientY);
    } else {
      canvas.style.cursor = 'crosshair';
      UIController.hideTooltip();
    }
  }

  function onCanvasClick(e) {
    if (hoveredNode) {
      UIController.showNodeDetail(hoveredNode);
    }
  }

  // ——— Export ———
  function exportImage() {
    const link = document.createElement('a');
    link.download = 'mindmirror-map.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // ——— Particle canvas for input screen ———
  function initParticles() {
    const pc = document.getElementById('particle-canvas');
    const pCtx = pc.getContext('2d');
    const particles = [];
    let mouseX = -1000, mouseY = -1000;

    function resizeParticle() {
      pc.width  = window.innerWidth  * devicePixelRatio;
      pc.height = window.innerHeight * devicePixelRatio;
      pc.style.width  = window.innerWidth + 'px';
      pc.style.height = window.innerHeight + 'px';
      pCtx.scale(devicePixelRatio, devicePixelRatio);
    }

    resizeParticle();
    window.addEventListener('resize', resizeParticle);

    // Spawn subtle particles
    for (let i = 0; i < 60; i++) {
      particles.push(spawnParticle(window.innerWidth, window.innerHeight, true));
    }

    function spawnParticle(W, H, random) {
      return {
        x: random ? Math.random() * W : mouseX + (Math.random() - 0.5) * 80,
        y: random ? Math.random() * H : mouseY + (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.2 + Math.random() * 0.4),
        r: 1 + Math.random() * 2,
        opacity: 0.1 + Math.random() * 0.3,
        life: 1, decay: 0.002 + Math.random() * 0.003,
        color: ['#7b8cff','#4fc3f7','#69f0ae','#ffd54f'][Math.floor(Math.random() * 4)]
      };
    }

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX; mouseY = e.clientY;
    });

    let typing = false;
    document.getElementById('thought-input').addEventListener('input', () => {
      typing = true;
      setTimeout(() => typing = false, 100);
    });

    function particleLoop() {
      const W = window.innerWidth, H = window.innerHeight;
      pCtx.clearRect(0, 0, W, H);

      // Spawn from mouse occasionally
      if (Math.random() < 0.15 || typing) {
        particles.push(spawnParticle(W, H, false));
      }

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.opacity = p.life * 0.3;

        if (p.life <= 0) {
          particles[i] = spawnParticle(W, H, true);
          return;
        }

        pCtx.beginPath();
        pCtx.fillStyle = p.color;
        pCtx.globalAlpha = p.opacity;
        pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pCtx.fill();
        pCtx.globalAlpha = 1;
      });

      requestAnimationFrame(particleLoop);
    }

    particleLoop();
  }

  // ——— Helpers ———
  function hexAlpha(opacity) {
    return Math.round(Math.max(0, Math.min(255, opacity * 255))).toString(16).padStart(2, '0');
  }

  function lighten(hex, amount) {
    const num = parseInt(hex.slice(1), 16);
    let r = Math.min(255, (num >> 16) + Math.round(amount * 255));
    let g = Math.min(255, ((num >> 8) & 0xff) + Math.round(amount * 255));
    let b = Math.min(255, (num & 0xff) + Math.round(amount * 255));
    return `rgb(${r},${g},${b})`;
  }

  function stop() {
    if (animFrame) cancelAnimationFrame(animFrame);
  }

  return { init, build, stop, exportImage, initParticles, enableDeep, disableDeep };
})();
