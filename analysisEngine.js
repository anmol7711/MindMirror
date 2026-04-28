/* ============================================
   MindMirror — analysisEngine.js
   Simulated AI text analysis with sentiment,
   keyword detection, and categorization
============================================ */

const AnalysisEngine = (() => {

  // ——— Keyword dictionaries ———
  const KEYWORDS = {
    stress: [
      'anxious','anxiety','stressed','stress','worried','worry','overwhelmed',
      'deadline','pressure','panic','nervous','fear','scared','exhausted',
      'burnout','tired','frustrated','angry','upset','tense','dread','dreadful',
      'hate','struggling','struggle','difficult','hard','too much','can\'t',
      'cannot','fail','failure','lost','hopeless','worthless','afraid','terrified',
      'nightmare','disaster','crisis','problem','issue','stuck','trapped'
    ],
    positive: [
      'happy','happiness','excited','exciting','joy','joyful','love','loving',
      'grateful','gratitude','amazing','wonderful','great','fantastic','awesome',
      'proud','pride','hopeful','hope','optimistic','inspired','motivation',
      'motivated','blessed','thankful','peaceful','calm','content','satisfied',
      'accomplished','success','winning','thrilled','elated','ecstatic','delight',
      'delighted','euphoric','radiant','vibrant','energized','passionate'
    ],
    goals: [
      'goal','goals','plan','planning','future','dream','dreams','achieve',
      'achievement','ambition','ambitious','want to','need to','going to',
      'will','build','create','start','begin','launch','grow','improve',
      'learn','study','practice','work on','project','career','business',
      'relationship','health','fitness','travel','save','invest','change',
      'transform','become','vision','mission','purpose','why','progress'
    ],
    negative: [
      'sad','sadness','depressed','depression','lonely','alone','grief','loss',
      'regret','regrets','miss','missing','hurt','pain','broken','empty',
      'numb','disappointed','disappointment','shame','guilty','guilt','betrayed',
      'abandoned','rejected','unloved','worthless','meaningless','pointless',
      'dark','darkness','void','hollow','ache','crying','tears','sorrow'
    ]
  };

  // ——— Insight generators ———
  const INSIGHTS = {
    stress: [
      'This thought carries tension. What specific part feels most urgent?',
      'Stress often points to something we deeply care about.',
      'Breaking this into smaller pieces might reduce the weight.',
      'Is this anxiety about what *is* or what *might* be?',
      'What would it feel like if this resolved perfectly?'
    ],
    positive: [
      'Notice this joy — it reveals what truly matters to you.',
      'Positive energy is a signal, not just a feeling. What does it point to?',
      'This brightness in your mind is worth amplifying.',
      'What created this feeling, and can you invite more of it?',
      'Your nervous system recognizes safety here. Honor it.'
    ],
    goals: [
      'This ambition is your compass, not your burden.',
      'What's the smallest possible first step toward this?',
      'Goals held in mind start attracting what\'s needed.',
      'Who would you be if this were already achieved?',
      'The gap between here and there is just a series of small choices.'
    ],
    negative: [
      'Pain this specific means something real is being processed.',
      'Difficult emotions aren\'t obstacles — they\'re information.',
      'What does this feeling need you to acknowledge?',
      'Even the darkest thoughts are just thoughts — not truths.',
      'Sitting with discomfort, even briefly, is a form of courage.'
    ],
    neutral: [
      'Neutral thought space is where clarity often arrives.',
      'Not everything needs a category — some thoughts just exist.',
      'This observation reveals how your mind organizes the world.',
      'What connection might this have to something deeper?',
      'Curiosity about your own thoughts is a superpower.'
    ]
  };

  const REFLECTIONS = {
    stress: [
      'Why do you feel stressed about this specifically?',
      'Is this situation within your control?',
      'What is the worst realistic outcome, and could you survive it?',
      'Who in your life could share this weight with you?',
      'What would you tell a close friend feeling this way?'
    ],
    positive: [
      'What created this feeling of positivity?',
      'How can you protect and nurture this energy?',
      'Who else benefits when you feel this way?',
      'What does this moment reveal about your values?',
      'How might you carry this feeling into tomorrow?'
    ],
    goals: [
      'What would achieving this mean about who you are?',
      'What belief is stopping you from starting today?',
      'In 5 years, will this goal still matter to you?',
      'What are you willing to sacrifice to make this happen?',
      'Is this truly your goal, or someone else\'s vision for you?'
    ],
    negative: [
      'What is this feeling trying to protect you from?',
      'When did you last feel the opposite of this?',
      'What would you need to believe differently to feel lighter?',
      'What small act of self-kindness can you offer yourself now?',
      'Is this a permanent state or a passing weather pattern?'
    ],
    neutral: [
      'What is your mind gravitating toward today?',
      'What would you explore if you had no limitations?',
      'What question do you wish someone would ask you right now?',
      'What does your body know that your mind doesn\'t?',
      'If today had a theme, what would it be?'
    ]
  };

  const PHILOSOPHICAL_PROMPTS = [
    'What version of yourself would you want to meet in ten years?',
    'Which of your beliefs have you never actually examined?',
    'If your thoughts were visible to others, what would surprise them?',
    'What are you avoiding by staying busy?',
    'What has silence been trying to tell you lately?',
    'Which emotion do you trust least, and why?',
    'What would you do if success was guaranteed?',
    'Who were you before the world told you who to be?',
    'What does your future self most need you to do today?',
    'If your life was a story, what chapter are you in?',
    'What small truth have you been ignoring?',
    'What would wholeness feel like for you right now?',
    'Which of your habits are speaking louder than your words?',
    'What are you ready to let go of, even though it\'s comfortable?',
    'What does your ideal ordinary Tuesday look like?'
  ];

  const MOOD_HEADLINES = {
    stress:   ['Mind Under Pressure', 'Tension Detected', 'High-Alert State', 'Carrying Weight'],
    positive: ['Radiant Headspace', 'Bright Inner World', 'Flourishing State', 'Light Within'],
    goals:    ['Forward-Focused Mind', 'Visionary State', 'Ambition in Motion', 'Builder\'s Mind'],
    negative: ['Processing Depth', 'Inner Turbulence', 'Heavy Weather', 'Tender Space'],
    neutral:  ['Clear Observation', 'Curious Mind', 'Open Field', 'Floating State'],
    mixed:    ['Complex Landscape', 'Multidimensional Mind', 'Rich Inner World', 'Layered State']
  };

  // ——— Core analysis function ———
  function analyze(text) {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    const scores = { stress: 0, positive: 0, goals: 0, negative: 0, neutral: 0 };

    // Count keyword hits
    for (const [cat, kws] of Object.entries(KEYWORDS)) {
      for (const kw of kws) {
        if (lower.includes(kw)) {
          scores[cat] += kw.split(' ').length > 1 ? 3 : 1;
        }
      }
    }

    // Detect question marks (curiosity/neutral boost)
    const questionCount = (text.match(/\?/g) || []).length;
    scores.neutral += questionCount;

    // Exclamation intensity boost
    const exclCount = (text.match(/!/g) || []).length;
    if (scores.positive > scores.stress) scores.positive += exclCount;
    else scores.stress += exclCount;

    // Uppercase words → stress indicator
    const capsWords = (text.match(/\b[A-Z]{2,}\b/g) || []).length;
    scores.stress += capsWords;

    // Word count baseline neutral
    scores.neutral += Math.max(0, Math.floor(words.length / 15));

    // Normalize total to percentages
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    const pct = {};
    for (const [k, v] of Object.entries(scores)) {
      pct[k] = Math.round((v / total) * 100);
    }

    // Ensure sum = 100
    const sum = Object.values(pct).reduce((a, b) => a + b, 0);
    pct.neutral += (100 - sum);

    // Dominant category
    const dominant = Object.entries(pct).reduce((a, b) => b[1] > a[1] ? b : a)[0];

    // Mind health score (0–100)
    const healthScore = Math.min(100, Math.max(10,
      50 + (pct.positive * 0.4) + (pct.goals * 0.3) - (pct.stress * 0.4) - (pct.negative * 0.5) + (pct.neutral * 0.1)
    ));

    // Extract thought fragments as nodes
    const fragments = extractFragments(text, sentences);

    // Pick mood based on scores
    let moodKey = dominant;
    if (pct.stress > 30 && pct.positive > 25) moodKey = 'mixed';

    return {
      text,
      scores: pct,
      dominant,
      moodKey,
      healthScore: Math.round(healthScore),
      fragments,
      headline: randomFrom(MOOD_HEADLINES[moodKey] || MOOD_HEADLINES.neutral),
      reflections: pickReflections(dominant, 3),
      timestamp: Date.now()
    };
  }

  function extractFragments(text, sentences) {
    const fragments = [];
    const lower = text.toLowerCase();

    // Add sentence-based nodes
    sentences.forEach((sentence, i) => {
      if (sentence.trim().length < 3) return;
      const sentLower = sentence.toLowerCase();
      let cat = 'neutral';
      let maxScore = 0;

      for (const [c, kws] of Object.entries(KEYWORDS)) {
        let score = 0;
        for (const kw of kws) {
          if (sentLower.includes(kw)) score++;
        }
        if (score > maxScore) { maxScore = score; cat = c; }
      }

      fragments.push({
        id: `node-${i}-${Date.now()}`,
        text: sentence.trim().slice(0, 80),
        category: cat,
        insight: randomFrom(INSIGHTS[cat]),
        size: 0.7 + Math.min(sentence.trim().length / 100, 0.5)
      });
    });

    // Add keyword-extracted concept nodes
    for (const [cat, kws] of Object.entries(KEYWORDS)) {
      const found = kws.filter(kw => lower.includes(kw));
      found.slice(0, 3).forEach((kw, i) => {
        if (fragments.length < 20) {
          fragments.push({
            id: `kw-${cat}-${i}-${Date.now()}`,
            text: kw,
            category: cat,
            insight: randomFrom(INSIGHTS[cat]),
            size: 0.4 + Math.random() * 0.3,
            isKeyword: true
          });
        }
      });
    }

    // Limit to 20 nodes
    return fragments.slice(0, 20);
  }

  function pickReflections(cat, count) {
    const pool = [...(REFLECTIONS[cat] || REFLECTIONS.neutral)];
    const picks = [];
    while (picks.length < count && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      picks.push(pool.splice(idx, 1)[0]);
    }
    return picks;
  }

  function randomPhilosophical() {
    return randomFrom(PHILOSOPHICAL_PROMPTS);
  }

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ——— Color map ———
  const COLORS = {
    stress:   { base: '#f06292', glow: 'rgba(240,98,146,0.5)',   dark: '#ad1457' },
    positive: { base: '#69f0ae', glow: 'rgba(105,240,174,0.5)',  dark: '#00695c' },
    goals:    { base: '#40c4ff', glow: 'rgba(64,196,255,0.5)',   dark: '#0277bd' },
    negative: { base: '#ef5350', glow: 'rgba(239,83,80,0.5)',    dark: '#b71c1c' },
    neutral:  { base: '#ffd54f', glow: 'rgba(255,213,79,0.5)',   dark: '#f57f17' }
  };

  return { analyze, randomPhilosophical, COLORS };
})();
