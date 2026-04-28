/* ============================================
   MindMirror — uiController.js
   Manages screens, state, interactions,
   sound, timeline, and all UI transitions
============================================ */

const UIController = (() => {

  // ——— State ———
  let history = JSON.parse(localStorage.getItem('mm_history') || '[]');
  let currentResult = null;
  let soundEnabled = false;
  let audioCtx = null;
  let deepModeOn = false;
  let typingTimer = null;
  let pulseTimeout = null;

  // ——— DOM refs ———
  const $  = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  const els = {};

  // ——— Boot ———
  function init() {
    // Gather DOM
    els.screenInput  = $('screen-input');
    els.screenViz    = $('screen-viz');
    els.input        = $('thought-input');
    els.charCount    = $('char-count');
    els.typingInd    = $('typing-indicator');
    els.btnAnalyze   = $('btn-analyze');
    els.btnBack      = $('btn-back');
    els.btnDeep      = $('btn-deep');
    els.btnTheme     = $('btn-theme');
    els.btnSound     = $('btn-sound');
    els.btnExport    = $('btn-export');
    els.btnReflect   = $('btn-random-reflect');
    els.brainCanvas  = $('brain-canvas');
    els.tooltip      = $('node-tooltip');
    els.nodeDetail   = $('node-detail');
    els.nodeDetailTag  = $('node-detail-tag');
    els.nodeDetailText = $('node-detail-text');
    els.nodeDetailInsight = $('node-detail-insight');
    els.closeDetail  = $('close-detail');
    els.pulseOverlay = $('pulse-overlay');
    els.ringFill     = $('ring-fill');
    els.scoreNumber  = $('score-number');
    els.moodHeadline = $('mood-headline');
    els.moodSub      = $('mood-sub');
    els.emotionBars  = $('emotion-bars');
    els.reflections  = $('reflections');
    els.timelineSection = $('timeline-section');
    els.timelineBubbles = $('timeline-bubbles');

    // Inject SVG gradient defs
    injectSVGDefs();

    // Init canvas visualization
    Visualization.init(els.brainCanvas);
    Visualization.initParticles();

    // Events
    els.input.addEventListener('input', onInputChange);
    els.btnAnalyze.addEventListener('click', onAnalyze);
    els.btnBack.addEventListener('click', goToInput);
    els.btnDeep.addEventListener('click', toggleDeep);
    els.btnTheme.addEventListener('click', toggleTheme);
    els.btnSound.addEventListener('click', toggleSound);
    els.btnExport.addEventListener('click', () => Visualization.exportImage());
    els.btnReflect.addEventListener('click', generateRandomReflect);
    els.closeDetail.addEventListener('click', () => els.nodeDetail.classList.add('hidden'));

    // Load history
    renderTimeline();

    // Keyboard shortcut: Enter to analyze
    els.input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.metaKey) onAnalyze();
    });
  }

  // ——— Input handling ———
  function onInputChange() {
    const val = els.input.value;
    els.charCount.textContent = `${val.length} / 2000`;
    els.btnAnalyze.disabled = val.trim().length < 5;

    // Typing indicator
    els.typingInd.classList.add('active');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      els.typingInd.classList.remove('active');
    }, 1000);
  }

  // ——— Analyze ———
  async function onAnalyze() {
    const text = els.input.value.trim();
    if (text.length < 5) return;

    // Loading state
    els.btnAnalyze.classList.add('loading');
    els.btnAnalyze.disabled = true;

    // Simulate processing delay
    await delay(900);

    currentResult = AnalysisEngine.analyze(text);

    // Save to history
    history.unshift(currentResult);
    if (history.length > 10) history = history.slice(0, 10);
    localStorage.setItem('mm_history', JSON.stringify(history));

    // Transition to viz screen
    await transitionToViz(currentResult);

    els.btnAnalyze.classList.remove('loading');
    els.btnAnalyze.disabled = false;
  }

  async function transitionToViz(result) {
    // Show viz screen
    els.screenInput.classList.remove('active');
    await delay(100);
    els.screenViz.classList.add('active');
    els.btnExport.style.display = 'flex';

    // Set mood theme
    setMood(result.moodKey);

    // Build brain visualization
    Visualization.build(result);

    // Populate insight panel
    await delay(300);
    populateInsightPanel(result);

    // Trigger emotion pulse
    triggerEmotionPulse(result.dominant);

    // Render timeline
    renderTimeline();
  }

  function goToInput() {
    Visualization.stop();
    deepModeOn = false;
    els.btnDeep.classList.remove('active');
    els.screenViz.classList.remove('active');
    els.btnExport.style.display = 'none';

    setTimeout(() => {
      els.screenInput.classList.add('active');
    }, 100);
  }

  // ——— Insight Panel ———
  function populateInsightPanel(result) {
    // Animate score ring
    animateScore(result.healthScore);

    // Headline
    els.moodHeadline.textContent = result.headline;

    // Subtitle
    const moodDescs = {
      stress:   'Your mind is carrying weight. These patterns deserve attention.',
      positive: 'A luminous inner state. Your thoughts radiate constructive energy.',
      goals:    'Ambition and forward-thinking dominate your mental landscape.',
      negative: 'Deep feelings are surfacing. This takes courage to acknowledge.',
      neutral:  'A clear, observational state. Your mind is watching and processing.',
      mixed:    'A rich complexity of emotions and ideas coexist in your mind.'
    };
    els.moodSub.textContent = moodDescs[result.moodKey] || moodDescs.neutral;

    // Emotion bars
    els.emotionBars.innerHTML = '';
    const catColors = {
      stress: '#f06292', positive: '#69f0ae',
      goals: '#40c4ff', negative: '#ef5350', neutral: '#ffd54f'
    };

    Object.entries(result.scores)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, pct]) => {
        if (pct === 0) return;
        const item = document.createElement('div');
        item.className = 'emotion-bar-item';
        item.innerHTML = `
          <div class="emotion-bar-label">
            <span>${cat}</span><span>${pct}%</span>
          </div>
          <div class="emotion-bar-track">
            <div class="emotion-bar-fill" style="background:${catColors[cat]}" data-pct="${pct}"></div>
          </div>
        `;
        els.emotionBars.appendChild(item);
      });

    // Animate bars
    setTimeout(() => {
      $$('.emotion-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.pct + '%';
      });
    }, 100);

    // Reflection prompts
    renderReflections(result.reflections);
  }

  function renderReflections(prompts) {
    els.reflections.innerHTML = '';
    prompts.forEach((p, i) => {
      const card = document.createElement('div');
      card.className = 'reflection-card';
      card.textContent = p;
      card.style.animationDelay = `${i * 0.1}s`;
      card.style.opacity = '0';
      els.reflections.appendChild(card);
      // Trigger animation
      setTimeout(() => { card.style.opacity = '1'; }, i * 100);
    });
  }

  function generateRandomReflect() {
    const prompt = AnalysisEngine.randomPhilosophical();
    const card = document.createElement('div');
    card.className = 'reflection-card';
    card.textContent = prompt;
    card.style.borderColor = 'rgba(255,213,79,0.5)';
    card.style.opacity = '0';
    card.style.transform = 'translateY(8px)';
    card.style.transition = 'all 0.4s ease';
    els.reflections.prepend(card);
    setTimeout(() => {
      card.style.opacity = '1';
      card.style.transform = 'translateY(0)';
    }, 10);

    // Remove after 6 seconds
    setTimeout(() => {
      card.style.opacity = '0';
      setTimeout(() => card.remove(), 400);
    }, 6000);
  }

  function animateScore(score) {
    const circumference = 327;
    const offset = circumference - (score / 100) * circumference;

    els.scoreNumber.textContent = '0';
    els.ringFill.style.strokeDashoffset = circumference;

    setTimeout(() => {
      els.ringFill.style.strokeDashoffset = offset;

      // Animate number
      let current = 0;
      const step = score / 60;
      const counter = setInterval(() => {
        current = Math.min(score, current + step);
        els.scoreNumber.textContent = Math.round(current);
        if (current >= score) clearInterval(counter);
      }, 25);
    }, 300);
  }

  // ——— Node Detail ———
  function showNodeDetail(node) {
    const catLabels = {
      stress: '⚡ Stress Thought',
      positive: '✦ Positive Energy',
      goals: '◎ Goal / Intention',
      negative: '● Heavy Feeling',
      neutral: '◇ Neutral Observation'
    };

    els.nodeDetailTag.textContent = catLabels[node.category] || '◇ Thought';
    els.nodeDetailText.textContent = node.text;
    els.nodeDetailInsight.textContent = node.insight;
    els.nodeDetail.classList.remove('hidden');
  }

  function hideTooltip() {
    els.tooltip.classList.remove('visible');
  }

  function showTooltip(text, x, y) {
    els.tooltip.textContent = text;
    els.tooltip.classList.add('visible');
    // Position
    const tw = els.tooltip.offsetWidth;
    const th = els.tooltip.offsetHeight;
    const px = Math.min(window.innerWidth - tw - 10, x + 12);
    const py = Math.max(10, y - th - 10);
    els.tooltip.style.left = px + 'px';
    els.tooltip.style.top  = py + 'px';
  }

  // ——— Mood / Theme ———
  function setMood(moodKey) {
    document.body.className = document.body.className.replace(/mood-\w+/, '');
    document.body.classList.add(`mood-${moodKey}`);

    // Update pulse overlay color
    const pulseColors = {
      stress:   'rgba(240,98,146,0.06)',
      positive: 'rgba(105,240,174,0.06)',
      goals:    'rgba(64,196,255,0.06)',
      negative: 'rgba(239,83,80,0.06)',
      neutral:  'rgba(255,213,79,0.04)',
      mixed:    'rgba(123,140,255,0.05)'
    };
    els.pulseOverlay.style.setProperty('--pulse-color', pulseColors[moodKey] || 'rgba(123,140,255,0.05)');
  }

  function triggerEmotionPulse(dominant) {
    els.pulseOverlay.style.animation = 'none';
    void els.pulseOverlay.offsetWidth; // reflow
    els.pulseOverlay.style.animation = 'emotionPulse 4s ease-in-out infinite';
  }

  function toggleTheme() {
    const current = document.documentElement.dataset.theme || 'dark';
    document.documentElement.dataset.theme = current === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = current === 'dark' ? 'light' : 'dark';
  }

  // ——— Deep Mode ———
  function toggleDeep() {
    deepModeOn = !deepModeOn;
    els.btnDeep.classList.toggle('active', deepModeOn);
    els.btnDeep.textContent = deepModeOn ? '⬡ Exit Deep Mode' : '⬡ Deep Insight';
    if (deepModeOn) {
      Visualization.enableDeep();
    } else {
      Visualization.disableDeep();
    }
  }

  // ——— Timeline ———
  function renderTimeline() {
    if (history.length === 0) {
      els.timelineSection.style.display = 'none';
      return;
    }
    els.timelineSection.style.display = 'block';
    els.timelineBubbles.innerHTML = '';

    history.slice(0, 8).forEach((item, i) => {
      const bubble = document.createElement('button');
      bubble.className = 'timeline-bubble';
      bubble.textContent = item.text.slice(0, 25) + (item.text.length > 25 ? '…' : '');
      bubble.title = item.text.slice(0, 100);

      const d = new Date(item.timestamp);
      bubble.setAttribute('data-time', d.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }));

      bubble.addEventListener('click', () => {
        els.input.value = item.text;
        onInputChange();
        // Reload that result
        currentResult = item;
        transitionToViz(item);
      });

      els.timelineBubbles.appendChild(bubble);
    });
  }

  // ——— Ambient Sound ———
  function toggleSound() {
    if (!soundEnabled) {
      startAmbientSound();
    } else {
      stopAmbientSound();
    }
    soundEnabled = !soundEnabled;
    els.btnSound.classList.toggle('active', soundEnabled);
  }

  function startAmbientSound() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();

    // Generate rain-like white noise with filtering
    const bufferSize = audioCtx.sampleRate * 3;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.5362) * 0.11;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.5;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 2);

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start();

    UIController._soundSource = source;
    UIController._soundGain = gainNode;
  }

  function stopAmbientSound() {
    if (UIController._soundGain) {
      UIController._soundGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    }
    setTimeout(() => {
      if (UIController._soundSource) {
        try { UIController._soundSource.stop(); } catch(e) {}
        UIController._soundSource = null;
      }
    }, 1600);
  }

  // ——— SVG gradient defs ———
  function injectSVGDefs() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'defs-only');
    svg.innerHTML = `
      <defs>
        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7b8cff"/>
          <stop offset="50%" stop-color="#4fc3f7"/>
          <stop offset="100%" stop-color="#69f0ae"/>
        </linearGradient>
      </defs>
    `;
    document.body.appendChild(svg);
  }

  // ——— Utilities ———
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ——— Expose API ———
  return { init, showTooltip, hideTooltip, showNodeDetail };
})();

// ——— Boot ———
document.addEventListener('DOMContentLoaded', () => {
  UIController.init();
});
