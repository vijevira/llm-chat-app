/**
 * Omni Chat - Core Constants, Templates & Configuration
 */

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export const STORAGE_KEY_SESSIONS = 'omni_chat_sessions';
export const STORAGE_KEY_ACTIVE = 'omni_chat_active_session';
export const STORAGE_KEY_SETTINGS = 'omni_chat_settings';
export const STORAGE_KEY_MODEL = 'omni_chat_model';
export const STORAGE_KEY_THEME = 'omni_chat_theme';
export const STORAGE_KEY_PROJECTS = 'omni_chat_custom_projects';
export const STORAGE_KEY_PLUGINS = 'omni_chat_plugins_state';
export const STORAGE_KEY_SANDBOX_APPS = 'omni_chat_sandbox_apps';
export const STORAGE_KEY_SANDBOX_ACTIVE = 'omni_chat_sandbox_active';
export const STORAGE_KEY_TOMBSTONES = 'omni_chat_tombstones';

export const PUTER_FS_ROOT = 'omni_chat_data';
export const PUTER_FS_DELETED_SESSIONS_PATH = 'omni_deleted_sessions.json';
export const PUTER_FS_DELETED_PROJECTS_PATH = 'omni_deleted_projects.json';

export const DEFAULT_SETTINGS = {
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 4096,
  autoTitle: true,
  streamResponse: true,
  soundEffects: false,
  fontSize: 'medium',
  codeTheme: 'github-dark'
};

export const PERSONA_PRESETS = {
  default: 'You are Omni Chat, a brilliant, friendly, and concise assistant. Format responses using clean markdown, bullet points, and code blocks where helpful.',
  coder: 'You are a Principal Software Architect. Provide production-ready, clean, modern code with concise technical explanations. Minimize conversational fluff.',
  researcher: 'You are an Academic AI Researcher. Provide rigorous, in-depth analytical responses with step-by-step reasoning and objective conclusions.',
  concise: 'Provide ultra-concise, direct responses using short bullet points. Skip pleasantries and filler.',
  creative: 'You are an imaginative creative writer and storyteller. Use vivid metaphors, evocative prose, and engaging narrative flow.',
  custom: ''
};

