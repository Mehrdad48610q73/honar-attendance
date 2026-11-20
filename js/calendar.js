(function () {
  'use strict';

  var GN = { 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم' };
  var collator = new Intl.Collator('fa');
  var SUFFIX = { absent: '', late: ' (تأخیر)', leave: ' (مرخصی)' };
  var BADGE = { late: 'تأخیر', leave: 'مرخصی' };
  var GROUPS = [
    { key: 'daily', title: 'دانش‌آموزان (حضور و غیاب روزانه)', grades: true },
    { key: 'sport', title: 'غیبت ورزش', grades: true },
    { key: 'teacher', title: 'دبیران', grades: false },
    { key: 'official', title: 'دبیران و مسئولان', grades: false }
  ];

  var CSS = '' +
    '.cal-bar{margin-top:14px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:8px;display:flex;align-items:center;gap:8px}' +
    '.cal-nav{width:42px;height:42px;border-radius:50%;background:var(--blue-light);color:var(--blue);display:grid;place-items:center;flex:none}' +
    '.cal-nav svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
    '.cal-nav.flip svg{transform:scaleX(-1)}' +
    '.cal-title{flex:1;background:none;color:var(--navy);font-weight:800;font-size:1.05rem;padding:6px 4px}' +
    '.cal-today{background:var(--navy);color:#fff;border-radius:14px;padding:8px 12px;font-size:.8rem;font-weight:700;flex:none}' +
    '.cal-card{margin-top:12px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:12px 8px}' +
    '.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}' +
    '.cal-wd{text-align:center;font-size:.72rem;font-weight:700;color:#7C8CA3;padding:4px 0}' +
    '.cal-wd.fri{color:var(--red)}' +
    '.cal-day{aspect-ratio:1/1.05;border-radius:14px;background:none;color:var(--navy);font-weight:600;font-size:.95rem;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;transition:background .15s}' +
    '.cal-day.fri{color:var(--red)}' +
    '.cal-day.today{background:var(--blue-light);color:var(--blue);font-weight:800}' +
    '.cal-day.sel{background:var(--blue);color:#fff}' +
    '.cal-dots{display:flex;gap:2px;height:6px}' +
    '.cal-dots i{width:6px;height:6px;border-radius:50%;display:block}' +
    '.cal-day.sel .cal-dots i{box-shadow:0 0 0 1.5px #fff}' +
    '.d-daily{background:var(--red)}.d-sport{background:var(--orange)}.d-teacher{background:var(--teal)}.d-official{background:var(--navy)}' +
    '.cal-legend{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;padding:0 6px;font-size:.72rem;opacity:.85}' +
    '.cal-legend span{display:flex;align-items:center;gap:4px}' +
    '.cal-legend i{width:8px;height:8px;border-radius:50%;display:inline-block}' +
    '.cal-detail{margin-top:14px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:16px}' +
    '.cal-detail h3{font-size:1rem;margin-bottom:4px}' +
    '.cal-sec{margin-top:12px}' +
    '.cal-sec h4{font-size:.9rem;display:flex;align-items:center;gap:6px;margin-bottom:2px}' +
    '.cal-sec h4 i{width:9px;height:9px;border-radius:50%;display:inline-block}' +
    '.cal-line{font-size:.88rem;line-height:2;margin-top:2px}' +
    '.cal-line b{color:var(--blue)}' +
    '.cal-badge{display:inline-block;font-size:.68rem;border-radius:10px;padding:0 8px;margin-right:4px;line-height:1.7;font-weight:700}' +
    '.cal-badge.late{background:#FDF0E2;color:var(--orange)}' +
    '.cal-badge.leave{background:#E2F5F4;color:var(--teal)}' +
    '.cal-copy{width:100%;margin-top:14px;padding:15px;border-radius:20px;background:var(--navy);color:#fff;font-size:.98rem;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px}' +
    '.cal-copy svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
    '.cal-sel{display:flex;gap:6px;margin-top:10px}' +
    '.cal-sel select{flex:1;width:auto}';

  function ic(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }

  function injectCss() {
    if (document.getElementById('cal-css')) return;
    var s = document.createElement('style');
    s.id = 'cal-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var st = { jy: 0, jm: 0, sel: '', people: {}, byDate: {}, page: null, tk: 0 };

  function alive() { return st.page && st.page.isConnected; }
  function q(sel) { return st.page.querySelector(sel); }
  function byName(a, b) { return collator.compare(a.p.name, b.p.name); }

  function defaultSel(jy, jm) {
    var t = Jalali.today();
    return (t.jy === jy && t.jm === jm) ? Jalali.format(jy, jm, t.jd) : Jalali.format(jy, jm, 1);
  }

  function buildSections(date) {
    var recs = st.byDate[date] || [];
    var out = [];
    GROUPS.forEach(function (g) {
      var rs = recs.filter(function (r) { return r.activity === g.key; })
        .map(function (r) { return { p: st.people[r.personId], status: r.status }; })
        .filter(function (x) { return x.p; });
      if (!rs.length) return;
      var blocks = [];
      if (g.grades) {
        [10, 11, 12].forEach(function (gr) {
          var items = rs.filter(function (x) { return x.p.grade === gr; }).sort(byName);
          if (items.length) blocks.push({ sub: 'پایه ' + GN[gr], items: items });
        });
      } else {
        rs.sort(function (a, b) { return (a.p.order || 0) - (b.p.order || 0); });
        blocks.push({ sub: '', items: rs });
      }
      out.push({ key: g.key, title: g.title, blocks: blocks });
    });
    return out;
  }

  function reportText(date) {
    var secs = buildSections(date);
    var L = ['گزارش حضور و غیاب هنرستان', 'تاریخ: ' + Jalali.longDate(date), ''];
    if (!secs.length) { L.push('غیبتی ثبت نشده است.'); return L.join('\n'); }
    secs.forEach(function (s) {
      L.push(s.title + ':');
      s.blocks.forEach(function (b) {
        if (b.sub) L.push(b.sub + ':');
        b.items.forEach(function (it, i) { L.push(UI.fa(i + 1) + '. ' + it.p.name + SUFFIX[it.status]); });
      });
      L.push('');
    });
    return L.join('\n').trim();
  }

  function render(root) {
    injectCss();
    var t = Jalali.today();
    st.jy = t.jy; st.jm = t.jm; st.sel = Jalali.todayString();
    st.people = {}; st.byDate = {};
    root.innerHTML =
      '<div class="page cal-page">' +
      '<div class="page-head"><button class="back" data-page="dashboard">' + ic('back') + '</button><h2>تقویم شمسی</h2></div>' +
      '<div class="cal-bar">' +
      '<button class="cal-nav" data-act="prev" aria-label="ماه قبل">' + ic('back') + '</button>' +
      '<button class="cal-title" data-act="pick" id="cTitle"></button>' +
      '<button class="cal-today" data-act="today" id="cToday" hidden>امروز</button>' +
      '<button class="cal-nav flip" data-act="next" aria-label="ماه بعد">' + ic('back') + '</button></div>' +
      '<div class="cal-card"><div class="cal-grid" id="cGrid"></div>' +
      '<div class="cal-legend"><span><i class="d-daily"></i>غیبت روزانه</span><span><i class="d-sport"></i>ورزش</span>' +
      '<span><i class="d-teacher"></i>دبیران</span><span><i class="d-official"></i>مسئولان</span></div></div>' +
      '<div class="cal-detail" id="cDetail"></div></div>';
    st.page = root.querySelector('.cal-page');
    st.page.addEventListener('click', onClick);
    loadMonth();
  }

  function onClick(e) {
    var t = e.target.closest('[data-act]');
    if (t) {
      var a = t.getAttribute('data-act');
      if (a === 'prev') moveMonth(-1);
      else if (a === 'next') moveMonth(1);
      else if (a === 'pick') pickMonth();
      else if (a === 'today') goToday();
      else if (a === 'copy') UI.copy(reportText(st.sel));
      return;
    }
    t = e.target.closest('[data-d]');
    if (t) { st.sel = t.getAttribute('data-d'); draw(); }
  }

  function moveMonth(n) {
    st.jm += n;
    if (st.jm < 1) { st.jm = 12; st.jy--; }
    if (st.jm > 12) { st.jm = 1; st.jy++; }
    st.sel = defaultSel(st.jy, st.jm);
    loadMonth();
  }

  function goToday() {
    var t = Jalali.today();
    var same = t.jy === st.jy && t.jm === st.jm;
    st.jy = t.jy; st.jm = t.jm; st.sel = Jalali.todayString();
    if (same) draw(); else loadMonth();
  }

  async function loadMonth() {
    var tk = ++st.tk;
    var jy = st.jy, jm = st.jm;
    try {
      var first = Jalali.format(jy, jm, 1);
      var last = Jalali.format(jy, jm, Jalali.monthLength(jy, jm));
      var all = await DB.getPeople();
      var recs = await DB.getRecordsInRange(first, last);
      if (tk !== st.tk || !alive()) return;
      st.people = {};
      all.forEach(function (p) { st.people[p.id] = p; });
      st.byDate = {};
      recs.forEach(function (r) { (st.byDate[r.date] = st.byDate[r.date] || []).push(r); });
    } catch (e) {
      UI.toast('خطا در خواندن اطلاعات', 'bad');
    }
    draw();
  }

  function draw() {
    if (!alive()) return;
    drawBar(); drawGrid(); drawDetail();
  }

  function drawBar() {
    q('#cTitle').textContent = Jalali.MONTHS[st.jm - 1] + ' ' + UI.fa(st.jy);
    var t = Jalali.today();
    var atToday = t.jy === st.jy && t.jm === st.jm && st.sel === Jalali.todayString();
    q('#cToday').hidden = atToday;
  }

  function drawGrid() {
    var h = '', i;
    for (i = 0; i < 7; i++) h += '<div class="cal-wd' + (i === 6 ? ' fri' : '') + '">' + Jalali.DAYS[i].charAt(0) + '</div>';
    var lead = Jalali.weekday(st.jy, st.jm, 1);
    for (i = 0; i < lead; i++) h += '<div></div>';
    var len = Jalali.monthLength(st.jy, st.jm);
    var today = Jalali.todayString();
    for (var d = 1; d <= len; d++) {
      var date = Jalali.format(st.jy, st.jm, d);
      var wd = (lead + d - 1) % 7;
      var recs = st.byDate[date] || [];
      var kinds = {};
      recs.forEach(function (r) { kinds[r.activity] = true; });
      var dots = ['daily', 'sport', 'teacher', 'official'].filter(function (k) { return kinds[k]; })
        .map(function (k) { return '<i class="d-' + k + '"></i>'; }).join('');
      h += '<button class="cal-day' + (wd === 6 ? ' fri' : '') + (date === today ? ' today' : '') + (date === st.sel ? ' sel' : '') +
        '" data-d="' + date + '">' + UI.fa(d) + '<span class="cal-dots">' + dots + '</span></button>';
    }
    q('#cGrid').innerHTML = h;
  }

  function drawDetail() {
    var secs = buildSections(st.sel);
    var h = '<h3>' + UI.esc(Jalali.longDate(st.sel)) + '</h3>';
    if (!secs.length) {
      h += '<div class="cal-line">برای این روز غیبتی ثبت نشده است.</div>';
    } else {
      secs.forEach(function (s) {
        h += '<div class="cal-sec"><h4><i class="d-' + s.key + '"></i>' + s.title + '</h4>';
        s.blocks.forEach(function (b) {
          var names = b.items.map(function (it) {
            return UI.esc(it.p.name) + (BADGE[it.status] ? '<span class="cal-badge ' + it.status + '">' + BADGE[it.status] + '</span>' : '');
          }).join('، ');
          h += '<div class="cal-line">' + (b.sub ? '<b>' + b.sub + ':</b> ' : '') + names + '</div>';
        });
        h += '</div>';
      });
    }
    h += '<button class="cal-copy" data-act="copy">' + ic('copy') + 'کپی گزارش این روز</button>';
    q('#cDetail').innerHTML = h;
  }

  async function pickMonth() {
    var ty = Jalali.today().jy, i, ms = '', ys = '';
    for (i = 1; i <= 12; i++) ms += '<option value="' + i + '"' + (i === st.jm ? ' selected' : '') + '>' + Jalali.MONTHS[i - 1] + '</option>';
    for (i = ty - 6; i <= ty + 2; i++) ys += '<option value="' + i + '"' + (i === st.jy ? ' selected' : '') + '>' + UI.fa(i) + '</option>';
    var box = await UI.dialog({
      title: 'انتخاب ماه و سال',
      body: '<div class="cal-sel"><select id="cM">' + ms + '</select><select id="cY">' + ys + '</select></div>',
      ok: 'نمایش'
    });
    if (!box) return;
    st.jm = Number(box.querySelector('#cM').value);
    st.jy = Number(box.querySelector('#cY').value);
    st.sel = defaultSel(st.jy, st.jm);
    loadMonth();
  }

  App.register('calendar', { render: render });
})();
