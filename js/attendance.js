(function () {
  'use strict';

  var GN = { 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم' };
  var LABEL = { present: 'حاضر', absent: 'غایب', late: 'تأخیر', leave: 'مرخصی' };
  var ICON = { present: 'check', absent: 'x', late: 'clock', leave: 'leave' };
  var collator = new Intl.Collator('fa');

  /* ---------- متن پیامک والدین (قابل تنظیم) ---------- */

  var DEFAULT_SCHOOL = 'هنرستان هنرپویان';
  var SMS_ORDER = ['formal', 'short', 'polite', 'concerned'];
  var SMS_STYLES = {
    formal: {
      label: 'رسمی (پیش‌فرض)',
      daily: 'با سلام، والدین گرامی\nبه اطلاع می‌رساند دانش‌آموز {نام} {امروز} {روز} مورخ {تاریخ} غایب می‌باشد. لطفاً در این خصوص اطلاع‌رسانی فرمایید.\n{مدرسه}',
      sport: 'با سلام، والدین گرامی\nبه اطلاع می‌رساند دانش‌آموز {نام} {امروز} {روز} مورخ {تاریخ} در کلاس ورزش غایب می‌باشد. لطفاً در این خصوص اطلاع‌رسانی فرمایید.\n{مدرسه}'
    },
    short: {
      label: 'کوتاه و ساده',
      daily: 'والدین گرامی، {نام} {امروز} {روز} مورخ {تاریخ} در مدرسه حضور نداشت. لطفاً علت غیبت را به مدرسه اطلاع دهید.\n{مدرسه}',
      sport: 'والدین گرامی، {نام} {امروز} {روز} مورخ {تاریخ} در کلاس ورزش حضور نداشت. لطفاً علت غیبت را به مدرسه اطلاع دهید.\n{مدرسه}'
    },
    polite: {
      label: 'مؤدبانه',
      daily: 'سلام و احترام\nدانش‌آموز {نام} {امروز} {روز} مورخ {تاریخ} در مدرسه حاضر نشده است. خواهشمندیم علت غیبت را به اطلاع ما برسانید. سپاس از همراهی شما\n{مدرسه}',
      sport: 'سلام و احترام\nدانش‌آموز {نام} {امروز} {روز} مورخ {تاریخ} در کلاس ورزش حاضر نشده است. خواهشمندیم علت غیبت را به اطلاع ما برسانید. سپاس از همراهی شما\n{مدرسه}'
    },
    concerned: {
      label: 'اطلاع‌رسانی به والدین',
      daily: 'والدین محترم، با سلام\nفرزند شما {نام} {امروز} {روز} مورخ {تاریخ} در کلاس‌های مدرسه غایب بود. اگر از این موضوع اطلاع نداشتید، لطفاً با مدرسه تماس بگیرید.\n{مدرسه}',
      sport: 'والدین محترم، با سلام\nفرزند شما {نام} {امروز} {روز} مورخ {تاریخ} در کلاس ورزش غایب بود. اگر از این موضوع اطلاع نداشتید، لطفاً با مدرسه تماس بگیرید.\n{مدرسه}'
    }
  };

  function smsDefaults() { return { style: 'formal', school: DEFAULT_SCHOOL, cd: '', cs: '' }; }

  async function smsLoad() {
    return {
      style: await DB.getSetting('smsStyle', 'formal'),
      school: (await DB.getSetting('schoolName', DEFAULT_SCHOOL)) || DEFAULT_SCHOOL,
      cd: await DB.getSetting('smsCustomDaily', ''),
      cs: await DB.getSetting('smsCustomSport', '')
    };
  }

  function smsBuild(cfg, kind, vars, forceStyle) {
    var style = forceStyle || cfg.style, tpl;
    if (style === 'custom') {
      tpl = (kind === 'sport' ? cfg.cs : cfg.cd) || SMS_STYLES.formal[kind];
    } else if (style === 'auto') {
      tpl = SMS_STYLES[SMS_ORDER[Math.floor(Math.random() * SMS_ORDER.length)]][kind];
    } else {
      tpl = (SMS_STYLES[style] || SMS_STYLES.formal)[kind];
    }
    var all = { 'نام': vars['نام'], 'روز': vars['روز'], 'تاریخ': vars['تاریخ'], 'امروز': vars['امروز'], 'مدرسه': cfg.school || DEFAULT_SCHOOL };
    return tpl.replace(/\{(نام|روز|تاریخ|امروز|مدرسه)\}/g, function (m, k) { return all[k]; })
      .replace(/[ \t]{2,}/g, ' ').replace(/ *\n */g, '\n').trim();
  }

  function smsSample() {
    var t = Jalali.todayString(), p = Jalali.parse(t);
    return { 'نام': 'علی احمدی', 'روز': Jalali.DAYS[Jalali.weekday(p.jy, p.jm, p.jd)], 'تاریخ': UI.fa(t.replace(/-/g, '/')), 'امروز': 'امروز' };
  }

  window.SmsTpl = {
    STYLES: SMS_STYLES, ORDER: SMS_ORDER, DEFAULT_SCHOOL: DEFAULT_SCHOOL,
    defaults: smsDefaults, load: smsLoad, build: smsBuild, sample: smsSample
  };

  var CSS = '' +
    '.datebar{margin-top:14px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:8px;display:flex;align-items:center;gap:8px}' +
    '.date-nav{width:42px;height:42px;border-radius:50%;background:var(--blue-light);color:var(--blue);display:grid;place-items:center;flex:none}' +
    '.date-nav svg,.copy-big svg,.opt svg,.st-btn svg{stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
    '.date-nav svg{width:20px;height:20px}' +
    '.date-nav.flip svg{transform:scaleX(-1)}' +
    '.date-mid{flex:1;background:none;color:var(--navy);font-weight:800;font-size:.95rem;padding:4px;line-height:1.5}' +
    '.date-mid small{display:block;font-weight:500;font-size:.72rem;color:var(--blue)}' +
    '.today-pill{background:var(--navy);color:#fff;border-radius:14px;padding:8px 12px;font-size:.8rem;font-weight:700;flex:none}' +
    '.chips{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}' +
    '.chip{background:#fff;border-radius:18px;box-shadow:var(--shadow);padding:8px 4px;text-align:center;font-size:.75rem}' +
    '.chip b{display:block;font-size:1.2rem;line-height:1.5}' +
    '.chip.g b{color:var(--green)}.chip.r b{color:var(--red)}.chip.o b{color:var(--orange)}.chip.t b{color:var(--teal)}' +
    '.att-list{margin-top:12px;display:flex;flex-direction:column;gap:8px}' +
    '.att-row{background:#fff;border-radius:18px;box-shadow:var(--shadow);padding:8px 10px;display:flex;align-items:center;gap:12px;transition:background .2s}' +
    '.att-row.absent{background:#FFF4F4}.att-row.late{background:#FFF8EE}.att-row.leave{background:#EEF9F8}' +
    '.att-name{flex:1;font-weight:600;font-size:.95rem}' +
    '.st-btn{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;flex:none;transition:transform .15s,background .2s}' +
    '.st-btn:active{transform:scale(.86)}' +
    '.st-btn svg{width:24px;height:24px;stroke-width:2.8}' +
    '.st-present{background:#E5F5EC;color:var(--green)}' +
    '.st-absent{background:var(--red);color:#fff}' +
    '.st-late{background:#FDF0E2;color:var(--orange)}' +
    '.st-leave{background:#E2F5F4;color:var(--teal)}' +
    '.att-more{width:36px;height:36px;border-radius:50%;background:var(--bg);color:#7C8CA3;display:grid;place-items:center;flex:none}' +
    '.att-more svg{width:22px;height:22px;fill:currentColor;stroke:none}' +
    '.abs-box{margin-top:18px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:16px}' +
    '.abs-box h3{font-size:1rem;margin-bottom:6px}' +
    '.abs-count{color:var(--red);font-size:.88rem;margin-right:6px}' +
    '.abs-grp{margin-top:8px;font-size:.88rem;line-height:2}' +
    '.abs-grp b{color:var(--blue)}' +
    '.abs-item{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px dashed #E6EDF5}' +
    '.abs-nm{flex:1;font-weight:600;font-size:.9rem}' +
    '.sms-btn{display:flex;align-items:center;gap:5px;background:var(--green);color:#fff;border-radius:14px;padding:8px 12px;font-size:.78rem;font-weight:700;flex:none}' +
    '.sms-btn svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}' +
    '.sms-btn.none{background:var(--blue-light);color:var(--blue)}' +
    '.sms-btn:active{transform:scale(.95)}' +
    '.sms-set{margin-top:12px;background:none;color:var(--blue);font-size:.8rem;font-weight:700;padding:4px 0}' +
    '.copy-big{width:100%;margin-top:14px;padding:16px;border-radius:20px;background:var(--navy);color:#fff;font-size:1rem;font-weight:800;display:flex;align-items:center;justify-content:center;gap:8px}' +
    '.copy-big svg{width:22px;height:22px}' +
    '.copy-big:active{transform:scale(.98)}' +
    '.copy-mini{display:flex;gap:6px;margin-top:10px}' +
    '.copy-mini .btn{font-size:.78rem;padding:10px 4px}' +
    '.opts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}' +
    '.opt{display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 8px;border-radius:20px;font-weight:700;font-size:.92rem}' +
    '.opt svg{width:26px;height:26px}' +
    '.opt.sel{outline:3px solid var(--blue)}' +
    '.date-sel{display:flex;gap:6px;margin-top:10px}' +
    '.date-sel select{flex:1;width:auto}';

  function ic(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }

  function injectCss() {
    if (document.getElementById('att-css')) return;
    var s = document.createElement('style');
    s.id = 'att-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function chooseStatus(name, cur) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.className = 'overlay';
      var btns = ['present', 'absent', 'late', 'leave'].map(function (s) {
        return '<button class="opt st-' + s + (s === cur ? ' sel' : '') + '" data-s="' + s + '">' + ic(ICON[s]) + LABEL[s] + '</button>';
      }).join('');
      ov.innerHTML = '<div class="dlg"><h3>' + UI.esc(name) + '</h3><div class="opts">' + btns +
        '</div><div class="dlg-actions"><button class="btn ghost" data-cancel>انصراف</button></div></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function (e) {
        var b = e.target.closest('[data-s]');
        if (b) { ov.remove(); resolve(b.getAttribute('data-s')); return; }
        if (e.target.closest('[data-cancel]') || e.target === ov) { ov.remove(); resolve(null); }
      });
    });
  }

  function create(o) {
    var st = { date: Jalali.todayString(), grade: 10, people: [], recs: {}, phones: {}, smsCfg: null, root: null, page: null, tk: 0 };

    function alive() { return st.page && st.page.isConnected; }
    function q(sel) { return st.page.querySelector(sel); }
    function statusOf(id) { return st.recs[id] || 'present'; }
    function find(id) { return st.people.filter(function (p) { return p.id === id; })[0]; }

    function sortList(list) {
      if (o.sort === 'alpha') return list.slice().sort(function (a, b) { return collator.compare(a.name, b.name); });
      return list;
    }
    function visible() {
      return sortList(st.people.filter(function (p) { return !o.grades || p.grade === st.grade; }));
    }
    function absentees(grade) {
      return sortList(st.people.filter(function (p) {
        return st.recs[p.id] === 'absent' && (!grade || p.grade === grade);
      }));
    }

    function render(root) {
      injectCss();
      st.root = root;
      st.date = Jalali.todayString();
      root.innerHTML =
        '<div class="page att-page">' +
        '<div class="page-head"><button class="back" data-page="dashboard">' + ic('back') + '</button><h2>' + o.title + '</h2></div>' +
        '<div class="datebar">' +
        '<button class="date-nav" data-act="prev" aria-label="روز قبل">' + ic('back') + '</button>' +
        '<button class="date-mid" data-act="pick" id="aDate"></button>' +
        '<button class="today-pill" data-act="today" id="aToday" hidden>امروز</button>' +
        '<button class="date-nav flip" data-act="next" aria-label="روز بعد">' + ic('back') + '</button></div>' +
        (o.grades ? '<div class="tabs" id="aTabs"></div>' : '') +
        '<div class="chips" id="aChips"></div>' +
        '<div class="att-list" id="aList"></div>' +
        '<div class="abs-box" id="aAbs"></div></div>';
      st.page = root.querySelector('.att-page');
      st.page.addEventListener('click', onClick);
      load();
    }

    function onClick(e) {
      var t = e.target.closest('[data-act]');
      if (t) {
        var a = t.getAttribute('data-act');
        if (a === 'prev') shift(-1);
        else if (a === 'next') shift(1);
        else if (a === 'pick') pickDate();
        else if (a === 'today') { st.date = Jalali.todayString(); load(); }
        else if (a === 'copy-all') UI.copy(reportText());
        return;
      }
      t = e.target.closest('[data-g]');
      if (t) { st.grade = Number(t.getAttribute('data-g')); draw(); return; }
      t = e.target.closest('[data-copy-g]');
      if (t) { UI.copy(reportText(Number(t.getAttribute('data-copy-g')))); return; }
      t = e.target.closest('[data-sms]');
      if (t) { sendSms(t.getAttribute('data-sms')); return; }
      t = e.target.closest('[data-phone]');
      if (t) { askPhone(t.getAttribute('data-phone')); return; }
      t = e.target.closest('[data-toggle]');
      if (t) { toggle(t.getAttribute('data-toggle')); return; }
      t = e.target.closest('[data-more]');
      if (t) { more(t.getAttribute('data-more')); return; }
    }

    function shift(n) { st.date = Jalali.addDays(st.date, n); load(); }

    async function load() {
      var tk = ++st.tk;
      var date = st.date;
      try {
        var people = await DB.getPeople({ type: o.type });
        var recs = await DB.getRecordsByDate(date, o.activity);
        var phones = (o.sms && window.Phones) ? await Phones.all() : {};
        var smsCfg = o.sms ? await SmsTpl.load() : null;
        if (tk !== st.tk || !alive()) return;
        st.phones = phones;
        st.smsCfg = smsCfg;
        st.people = people;
        st.recs = {};
        recs.forEach(function (r) { st.recs[r.personId] = r.status; });
      } catch (e) {
        UI.toast('خطا در خواندن اطلاعات', 'bad');
      }
      draw();
    }

    function draw() {
      if (!alive()) return;
      drawDate(); drawTabs(); drawChips(); drawList(); drawAbs();
    }

    function drawDate() {
      var now = Jalali.todayString();
      var tag = st.date === now ? 'امروز' : (st.date < now ? 'تاریخ گذشته' : 'تاریخ آینده');
      q('#aDate').innerHTML = UI.esc(Jalali.longDate(st.date)) + '<small>' + tag + '</small>';
      q('#aToday').hidden = st.date === now;
    }

    function drawTabs() {
      if (!o.grades) return;
      q('#aTabs').innerHTML = [10, 11, 12].map(function (g) {
        var ab = st.people.filter(function (p) { return p.grade === g && st.recs[p.id] === 'absent'; }).length;
        return '<button class="tab' + (g === st.grade ? ' active' : '') + '" data-g="' + g + '">پایه ' + GN[g] +
          '<small>' + UI.fa(ab) + ' غایب</small></button>';
      }).join('');
    }

    function drawChips() {
      var c = { present: 0, absent: 0, late: 0, leave: 0 };
      visible().forEach(function (p) { c[statusOf(p.id)]++; });
      q('#aChips').innerHTML =
        '<div class="chip g"><b>' + UI.fa(c.present) + '</b>حاضر</div>' +
        '<div class="chip r"><b>' + UI.fa(c.absent) + '</b>غایب</div>' +
        '<div class="chip o"><b>' + UI.fa(c.late) + '</b>تأخیر</div>' +
        '<div class="chip t"><b>' + UI.fa(c.leave) + '</b>مرخصی</div>';
    }

    function rowHtml(p) {
      var s = statusOf(p.id);
      return '<div class="att-row ' + s + '" data-row="' + p.id + '">' +
        '<button class="st-btn st-' + s + '" data-toggle="' + p.id + '" aria-label="' + LABEL[s] + '">' + ic(ICON[s]) + '</button>' +
        '<div class="att-name">' + UI.esc(p.name) + '</div>' +
        '<button class="att-more" data-more="' + p.id + '" aria-label="گزینه‌ها"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></svg></button>' +
        '</div>';
    }

    function drawList() {
      var el = q('#aList');
      var list = visible();
      if (!st.people.length) {
        el.innerHTML = '<div class="empty">' + o.emptyText + '<br><br><button class="btn primary" data-page="' + o.managePage + '">' + o.manageLabel + '</button></div>';
        return;
      }
      if (!list.length) { el.innerHTML = '<div class="empty">برای این پایه نامی ثبت نشده است.</div>'; return; }
      el.innerHTML = list.map(rowHtml).join('');
    }

    function updateRow(id) {
      var p = find(id);
      var el = st.page.querySelector('[data-row="' + id + '"]');
      if (p && el) el.outerHTML = rowHtml(p);
      drawTabs(); drawChips(); drawAbs();
    }

    function drawAbs() {
      var now = st.date === Jalali.todayString();
      var all = absentees();
      var h = '<h3>' + o.absentLabel + (now ? ' امروز' : ' این روز') + '<span class="abs-count">' + UI.fa(all.length) + ' نفر</span></h3>';
      if (!all.length) {
        h += '<div class="abs-grp">هیچ غایبی ثبت نشده است.</div>';
      } else if (o.grades && o.sms) {
        [10, 11, 12].forEach(function (g) {
          var l = absentees(g);
          if (!l.length) return;
          h += '<div class="abs-grp"><b>پایه ' + GN[g] + ':</b></div>';
          l.forEach(function (p) { h += absItem(p); });
        });
      } else if (o.grades) {
        [10, 11, 12].forEach(function (g) {
          var l = absentees(g);
          if (l.length) h += '<div class="abs-grp"><b>پایه ' + GN[g] + ':</b> ' + l.map(function (p) { return UI.esc(p.name); }).join('، ') + '</div>';
        });
      } else {
        h += '<div class="abs-grp">' + all.map(function (p) { return UI.esc(p.name); }).join('، ') + '</div>';
      }
      h += '<button class="copy-big" data-act="copy-all">' + ic('copy') + 'کپی اسامی غایبین</button>';
      if (o.sms) h += '<button class="sms-set" data-page="settings">✎ تغییر متن پیامک و نام مدرسه</button>';
      if (o.grades) {
        h += '<div class="copy-mini">' + [10, 11, 12].map(function (g) {
          return '<button class="btn ghost" data-copy-g="' + g + '">کپی پایه ' + GN[g] + '</button>';
        }).join('') + '</div>';
      }
      q('#aAbs').innerHTML = h;
    }

    var SMS_ICON = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

    function absItem(p) {
      var has = !!st.phones[p.id];
      return '<div class="abs-item"><span class="abs-nm">' + UI.esc(p.name) + '</span>' +
        (has ? '<button class="sms-btn" data-sms="' + p.id + '">' + SMS_ICON + 'پیام به والدین</button>'
             : '<button class="sms-btn none" data-phone="' + p.id + '">+ شماره والدین</button>') + '</div>';
    }

    function smsText(p) {
      var isToday = st.date === Jalali.todayString();
      var pp = Jalali.parse(st.date);
      var vars = {
        'نام': p.name,
        'روز': Jalali.DAYS[Jalali.weekday(pp.jy, pp.jm, pp.jd)],
        'تاریخ': UI.fa(st.date.replace(/-/g, '/')),
        'امروز': isToday ? 'امروز' : 'در روز'
      };
      return SmsTpl.build(st.smsCfg || SmsTpl.defaults(), o.sms === 'sport' ? 'sport' : 'daily', vars);
    }

    function openSms(phone, text) {
      location.href = 'sms:' + phone + '?body=' + encodeURIComponent(text);
    }

    function sendSms(id) {
      var p = find(id);
      if (!p) return;
      var phone = st.phones[id];
      if (!phone) { askPhone(id); return; }
      openSms(phone, smsText(p));
    }

    async function askPhone(id) {
      var p = find(id);
      if (!p || !window.Phones) return;
      var box = await UI.dialog({
        title: 'شماره والدین — ' + p.name,
        body: '<label>شماره موبایل والدین</label><input type="text" id="fPhone" inputmode="tel" autocomplete="off" placeholder="09123456789">',
        ok: 'ذخیره و ارسال پیام',
        validate: function (b) {
          return Phones.normalize(b.querySelector('#fPhone').value) ? '' : 'شماره موبایل معتبر نیست (مثال: 09123456789)';
        }
      });
      if (!box) return;
      var phone = Phones.normalize(box.querySelector('#fPhone').value);
      try { await Phones.set(id, phone); st.phones[id] = phone; }
      catch (e) { UI.toast('ذخیره شماره انجام نشد', 'bad'); return; }
      if (alive()) drawAbs();
      openSms(phone, smsText(p));
    }

    function reportText(onlyGrade) {
      var L = [o.reportTitle, 'تاریخ: ' + Jalali.longDate(st.date), ''];
      function block(list) {
        if (!list.length) return ['غایبی ندارد'];
        return list.map(function (p, i) { return UI.fa(i + 1) + '. ' + p.name; });
      }
      if (o.grades) {
        [10, 11, 12].forEach(function (g) {
          if (onlyGrade && g !== onlyGrade) return;
          L.push('پایه ' + GN[g] + ':');
          block(absentees(g)).forEach(function (x) { L.push(x); });
          L.push('');
        });
      } else {
        block(absentees()).forEach(function (x) { L.push(x); });
      }
      return L.join('\n').trim();
    }

    async function toggle(id) {
      var date = st.date, cur = st.recs[id];
      try {
        if (cur) { await DB.clearRecord(id, date, o.activity); if (date === st.date) delete st.recs[id]; }
        else { await DB.setRecord(id, date, o.activity, 'absent'); if (date === st.date) st.recs[id] = 'absent'; }
      } catch (e) { UI.toast(e.message, 'bad'); }
      if (alive() && date === st.date) updateRow(id);
    }

    async function more(id) {
      var p = find(id);
      if (!p) return;
      var s = await chooseStatus(p.name, statusOf(id));
      if (!s) return;
      var date = st.date;
      try {
        if (s === 'present') { await DB.clearRecord(id, date, o.activity); delete st.recs[id]; }
        else { await DB.setRecord(id, date, o.activity, s); st.recs[id] = s; }
      } catch (e) { UI.toast(e.message, 'bad'); }
      if (alive() && date === st.date) updateRow(id);
    }

    async function pickDate() {
      var p = Jalali.parse(st.date), ty = Jalali.today().jy, i;
      var ys = '', ms = '', ds = '';
      for (i = ty - 4; i <= ty + 1; i++) ys += '<option value="' + i + '"' + (i === p.jy ? ' selected' : '') + '>' + UI.fa(i) + '</option>';
      for (i = 1; i <= 12; i++) ms += '<option value="' + i + '"' + (i === p.jm ? ' selected' : '') + '>' + Jalali.MONTHS[i - 1] + '</option>';
      for (i = 1; i <= 31; i++) ds += '<option value="' + i + '"' + (i === p.jd ? ' selected' : '') + '>' + UI.fa(i) + '</option>';
      function vals(b) {
        return { y: Number(b.querySelector('#dY').value), m: Number(b.querySelector('#dM').value), d: Number(b.querySelector('#dD').value) };
      }
      var box = await UI.dialog({
        title: 'انتخاب تاریخ',
        body: '<div class="date-sel"><select id="dD">' + ds + '</select><select id="dM">' + ms + '</select><select id="dY">' + ys + '</select></div>',
        ok: 'نمایش',
        validate: function (b) {
          var v = vals(b), len = Jalali.monthLength(v.y, v.m);
          return v.d > len ? 'این ماه ' + UI.fa(len) + ' روز دارد' : '';
        }
      });
      if (!box) return;
      var v = vals(box);
      st.date = Jalali.format(v.y, v.m, v.d);
      load();
    }

    App.register(o.name, { render: render });
  }

  window.AttList = { create: create };

  create({
    name: 'attendance',
    title: 'حضور و غیاب دانش‌آموزان',
    type: 'student',
    activity: 'daily',
    grades: true,
    sort: 'alpha',
    reportTitle: 'گزارش غایبین هنرستان',
    absentLabel: 'غایبین',
    emptyText: 'هنوز دانش‌آموزی ثبت نشده است.',
    sms: 'daily',
    managePage: 'students',
    manageLabel: 'مدیریت دانش‌آموزان'
  });
})();