export const STARTER_TEMPLATES = {
  arcade: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Neon Breakout Arcade</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #090a0f; color: #fff; font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    #score-board { margin-bottom: 12px; font-size: 1.15rem; font-weight: bold; color: #00f2fe; }
    canvas { background: #13151f; border: 2px solid #00f2fe; border-radius: 12px; box-shadow: 0 0 25px rgba(0, 242, 254, 0.25); }
    .btn-restart { margin-top: 14px; padding: 7px 18px; background: #00f2fe; color: #000; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div id="score-board">Score: <span id="score">0</span> | Lives: <span id="lives">3</span></div>
  <canvas id="gameCanvas" width="460" height="300"></canvas>
  <button class="btn-restart" onclick="restartGame()">Restart Game</button>
  <script>
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    let ballRadius = 6, x = canvas.width/2, y = canvas.height-30, dx = 2.5, dy = -2.5;
    let paddleHeight = 10, paddleWidth = 75, paddleX = (canvas.width-paddleWidth)/2;
    let rightPressed = false, leftPressed = false, score = 0, lives = 3;
    const brickRowCount = 4, brickColumnCount = 6, brickWidth = 62, brickHeight = 15, brickPadding = 10, brickOffsetTop = 25, brickOffsetLeft = 18;
    let bricks = [];
    function initBricks() {
      bricks = [];
      for(let c=0; c<brickColumnCount; c++) {
        bricks[c] = [];
        for(let r=0; r<brickRowCount; r++) bricks[c][r] = { x: 0, y: 0, status: 1 };
      }
    }
    initBricks();
    document.addEventListener("keydown", (e) => { if(e.key === "Right" || e.key === "ArrowRight") rightPressed = true; else if(e.key === "Left" || e.key === "ArrowLeft") leftPressed = true; });
    document.addEventListener("keyup", (e) => { if(e.key === "Right" || e.key === "ArrowRight") rightPressed = false; else if(e.key === "Left" || e.key === "ArrowLeft") leftPressed = false; });
    function collisionDetection() {
      for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
          let b = bricks[c][r];
          if(b.status === 1) {
            if(x > b.x && x < b.x+brickWidth && y > b.y && y < b.y+brickHeight) {
              dy = -dy; b.status = 0; score++;
              document.getElementById("score").textContent = score;
              if(score === brickRowCount*brickColumnCount) { alert("🎉 YOU WIN!"); restartGame(); }
            }
          }
        }
      }
    }
    function drawBall() { ctx.beginPath(); ctx.arc(x, y, ballRadius, 0, Math.PI*2); ctx.fillStyle = "#ff007f"; ctx.fill(); ctx.closePath(); }
    function drawPaddle() { ctx.beginPath(); ctx.rect(paddleX, canvas.height-paddleHeight-2, paddleWidth, paddleHeight); ctx.fillStyle = "#00f2fe"; ctx.fill(); ctx.closePath(); }
    function drawBricks() {
      const colors = ["#ff007f", "#9d00ff", "#00f2fe", "#00ff87"];
      for(let c=0; c<brickColumnCount; c++) {
        for(let r=0; r<brickRowCount; r++) {
          if(bricks[c][r].status === 1) {
            let brickX = (c*(brickWidth+brickPadding))+brickOffsetLeft;
            let brickY = (r*(brickHeight+brickPadding))+brickOffsetTop;
            bricks[c][r].x = brickX; bricks[c][r].y = brickY;
            ctx.beginPath(); ctx.rect(brickX, brickY, brickWidth, brickHeight);
            ctx.fillStyle = colors[r % colors.length]; ctx.fill(); ctx.closePath();
          }
        }
      }
    }
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBricks(); drawBall(); drawPaddle(); collisionDetection();
      if(x + dx > canvas.width-ballRadius || x + dx < ballRadius) dx = -dx;
      if(y + dy < ballRadius) dy = -dy;
      else if(y + dy > canvas.height-ballRadius-paddleHeight) {
        if(x > paddleX && x < paddleX + paddleWidth) dy = -dy;
        else {
          lives--; document.getElementById("lives").textContent = lives;
          if(!lives) { alert("💥 GAME OVER"); restartGame(); return; }
          else { x = canvas.width/2; y = canvas.height-30; dx = 2.5; dy = -2.5; paddleX = (canvas.width-paddleWidth)/2; }
        }
      }
      if(rightPressed && paddleX < canvas.width-paddleWidth) paddleX += 5;
      else if(leftPressed && paddleX > 0) paddleX -= 5;
      x += dx; y += dy; requestAnimationFrame(draw);
    }
    function restartGame() { score = 0; lives = 3; document.getElementById("score").textContent = "0"; document.getElementById("lives").textContent = "3"; initBricks(); x = canvas.width/2; y = canvas.height-30; dx = 2.5; dy = -2.5; }
    draw();
  </script>
