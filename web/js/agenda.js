/**
 * AGENDA.JS — mục lục nhảy nhanh tới từng slide
 * Mở bằng nút "Mục lục", bấm vào tên đề mục trên thanh trên, hoặc phím G.
 */
(function (window) {
  function build() {
    var overlay = document.getElementById('agenda');
    if (!overlay) return;
    var list = overlay.querySelector('.agenda-cols');
    var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
    var groups = [];
    var byName = {};
    slides.forEach(function (s, i) {
      var name = s.getAttribute('data-section') || '';
      if (!byName[name]) { byName[name] = { name: name, items: [] }; groups.push(byName[name]); }
      var t = s.querySelector('h2.slide-title');
      var title = t ? t.textContent.replace(/\s+/g, ' ').trim() : 'Slide ' + (i + 1);
      byName[name].items.push({ index: i, title: title });
    });
    list.innerHTML = '';
    groups.forEach(function (g) {
      var box = document.createElement('div');
      box.className = 'agenda-group';
      var h = document.createElement('h4');
      h.textContent = g.name;
      box.appendChild(h);
      g.items.forEach(function (it) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.index = it.index;
        b.innerHTML = '<span class="n">' + String(it.index + 1).padStart(2, '0') + '</span><span></span>';
        b.lastChild.textContent = it.title;
        b.addEventListener('click', function () { close(); window.goTo(it.index, false); });
        box.appendChild(b);
      });
      list.appendChild(box);
    });
  }

  function open() {
    var overlay = document.getElementById('agenda');
    if (!overlay) return;
    var cur = window.getCurrentSlide ? window.getCurrentSlide() : 0;
    overlay.querySelectorAll('button[data-index]').forEach(function (b) {
      b.classList.toggle('current', Number(b.dataset.index) === cur);
    });
    overlay.classList.add('open');
    var c = overlay.querySelector('button.current') || overlay.querySelector('button[data-index]');
    if (c) { c.focus({ preventScroll: false }); }
  }

  function close() {
    var overlay = document.getElementById('agenda');
    if (overlay) overlay.classList.remove('open');
  }

  function isOpen() {
    var overlay = document.getElementById('agenda');
    return overlay && overlay.classList.contains('open');
  }

  function init() {
    build();
    var btn = document.getElementById('agendaBtn');
    var hint = document.getElementById('sectionHint');
    var closeBtn = document.getElementById('agendaClose');
    if (btn) btn.addEventListener('click', open);
    if (hint) hint.addEventListener('click', open);
    if (closeBtn) closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'g' || e.key === 'G') { isOpen() ? close() : open(); }
      if (e.key === 'Escape' && isOpen()) { close(); e.stopPropagation(); }
      if (isOpen() && (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.stopImmediatePropagation();
      }
    }, true);
  }

  window.initAgenda = init;
})(window);
