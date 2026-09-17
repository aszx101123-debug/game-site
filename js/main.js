(function () {
  'use strict';

  var filterBar = document.getElementById('roleFilter');
  var grid = document.getElementById('agentGrid');

  if (filterBar && grid) {
    var cards = grid.children;

    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter-btn');
      if (!btn) return;

      filterBar.querySelectorAll('.filter-btn').forEach(function (b) {
        b.classList.remove('active');
      });
      btn.classList.add('active');

      var role = btn.getAttribute('data-role');

      Array.prototype.forEach.call(cards, function (card) {
        var show = role === 'all' || card.getAttribute('data-role') === role;
        card.style.display = show ? '' : 'none';
      });
    });
  }

  var revealTargets = document.querySelectorAll(
    '.game-card, .agent-card, .champion-card, .map-card, .news-card, .position-card'
  );

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealTargets.forEach(function (el, i) {
      el.style.transitionDelay = (i % 4) * 60 + 'ms';
      el.classList.add('reveal');
      io.observe(el);
    });
  }
})();
