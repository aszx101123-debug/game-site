(function () {
  'use strict';

  var ROUND = 60;
  var CLICK_DMG = 65;
  var TOWER_X = 100;

  var arena = document.getElementById('arena');
  var overlay = document.getElementById('overlay');
  var ovTitle = document.getElementById('ovTitle');
  var ovText = document.getElementById('ovText');
  var startBtn = document.getElementById('startBtn');
  var hudTime = document.getElementById('hudTime');
  var hudCs = document.getElementById('hudCs');
  var hudGold = document.getElementById('hudGold');
  var hudMiss = document.getElementById('hudMiss');

  var TYPES = {
    melee: { label: '미니언', hp: 180, speed: 42, gold: 21, decay: [14, 24] },
    caster: { label: '마법사', hp: 120, speed: 55, gold: 14, decay: [16, 26] },
    cannon: { label: '대포', hp: 340, speed: 32, gold: 60, decay: [11, 17] }
  };

  var running = false;
  var cs = 0, gold = 0, missed = 0;
  var timeLeft = ROUND;
  var minions = [];
  var clock = null, spawner = null, raf = null, lastTs = 0, spawnCount = 0;

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
    hudTime.textContent = Math.ceil(timeLeft);
    hudCs.textContent = cs;
    hudGold.textContent = gold;
    hudMiss.textContent = missed;
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

  function spawnMinion() {
    spawnCount++;
    var type = spawnCount % 6 === 0 ? 'cannon' : (Math.random() < 0.5 ? 'melee' : 'caster');
    var cfg = TYPES[type];
    var m = document.createElement('div');
    m.className = 'minion ' + type;
    m.innerHTML = '<div class="hpbar"><div class="hpfill"></div></div><div class="minion-body">' + cfg.label + '</div>';
    var rows = [48, 58, 68];
    m.style.top = rows[Math.floor(Math.random() * rows.length)] + '%';
    var d = {
      el: m,
      fill: m.querySelector('.hpfill'),
      type: type,
      hp: cfg.hp,
      maxHp: cfg.hp,
      speed: cfg.speed + Math.random() * 8,
      decay: cfg.decay[0] + Math.random() * (cfg.decay[1] - cfg.decay[0]),
      gold: cfg.gold,
      x: arena.clientWidth - 70,
      dead: false
    };
    m.addEventListener('mousedown', function (e) {
      e.preventDefault();
      hit(d);
    });
    arena.appendChild(m);
    minions.push(d);
  }

  function updateHp(d) {
    var pct = Math.max(0, (d.hp / d.maxHp) * 100);
    d.fill.style.width = pct + '%';
    d.fill.classList.toggle('mid', pct <= 60 && pct > 35);
    d.fill.classList.toggle('low', pct <= 35);
  }

  function hit(d) {
    if (!running || d.dead) return;
    d.hp -= CLICK_DMG;
    if (d.hp <= 0) {
      d.hp = 0;
      d.dead = true;
      cs++;
      gold += d.gold;
      var rect = d.el.getBoundingClientRect();
      var arect = arena.getBoundingClientRect();
      floatText(rect.left - arect.left, rect.top - arect.top - 10, '+' + d.gold, '#c8aa6e');
      beep(660, 0.14, 'sine', 0.09);
      d.el.classList.add('dead');
      var el = d.el;
      setTimeout(function () { el.remove(); }, 250);
    } else {
      beep(220, 0.05, 'square', 0.05);
    }
    updateHp(d);
    fmt();
  }

  function missMinion(d) {
    if (d.dead) return;
    d.dead = true;
    missed++;
    var rect = d.el.getBoundingClientRect();
    var arect = arena.getBoundingClientRect();
    floatText(rect.left - arect.left, rect.top - arect.top - 10, 'MISS', '#e74c3c');
    beep(110, 0.15, 'sawtooth', 0.04);
    d.el.remove();
    fmt();
  }

  function loop(ts) {
    if (!running) return;
    var dt = Math.min(0.05, (ts - lastTs) / 1000) || 0;
    lastTs = ts;
    for (var i = minions.length - 1; i >= 0; i--) {
      var d = minions[i];
      if (d.dead) {
        minions.splice(i, 1);
        continue;
      }
      d.x -= d.speed * dt;
      d.hp -= d.decay * dt;
      d.el.style.left = d.x + 'px';
      updateHp(d);
      if (d.hp <= 0 || d.x < TOWER_X) {
        missMinion(d);
        minions.splice(i, 1);
      }
    }
    raf = requestAnimationFrame(loop);
  }

  function start() {
    if (!actx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) actx = new AC();
    }
    clearInterval(clock);
    clearInterval(spawner);
    cancelAnimationFrame(raf);
    minions.forEach(function (d) { d.el.remove(); });
    minions = [];
    arena.querySelectorAll('.float-txt').forEach(function (n) { n.remove(); });
    cs = 0; gold = 0; missed = 0; spawnCount = 0;
    timeLeft = ROUND;
    running = true;
    overlay.classList.add('hidden');
    fmt();
    clock = setInterval(function () {
      timeLeft = Math.max(0, timeLeft - 1);
      fmt();
      if (timeLeft <= 0) end();
    }, 1000);
    spawner = setInterval(function () {
      if (running && minions.length < 9) spawnMinion();
    }, 1100);
    spawnMinion();
    lastTs = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function end() {
    running = false;
    clearInterval(clock);
    clearInterval(spawner);
    cancelAnimationFrame(raf);
    minions.forEach(function (d) { d.el.remove(); });
    minions = [];
    var grade = cs >= 40 ? 'S' : cs >= 30 ? 'A' : cs >= 20 ? 'B' : cs >= 12 ? 'C' : 'D';
    ovTitle.textContent = '훈련 종료';
    ovText.innerHTML =
      'CS <b>' + cs + '</b> · 골드 <b>' + gold + '</b><br>' +
      '놓친 미니언 ' + missed + '마리<br>' +
      '등급 <b>' + grade + '</b>';
    startBtn.textContent = '다시 도전';
    overlay.classList.remove('hidden');
  }

  startBtn.addEventListener('click', start);
  fmt();
})();