</body>
</html>`,

  dashboard: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Omni Analytics Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-900 text-slate-100 min-h-screen p-6 font-sans">
  <div class="max-w-4xl mx-auto space-y-6">
    <header class="flex justify-between items-center pb-4 border-b border-slate-800">
      <div>
        <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">SaaS Executive Dashboard</h1>
        <p class="text-sm text-slate-400">Live operational overview & conversion metrics</p>
      </div>
      <button onclick="refreshData()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-semibold transition">Refresh Data</button>
    </header>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Monthly Active Users</div>
        <div class="text-2xl font-bold mt-1 text-blue-400" id="stat-users">128,450</div>
        <div class="text-xs text-emerald-400 mt-2">↑ 14.8% from last month</div>
      </div>
      <div class="p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Monthly Recurring Revenue</div>
        <div class="text-2xl font-bold mt-1 text-emerald-400" id="stat-mrr">$48,920</div>
        <div class="text-xs text-emerald-400 mt-2">↑ 22.4% ARR target pace</div>
      </div>
      <div class="p-4 bg-slate-800 border border-slate-700 rounded-xl">
        <div class="text-xs text-slate-400 font-medium">Avg Latency (Edge Workers)</div>
        <div class="text-2xl font-bold mt-1 text-purple-400" id="stat-latency">18ms</div>
        <div class="text-xs text-slate-400 mt-2">Global 99.98% uptime SLA</div>
      </div>
    </div>
    <div class="p-5 bg-slate-800 border border-slate-700 rounded-xl space-y-4">
      <h2 class="text-base font-semibold">Weekly Volume Breakdown</h2>
      <div class="h-32 flex items-end gap-3 pt-4 border-b border-slate-700">
        <div class="flex-1 bg-indigo-500 rounded-t h-[45%] flex items-center justify-center text-xs font-bold">M</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[65%] flex items-center justify-center text-xs font-bold">T</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[80%] flex items-center justify-center text-xs font-bold">W</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[55%] flex items-center justify-center text-xs font-bold">T</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[95%] flex items-center justify-center text-xs font-bold">F</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[40%] flex items-center justify-center text-xs font-bold">S</div>
        <div class="flex-1 bg-indigo-500 rounded-t h-[30%] flex items-center justify-center text-xs font-bold">S</div>
      </div>
    </div>
  </div>
  <script>
    function refreshData() {
      const u = Math.floor(120000 + Math.random() * 20000);
      const m = Math.floor(45000 + Math.random() * 8000);
      document.getElementById('stat-users').textContent = u.toLocaleString();
      document.getElementById('stat-mrr').textContent = '$' + m.toLocaleString();
    }
  </script>
</body>
</html>`,

  kanban: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Minimalist Kanban</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 1.5rem; }
    h1 { font-size: 1.3rem; margin-bottom: 1.25rem; color: #38bdf8; }
    .board { display: flex; gap: 1rem; overflow-x: auto; }
    .column { flex: 1; min-width: 220px; background: #1e293b; border: 1px solid #334155; border-radius: 0.75rem; padding: 1rem; }
    .col-title { font-size: 0.85rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.75rem; color: #94a3b8; }
    .task { background: #334155; padding: 0.75rem; border-radius: 0.5rem; margin-bottom: 0.5rem; font-size: 0.85rem; cursor: pointer; }
    .task:hover { background: #475569; }
    .add-btn { width: 100%; padding: 0.5rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; font-weight: 600; cursor: pointer; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <h1>📋 Agile Kanban Workspace</h1>
  <div class="board">
    <div class="column" id="col-todo">
      <div class="col-title">To Do</div>
      <div class="task" onclick="moveTask(this, 'col-doing')">Implement Search Grounding</div>
      <div class="task" onclick="moveTask(this, 'col-doing')">Add GitHub Sandbox Bridge</div>
      <button class="add-btn" onclick="addTask('col-todo')">+ Add Task</button>
    </div>
    <div class="column" id="col-doing">
      <div class="col-title">In Progress</div>
      <div class="task" onclick="moveTask(this, 'col-done')">Interactive Webapp Sandbox</div>
    </div>
    <div class="column" id="col-done">
      <div class="col-title">Done</div>
      <div class="task">Release notes v1.1.0</div>
    </div>
  </div>
  <script>
    function moveTask(el, targetColId) {
      document.getElementById(targetColId).insertBefore(el, document.getElementById(targetColId).querySelector('.add-btn'));
    }
    function addTask(colId) {
      const text = prompt('Task title:');
      if (!text) return;
      const t = document.createElement('div');
      t.className = 'task';
      t.textContent = text;
      t.onclick = function() { moveTask(this, 'col-doing'); };
      document.getElementById(colId).insertBefore(t, document.getElementById(colId).querySelector('.add-btn'));
    }
  </script>
</body>
</html>`,

  pomodoro: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Focus Pomodoro</title>
  <style>
    body { font-family: sans-serif; background: #111827; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .timer { font-size: 5rem; font-weight: 800; color: #ef4444; font-variant-numeric: tabular-nums; margin-bottom: 1.5rem; }
    .btn-row { display: flex; gap: 0.75rem; }
    button { padding: 0.75rem 1.5rem; border: none; border-radius: 0.75rem; font-size: 1rem; font-weight: bold; cursor: pointer; }
    .btn-start { background: #ef4444; color: white; }
    .btn-reset { background: #374151; color: #d1d5db; }
  </style>
</head>
<body>
  <div class="timer" id="time">25:00</div>
  <div class="btn-row">
    <button class="btn-start" id="btn-toggle" onclick="toggle()">Start Focus</button>
    <button class="btn-reset" onclick="reset()">Reset</button>
  </div>
  <script>
    let sec = 1500, active = false, interval = null;
    function format(s) { const m = Math.floor(s/60); const rem = s%60; return (m<10?'0':'')+m+':'+(rem<10?'0':'')+rem; }
    function toggle() {
      active = !active;
      document.getElementById('btn-toggle').textContent = active ? 'Pause' : 'Start Focus';
      if (active) {
        interval = setInterval(() => {
          if (sec > 0) {
            sec--;
            document.getElementById('time').textContent = format(sec);
          } else {
            clearInterval(interval);
            active = false;
            alert("⏰ Pomodoro Finished! Time for a short break.");
            reset();
          }
        }, 1000);
      } else {
        clearInterval(interval);
      }
    }
    function reset() {
      active = false;
      clearInterval(interval);
      sec = 1500;
      document.getElementById('time').textContent = "25:00";
      document.getElementById('btn-toggle').textContent = "Start Focus";
    }
  </script>
</body>
</html>`,

  markdown: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Markdown Workspace</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
    header { background: #1e293b; padding: 0.75rem 1.25rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
    .title { font-weight: 700; font-size: 1.1rem; color: #38bdf8; display: flex; align-items: center; gap: 0.5rem; }
    .stats { font-size: 0.8rem; color: #94a3b8; }
    .btn-export { background: #0284c7; color: #fff; border: none; padding: 0.4rem 0.85rem; border-radius: 6px; font-weight: 600; font-size: 0.8rem; cursor: pointer; }
    .container { flex: 1; display: grid; grid-template-columns: 1fr 1fr; overflow: hidden; }
    .pane { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .pane-header { background: #1e293b; padding: 0.4rem 0.75rem; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #334155; }
    textarea { flex: 1; background: #0b1120; color: #e2e8f0; border: none; outline: none; padding: 1rem; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 0.9rem; line-height: 1.6; resize: none; border-right: 1px solid #334155; }
    .preview { flex: 1; background: #0f172a; padding: 1.5rem; overflow-y: auto; line-height: 1.6; color: #cbd5e1; }
    .preview h1 { color: #f8fafc; font-size: 1.6rem; margin-bottom: 0.75rem; border-bottom: 1px solid #334155; padding-bottom: 0.4rem; }
    .preview h2 { color: #38bdf8; font-size: 1.3rem; margin: 1.25rem 0 0.5rem 0; }
    .preview p { margin-bottom: 0.85rem; }
    .preview ul { margin-left: 1.5rem; margin-bottom: 0.85rem; }
    .preview code { background: #1e293b; padding: 0.2rem 0.4rem; border-radius: 4px; color: #f43f5e; font-size: 0.85em; }
    .preview pre { background: #1e293b; padding: 1rem; border-radius: 6px; overflow-x: auto; margin-bottom: 0.85rem; }
    .preview blockquote { border-left: 3px solid #38bdf8; padding-left: 0.75rem; color: #94a3b8; font-style: italic; }
  </style>
</head>
<body>
  <header>
    <div class="title"><span>📝</span> Markdown Notes Workspace</div>
    <div style="display: flex; gap: 1rem; align-items: center;">
      <span class="stats" id="stats">0 words • 0 characters</span>
      <button class="btn-export" onclick="downloadMd()">Download .md</button>
    </div>
  </header>
  <div class="container">
    <div class="pane">
      <div class="pane-header">Markdown Input</div>
      <textarea id="editor" placeholder="# Write your thoughts here..."># 🚀 Markdown Notes App

Welcome to your instant, distraction-free markdown note-taking environment.

## Key Features
- **Real-time Live Preview**: Types directly into the preview pane
- **Word & Character Counters**: Automatically tracked in the topbar
- **1-Click Download**: Saves cleanly to your hard drive

### Quick Guide
- Use **bold** and *italic* text formatting
- Use # for main headers, ## for subheadings
- Type - for instant bullet lists

> "Simplicity is the soul of efficiency."
</textarea>
    </div>
    <div class="pane">
      <div class="pane-header">Live Rendered Document</div>
      <div class="preview" id="preview"></div>
    </div>
  </div>
  <script>
    const editor = document.getElementById("editor");
    const preview = document.getElementById("preview");
    const stats = document.getElementById("stats");
    function render() {
      const text = editor.value;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      stats.textContent = words + " words • " + text.length + " characters";
      let html = text
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        .replace(new RegExp('\\x60\\x60\\x60([\\s\\S]*?)\\x60\\x60\\x60', 'gim'), '<pre><code>$1</code></pre>')
        .replace(new RegExp('\\x60([^\\x60]+)\\x60', 'gim'), '<code>$1</code>')
        .replace(/^- (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/\n\n/gim, '<p></p>')
        .replace(/\n/gim, '<br/>');
      preview.innerHTML = html;
    }
    function downloadMd() {
      const blob = new Blob([editor.value], { type: 'text/markdown' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'notes.md';
      a.click();
    }
    editor.addEventListener('input', render);
    render();
  </script>
</body>
</html>`,

  drum: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Beat Synthesizer & Drum Pad</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0a0b10; color: #fff; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem; user-select: none; }
    h1 { font-size: 1.8rem; margin-bottom: 0.35rem; color: #a855f7; display: flex; align-items: center; gap: 0.5rem; }
    .subtitle { font-size: 0.85rem; color: #71717a; margin-bottom: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(3, 110px); gap: 1rem; margin-bottom: 1.5rem; }
    .pad { width: 110px; height: 110px; background: #18181b; border: 2px solid #27272a; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.08s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.4); }
    .pad:hover { border-color: #a855f7; transform: translateY(-2px); }
    .pad:active, .pad.active { transform: scale(0.94); border-color: #ec4899; box-shadow: 0 0 25px rgba(236,72,153,0.6); background: #27272a; }
    .pad-key { font-size: 1.4rem; font-weight: 800; color: #f4f4f5; }
    .pad-name { font-size: 0.72rem; text-transform: uppercase; color: #a1a1aa; margin-top: 4px; font-weight: 600; letter-spacing: 0.05em; }
    .footer-note { font-size: 0.8rem; color: #52525b; text-align: center; }
  </style>
</head>
<body>
  <h1><span>🥁</span> Studio Drum Machine</h1>
  <p class="subtitle">Press corresponding keys on your keyboard or tap pads</p>
  <div class="grid">
    <div class="pad" data-key="q" data-sound="kick"><span class="pad-key">Q</span><span class="pad-name">Kick</span></div>
    <div class="pad" data-key="w" data-sound="snare"><span class="pad-key">W</span><span class="pad-name">Snare</span></div>
    <div class="pad" data-key="e" data-sound="hihat"><span class="pad-key">E</span><span class="pad-name">Hi-Hat</span></div>
    <div class="pad" data-key="a" data-sound="clap"><span class="pad-key">A</span><span class="pad-name">Clap</span></div>
    <div class="pad" data-key="s" data-sound="tom"><span class="pad-key">S</span><span class="pad-name">Tom</span></div>
    <div class="pad" data-key="d" data-sound="crash"><span class="pad-key">D</span><span class="pad-name">Crash</span></div>
    <div class="pad" data-key="z" data-sound="perc"><span class="pad-key">Z</span><span class="pad-name">Perc</span></div>
    <div class="pad" data-key="x" data-sound="sub"><span class="pad-key">X</span><span class="pad-name">Sub 808</span></div>
    <div class="pad" data-key="c" data-sound="synth"><span class="pad-key">C</span><span class="pad-name">Laser</span></div>
  </div>
  <p class="footer-note">Powered by Web Audio API • 100% Client-Side Synthesis</p>
  <script>
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playSound(type) {
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      if (type === 'kick' || type === 'sub') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(type === 'sub' ? 90 : 150, now);
        osc.frequency.exponentialRampToValueAtTime(0.01, now + (type === 'sub' ? 0.8 : 0.4));
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (type === 'sub' ? 0.8 : 0.4));
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + (type === 'sub' ? 0.8 : 0.4));
      } else if (type === 'snare' || type === 'clap' || type === 'crash' || type === 'hihat') {
        const bufferSize = audioCtx.sampleRate * (type === 'crash' ? 0.6 : 0.15);
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(type === 'hihat' ? 0.3 : 0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (type === 'crash' ? 0.6 : 0.15));
        noise.connect(gain); gain.connect(audioCtx.destination);
        noise.start(now);
      } else {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type === 'synth' ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(type === 'synth' ? 880 : 330, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.25);
      }
    }
    function trigger(pad) {
      if (!pad) return;
      pad.classList.add('active');
      setTimeout(() => pad.classList.remove('active'), 120);
      playSound(pad.getAttribute('data-sound'));
    }
    document.querySelectorAll('.pad').forEach(p => {
      p.addEventListener('mousedown', () => trigger(p));
    });
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const pad = document.querySelector(\`.pad[data-key="\${key}"]\`);
      if (pad) trigger(pad);
    });
  </script>
</body>
</html>`
};

export const COMMUNITY_APPS = [
  {
    id: 'app-web-architect',
    name: 'Full-Stack Web App Architect',
    icon: '🚀',
    category: 'coding',
    desc: 'Builds interactive single-file HTML/CSS/JS apps, web games, dashboards, and tools ready for split-screen live preview and 1-click Puter hosting.',
    model: 'claude-sonnet-5',
    intent: 'You are a principal frontend engineer and UI/UX designer. When the user asks for a feature, calculator, game, or tool, always write a complete, standalone, interactive single-file HTML document with embedded CSS and modern JavaScript.',
    context: 'Modern web standards, responsive design, beautiful CSS gradients, intuitive user controls.',
    output: 'Always deliver a single contiguous ```html code block containing <!DOCTYPE html>, complete <style>, and vanilla JS. Ensure the application is visually polished, reactive, and fully playable or interactive.',
    formFields: [
      { label: 'App or Game Concept', placeholder: 'e.g. Retro Space Invaders arcade game, Pomodoro timer with sound, Financial Compound Interest calculator', type: 'text' },
      { label: 'Key Features / Theme', placeholder: 'e.g. Dark neon aesthetic, sound effects, local storage high scores', type: 'text' }
    ]
  },
  {
    id: 'app-data-analyst',
    name: 'Financial & Data Analyst',
    icon: '📊',
    category: 'analysis',
    desc: 'Performs quantitative financial modeling, ROI calculations, statistical distributions, and algorithmic projections with executable JavaScript.',
    model: 'gemini-2.5-pro',
    intent: 'You are a quantitative financial analyst and data scientist. Provide structured, mathematically rigorous models, ROI analyses, and data calculations.',
    context: 'Corporate finance, unit economics, statistical analysis, mathematical modeling.',
    output: 'Show assumptions clearly, provide key summary metrics in tables, and include executable JavaScript code calculations where appropriate.',
    formFields: [
      { label: 'Dataset or Financial Scenario', placeholder: 'e.g. SaaS metrics with $50k MRR, 5% monthly churn, $250 CAC', type: 'textarea' },
      { label: 'Core Analysis Goal', placeholder: 'e.g. Forecast 24-month ARR, runway, and break-even point', type: 'text' }
    ]
  },
  {
    id: 'app-doc-architect',
    name: 'Document & Proposal Architect',
    icon: '📄',
    category: 'writing',
    desc: 'Drafts formal executive summaries, consulting proposals, client invoices, and business reports formatted for 1-click PDF and Word export.',
    model: 'gpt-4o',
    intent: 'You are an executive proposal consultant and technical writer. Draft formal, compelling, high-converting client proposals, contracts, and business reports.',
    context: 'Enterprise RFP responses, consulting statements of work, executive summaries, pricing tables.',
    output: 'Use clean Markdown headers (# ## ###), structured executive summaries, deliverables tables, and timeline phases. Ready for instant PDF/DOCX generation.',
    formFields: [
      { label: 'Document Type', placeholder: 'e.g. Enterprise Consulting Proposal, Statement of Work (SOW), Project Spec', type: 'text' },
      { label: 'Client / Target Audience', placeholder: 'e.g. Fortune 500 VP of Engineering, SMB Retail Chain Owner', type: 'text' },
      { label: 'Project Scope & Deliverables', placeholder: 'e.g. Cloud migration, 3-month timeline, $45,000 fixed price', type: 'textarea' }
    ]
  },
  {
    id: 'app-deep-researcher',
    name: 'Fact-Checking Deep Researcher',
    icon: '🔍',
    category: 'research',
    desc: 'Conducts grounded research on current events, tech developments, and market trends using real-time web search and verified citations.',
    model: 'gemini-2.5-flash',
    intent: 'You are an investigative tech researcher and fact-checker. Provide rigorous, objective, citation-backed deep dives into current technologies and trends.',
    context: 'Academic standards, scientific rigor, cross-referencing claims, neutral balanced perspective.',
    output: 'Synthesize findings with clear section headers, key takeaways, and numbered citations referencing verified sources.',
    formFields: [
      { label: 'Research Subject or Question', placeholder: 'e.g. Breakthroughs in solid-state battery commercialization', type: 'text' },
      { label: 'Specific Focus Areas', placeholder: 'e.g. Leading manufacturers, energy density vs lithium-ion, 2026-2030 timeline', type: 'textarea' }
    ]
  },
  {
    id: 'app-socratic-tutor',
    name: 'Socratic Learning Tutor',
    icon: '🎓',
    category: 'research',
    desc: 'Master complex subjects from first principles. Instead of lecturing, guides you with targeted questions and vivid mental models.',
    model: 'claude-sonnet-5',
    intent: 'You are an elite private tutor utilizing the Socratic method. Guide the student to discover principles themselves through thought-provoking questions, real-world analogies, and step-by-step reasoning.',
    context: 'Cognitive science, pedagogical best practices, first-principles thinking.',
    output: 'Never dump answers all at once. Present clear intuition, ask one focused check-for-understanding question, and wait for the user to respond.',
    formFields: [
      { label: 'Topic or Concept to Master', placeholder: 'e.g. Eigenvectors & Eigenvalues, Neural Network Backpropagation, General Relativity', type: 'text' },
      { label: 'Current Level & Background', placeholder: 'e.g. College sophomore in engineering, Beginner programmer', type: 'text' }
    ]
  },
  {
    id: 'app-regex-specialist',
    name: 'Regex, SQL & Algorithm Specialist',
    icon: '🛠️',
    category: 'coding',
    desc: 'Designs optimized regular expressions, SQL queries with indexing strategies, and algorithmic functions with benchmark calculations.',
    model: 'gpt-4o',
    intent: 'You are a database architect and algorithmic optimization expert. Write battle-tested regex patterns, optimal SQL queries, and clean algorithms.',
    context: 'PostgreSQL, MySQL, SQLite, modern ECMAScript/PCRE regex engines, Big-O computational complexity.',
    output: 'Provide the exact solution, a detailed breakdown of how each clause/token works, edge cases handled, and performance characteristics.',
    formFields: [
      { label: 'Problem Statement or Query Goal', placeholder: 'e.g. Match nested ISO-8601 dates with timezone offsets, Find top 3 customers per category in SQL', type: 'textarea' },
      { label: 'Engine / Dialect', placeholder: 'e.g. PostgreSQL 16, JavaScript PCRE, Python re', type: 'text' }
    ]
  }
];

export const DEFAULT_SANDBOX_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Omni Sandbox App</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }
    .card {
      background: rgba(30, 41, 59, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 1.25rem;
      padding: 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(12px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 1rem;
    }
    h1 { font-size: 1.6rem; margin-bottom: 0.5rem; font-weight: 700; }
    p { color: #94a3b8; font-size: 0.92rem; line-height: 1.5; margin-bottom: 1.5rem; }
    .counter-display {
      font-size: 3rem;
      font-weight: 800;
      color: #818cf8;
      margin-bottom: 1.25rem;
      font-variant-numeric: tabular-nums;
    }
    .btn-row { display: flex; gap: 0.75rem; justify-content: center; }
    button {
      padding: 0.7rem 1.25rem;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    button:hover { background: #4338ca; transform: translateY(-2px); }
    button:active { transform: translateY(0); }
    .btn-reset { background: rgba(255, 255, 255, 0.1); color: #cbd5e1; }
    .btn-reset:hover { background: rgba(255, 255, 255, 0.2); }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">⚡ Omni Live Sandbox</div>
    <h1>Interactive Web App</h1>
    <p>Ask Omni Chat to create any game, dashboard, or tool. Preview it live here or publish it with 1 click to Puter cloud!</p>
    <div class="counter-display" id="count">0</div>
    <div class="btn-row">
      <button id="btn-inc">+ Click Me</button>
      <button id="btn-reset" class="btn-reset">Reset</button>
    </div>
  </div>
  <script>
    let n = 0;
    const countEl = document.getElementById('count');
    document.getElementById('btn-inc').addEventListener('click', () => {
      n++;
      countEl.textContent = n;
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      n = 0;
      countEl.textContent = n;
    });
  </script>
</body>
</html>`;

