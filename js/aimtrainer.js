(function () {
  'use strict';

  var ROUND = 30;
  var arena = document.getElementById('arena');
  var overlay = document.getElementById('overlay');
  var ovTitle = document.getElementById('ovTitle');
  var ovText = document.getElementById('ovText');
  var startBtn = document.getElementById('startBtn');
  var hudTime = document.getElementById('hudTime');
  var hudScore = document.getElementById('hudScore');
  var hudAcc = document.getElementById('hudAcc');
  var hudStreak = document.getElementById('hudStreak');

  var running = false;
  var score = 0, shots = 0, hits = 0, heads = 0, streak = 0, best = 0;
  var timeLeft = ROUND;
  var clock = null, spawnT = null;
  var expire = [];

  var actx = null;
  function beep(freq, dur, type, vol) {
    if (!actx) return;
    try {
      var o = actx.createOscillator();
      var g = actx.createGain();
      o.type = type || 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.07, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start();
      o.stop(actx.currentTime + dur);
    } catch (e) {}
  }

  function fmt() {
    hudScore.textContent = score;
    hudAcc.textContent = shots ? Math.round((hits / shots) * 100) + '%' : '0%';
    hudStreak.textContent = streak;
    hudTime.textContent = timeLeft.toFixed(1);
  }

  function floatText(x, y, txt, color) {
    var f = document.createElement('span');
    f.className = 'float-txt';
    f.textContent = txt;
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    f.style.color = color;
    arena.appendChild(f);
    setTimeout(function () { f.remove(); }, 700);
  }

  function spawn() {
    if (!running) return;
    var t = document.createElement('div');
    t.className = 'target';
    var w = arena.clientWidth;
    var h = arena.clientHeight;
    t.style.left = (40 + Math.random() * (w - 152)) + 'px';
    t.style.top = (40 + Math.random() * (h - 152)) + 'px';
    t.innerHTML = '<div class="t-head"></div>';
    arena.appendChild(t);
    expire.push(setTimeout(function () {
      if (t.parentNode) {
        t.remove();
        streak = 0;
        fmt();
      }
    }, 1700));
    spawnT = setTimeout(spawn, 600 + Math.random() * 350);
  }

  function start() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    expire.forEach(clearTimeout);
    expire = [];
    clearTimeout(spawnT);
    clearInterval(clock);
    arena.querySelectorAll('.target, .float-txt, .hit-ring').forEach(function (n) { n.remove(); });
    score = 0; shots = 0; hits = 0; heads = 0; streak = 0; best = 0;
    timeLeft = ROUND;
    running = true;
    overlay.classList.add('hidden');
    fmt();
    clock = setInterval(function () {
      timeLeft = Math.max(0, timeLeft - 0.1);
      fmt();
      if (timeLeft <= 0) end();
    }, 100);
    spawn();
  }

  function end() {
    running = false;
    clearInterval(clock);
    clearTimeout(spawnT);
    expire.forEach(clearTimeout);
    expire = [];
    arena.querySelectorAll('.target').forEach(function (n) { n.remove(); });
    var acc = shots ? Math.round((hits / shots) * 100) : 0;
    ovTitle.textContent = '훈련 종료';
    ovText.innerHTML =
      '최종 점수 <b>' + score + '</b><br>' +
      '명중률 ' + acc + '% · 헤드샷 ' + heads + '회<br>' +
      '최고 연속 명중 ' + best + '회';
    startBtn.textContent = '다시 도전';
    overlay.classList.remove('hidden');
  }

  arena.addEventListener('mousedown', function (e) {
    if (!running) return;
    e.preventDefault();
    var rect = arena.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    shots++;
    var t = e.target.closest('.target');
    if (t) {
      var head = e.target.classList.contains('t-head');
      hits++;
      streak++;
      if (streak > best) best = streak;
      if (head) {
        heads++;
        score += 150;
      } else {
        score += 50;
      }
      var ring = document.createElement('span');
      ring.className = 'hit-ring';
      ring.style.left = (x - 10) + 'px';
      ring.style.top = (y - 10) + 'px';
      arena.appendChild(ring);
      setTimeout(function () { ring.remove(); }, 300);
      floatText(x, y - 24, head ? '+150 HEADSHOT' : '+50', head ? '#ff4655' : '#ece8e1');
      beep(head ? 880 : 440, 0.09, 'sine', 0.09);
      t.remove();
    } else {
      streak = 0;
      beep(90, 0.12, 'sawtooth', 0.05);
    }
    fmt();
  });

  startBtn.addEventListener('click', start);
  fmt();
})();
