(function () {
  'use strict';
  var collator = new Intl.Collator('fa');
  var st = { grade: 0, query: '', root: null, all: [], phones: {} };

  /* ---------- پایه‌ها (قابل تنظیم) ---------- */

  // فقط برای نام‌گذاری داده‌های قدیمی (دانش‌آموزانی که قبل از این قابلیت ثبت شده‌اند)
  var LEGACY_NAMES = { 10: 'پایه دهم', 11: 'پایه یازدهم', 12: 'پایه دوازدهم' };

  function validGradeList(v) {
    if (!Array.isArray(v)) return false;
    var seen = {};
    return v.every(function (g) {
      if (!g || !Number.isInteger(g.id) || g.id <= 0 || typeof g.name !== 'string' || !g.name.trim() || seen[g.id]) return false;
      seen[g.id] = true;
      return true;
    });
  }

  var Grades = {
    list: [],
    load: async function () {
      var v = await DB.getSetting('gradeList', null);
      if (validGradeList(v)) { Grades.list = v; return v; }
      // هنوز فهرست پایه ذخیره نشده: از روی دانش‌آموزان موجود ساخته می‌شود (نصب‌های قدیمی)
      var people = await DB.getPeople({ type: 'student' });
      var seen = {};
      people.forEach(function (p) { if (p.grade) seen[p.grade] = true; });
      var list = Object.keys(seen).map(Number).sort(function (a, b) { return a - b; }).map(function (id) {
        return { id: id, name: LEGACY_NAMES[id] || ('پایه ' + id) };
      });
      Grades.list = list;
      if (list.length) await DB.setSetting('gradeList', list);
      return list;
    },
    save: async function (list) {
      await DB.setSetting('gradeList', list);
      Grades.list = list;
    },
    ids: function () { return Grades.list.map(function (g) { return g.id; }); },
    has: function (id) { return Grades.list.some(function (g) { return g.id === id; }); },
    index: function (id) {
      for (var i = 0; i < Grades.list.length; i++) if (Grades.list[i].id === id) return i;
      return 999;
    },
    name: function (id) {
      for (var i = 0; i < Grades.list.length; i++) if (Grades.list[i].id === id) return Grades.list[i].name;
      return 'پایه ' + id;
    },
    sync: function (people) {
      people.forEach(function (p) {
        if (p.type === 'student' && p.grade && !Grades.has(p.grade)) Grades.list.push({ id: p.grade, name: 'پایه ' + p.grade });
      });
    }
  };
  window.Grades = Grades;

  /* ---------- شماره موبایل والدین ---------- */

  function latin(s) {
    return String(s)
      .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); });
  }

  function normalizePhone(raw) {
    var s = latin(raw || '').trim();
    if (!s) return '';
    var d = s.replace(/\D/g, '');
    if (d.indexOf('0098') === 0) d = d.slice(4);
    else if (d.indexOf('98') === 0 && d.length === 12) d = d.slice(2);
    if (d.length === 10 && d.charAt(0) === '9') d = '0' + d;
    return /^09\d{9}$/.test(d) ? d : null;
  }

  var Phones = {
    normalize: normalizePhone,
    all: async function () {
      var m = await DB.getSetting('parentPhones', {});
      return (m && typeof m === 'object' && !Array.isArray(m)) ? m : {};
    },
    setMany: async function (pairs) {
      var m = await Phones.all();
      Object.keys(pairs).forEach(function (id) {
        if (pairs[id]) m[id] = pairs[id]; else delete m[id];
      });
      await DB.setSetting('parentPhones', m);
    },
    set: function (id, phone) {
      var o = {};
      o[id] = phone;
      return Phones.setMany(o);
    }
  };
  window.Phones = Phones;

  var PHONE_MSG = 'شماره موبایل معتبر نیست (مثال: 09123456789)';

  /* ---------- ابزارها ---------- */

  function ic(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }
  function norm(s) { return String(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }
  function cleanName(s) { return norm(s).replace(/\s+/g, ' ').trim(); }

  function parseNames(text) {
    return text.split(/[\r\n]+/).map(function (l) {
      return l.replace(/^[\s•\-–—*]*[\d۰-۹٠-٩]+\s*[\.\-\)\:،\/\\]+\s*/, '')
              .replace(/^[\s•\-–—*]+/, '').trim();
    }).filter(function (n) { return n && !/^[\d۰-۹٠-٩\s\.\-\)]+$/.test(n); });
  }

  function parseEntries(text) {
    return parseNames(text).map(function (line) {
      var m = line.match(/(\+?[\d۰-۹٠-٩][\d۰-۹٠-٩\s\-]{8,}[\d۰-۹٠-٩])\s*$/);
      if (m) {
        var ph = normalizePhone(m[1]);
        if (ph) {
          var nm = line.slice(0, m.index).replace(/[\s,،\-–—:|;]+$/, '').trim();
          if (nm) return { name: nm, phone: ph };
        }
      }
      return { name: line, phone: '' };
    });
  }

  /* ---------- صفحه ---------- */

  function render(root) {
    st.root = root; st.query = '';
    root.innerHTML =
      '<div class="page">' +
      '<div class="page-head"><button class="back" data-page="dashboard">' + ic('back') + '</button><h2>مدیریت دانش‌آموزان</h2></div>' +
      '<div class="tabs" id="gTabs"></div>' +
      '<button class="link-btn" id="sGrades">⚙ مدیریت پایه‌ها (افزودن، تغییر نام، حذف)</button>' +
      '<div class="searchbox">' + ic('search') + '<input id="sQ" type="search" placeholder="جستجوی نام"></div>' +
      '<div class="btn-row"><button class="btn primary" id="sAdd">' + ic('plus') + 'افزودن</button>' +
      '<button class="btn ghost" id="sBulk">' + ic('list') + 'ورود گروهی</button></div>' +
      '<div class="list" id="sList"></div></div>';
    root.querySelector('#sQ').addEventListener('input', function (e) { st.query = e.target.value; drawList(); });
    root.querySelector('#sAdd').addEventListener('click', addOne);
    root.querySelector('#sBulk').addEventListener('click', addMany);
    root.querySelector('#sGrades').addEventListener('click', manageGrades);
    root.querySelector('#gTabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-g]');
      if (!b) return;
      st.grade = Number(b.getAttribute('data-g')); drawTabs(); drawList();
    });
    root.querySelector('#sList').addEventListener('click', function (e) {
      var ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
      if (ed) edit(ed.getAttribute('data-edit'));
      if (dl) del(dl.getAttribute('data-del'));
    });
    reload();
  }

  async function reload() {
    try {
      await Grades.load();
      st.all = await DB.getPeople({ type: 'student' });
      st.phones = await Phones.all();
      Grades.sync(st.all);
    } catch (e) { UI.toast('خطا در خواندن اطلاعات', 'bad'); st.all = []; st.phones = {}; }
    if (!Grades.has(st.grade)) st.grade = Grades.list.length ? Grades.list[0].id : 0;
    drawTabs(); drawList();
  }

  function drawTabs() {
    st.root.querySelector('#gTabs').innerHTML = Grades.list.map(function (g) {
      var n = st.all.filter(function (s) { return s.grade === g.id; }).length;
      return '<button class="tab' + (g.id === st.grade ? ' active' : '') + '" data-g="' + g.id + '">' + UI.esc(g.name) +
        '<small>' + UI.fa(n) + ' نفر</small></button>';
    }).join('');
  }

  function drawList() {
    var q = norm(st.query).trim();
    var inGrade = st.all.filter(function (s) { return s.grade === st.grade; });
    var rows = inGrade.filter(function (s) { return !q || norm(s.name).indexOf(q) !== -1; })
      .sort(function (a, b) { return collator.compare(a.name, b.name); });
    var el = st.root.querySelector('#sList');
    if (!Grades.list.length) {
      el.innerHTML = '<div class="empty">هنوز هیچ پایه‌ای تعریف نشده است.<br>ابتدا پایه‌های مدرسه را بسازید (مثلاً «هفتم»، «هشتم» یا هر اسم دیگر).<br><br>' +
        '<button class="btn primary" id="sFirstGrade">' + ic('plus') + 'تعریف پایه‌ها</button></div>';
      var fb = el.querySelector('#sFirstGrade');
      if (fb) fb.addEventListener('click', manageGrades);
      return;
    }
    if (!inGrade.length) {
      el.innerHTML = '<div class="empty">هنوز دانش‌آموزی برای «' + UI.esc(Grades.name(st.grade)) +
        '» ثبت نشده است.<br>با «ورود گروهی» می‌توانید کل فهرست را یک‌جا Paste کنید.</div>';
      return;
    }
    if (!rows.length) { el.innerHTML = '<div class="empty">موردی پیدا نشد.</div>'; return; }
    el.innerHTML = rows.map(function (s, i) {
      var ph = st.phones[s.id];
      return '<div class="row"><div class="avatar">' + UI.fa(i + 1) + '</div><div class="name">' + UI.esc(s.name) +
        (ph ? '<small style="display:block;font-weight:500;font-size:.72rem;opacity:.65">والدین: ' + UI.fa(ph) + '</small>' : '') + '</div>' +
        '<button class="icon-btn" data-edit="' + s.id + '">' + ic('edit') + '</button>' +
        '<button class="icon-btn danger" data-del="' + s.id + '">' + ic('trash') + '</button></div>';
    }).join('');
  }

  /* ---------- مدیریت پایه‌ها ---------- */

  function manageGrades() {
    var work = Grades.list.map(function (g) { return { id: g.id, name: g.name }; });
    var counts = {};
    st.all.forEach(function (s) { counts[s.grade] = (counts[s.grade] || 0) + 1; });
    var ov = document.createElement('div');
    ov.className = 'overlay';
    document.body.appendChild(ov);

    function draw() {
      ov.innerHTML = '<div class="dlg"><h3>مدیریت پایه‌ها</h3>' +
        '<div class="hint">نام هر پایه را هر طور خواستید بنویسید (مثلاً «هفتم»، «پایه دهم رشته الف»). با فلش‌ها ترتیب را عوض کنید.</div>' +
        '<div>' + work.map(function (g, i) {
          return '<div class="gm-row"><input type="text" data-i="' + i + '" value="' + UI.esc(g.name) + '">' +
            '<button class="gm-btn up" data-up="' + i + '">' + ic('back') + '</button>' +
            '<button class="gm-btn dn" data-dn="' + i + '">' + ic('back') + '</button>' +
            '<button class="gm-btn del" data-del="' + i + '">' + ic('trash') + '</button></div>';
        }).join('') + '</div>' +
        '<button class="btn ghost" data-add style="margin-top:12px;width:100%">' + ic('plus') + 'افزودن پایه جدید</button>' +
        '<div class="dlg-err" hidden></div>' +
        '<div class="dlg-actions"><button class="btn primary" data-save>ذخیره</button><button class="btn ghost" data-cancel>انصراف</button></div></div>';
    }
    function showErr(m) { var e = ov.querySelector('.dlg-err'); e.textContent = m; e.hidden = false; }
    draw();

    ov.addEventListener('input', function (e) {
      var i = e.target.getAttribute('data-i');
      if (i !== null) work[Number(i)].name = e.target.value;
    });
    ov.addEventListener('click', async function (e) {
      var t = e.target.closest('button');
      if (!t) { if (e.target === ov) ov.remove(); return; }
      if (t.hasAttribute('data-cancel')) { ov.remove(); return; }
      if (t.hasAttribute('data-add')) {
        var next = Math.max.apply(null, work.map(function (g) { return g.id; }).concat(Object.keys(counts).map(Number)).concat([0])) + 1;
        work.push({ id: next, name: '' });
        draw();
        var inputs = ov.querySelectorAll('input[data-i]');
        if (inputs.length) inputs[inputs.length - 1].focus();
        return;
      }
      if (t.hasAttribute('data-up') || t.hasAttribute('data-dn')) {
        var up = t.hasAttribute('data-up');
        var i = Number(t.getAttribute(up ? 'data-up' : 'data-dn')), j = up ? i - 1 : i + 1;
        if (j < 0 || j >= work.length) return;
        var tmp = work[i]; work[i] = work[j]; work[j] = tmp;
        draw();
        return;
      }
      if (t.hasAttribute('data-del')) {
        var k = Number(t.getAttribute('data-del'));
        if (counts[work[k].id]) { showErr('این پایه دانش‌آموز دارد. ابتدا آن‌ها را به پایه دیگری ببرید (ویرایش دانش‌آموز) یا حذف کنید.'); return; }
        work.splice(k, 1);
        draw();
        return;
      }
      if (t.hasAttribute('data-save')) {
        var names = {};
        for (var n = 0; n < work.length; n++) {
          var nm = work[n].name.trim();
          if (!nm) { showErr('نام همه پایه‌ها را وارد کنید.'); return; }
          if (names[nm]) { showErr('نام دو پایه نباید یکسان باشد.'); return; }
          names[nm] = true;
          work[n].name = nm;
        }
        try {
          await Grades.save(work);
          ov.remove();
          UI.toast('پایه‌ها ذخیره شد', 'ok');
          reload();
        } catch (err) { showErr('ذخیره انجام نشد.'); }
      }
    });
  }

  /* ---------- افزودن، ویرایش، حذف ---------- */

  async function addOne() {
    if (!Grades.list.length) { manageGrades(); return; }
    var box = await UI.dialog({
      title: 'افزودن دانش‌آموز، ' + Grades.name(st.grade),
      body: '<label>نام و نام خانوادگی</label><input type="text" id="fName" autocomplete="off">' +
        '<label>شماره موبایل والدین (اختیاری)</label><input type="text" id="fPhone" inputmode="tel" autocomplete="off" placeholder="09123456789">',
      ok: 'افزودن',
      validate: function (b) {
        if (!b.querySelector('#fName').value.trim()) return 'نام را وارد کنید';
        return Phones.normalize(b.querySelector('#fPhone').value) === null ? PHONE_MSG : '';
      }
    });
    if (!box) return;
    try {
      var p = await DB.addPerson({ name: box.querySelector('#fName').value, type: 'student', grade: st.grade });
      var phone = Phones.normalize(box.querySelector('#fPhone').value);
      if (phone) await Phones.set(p.id, phone);
      UI.toast('اضافه شد', 'ok');
    } catch (e) { UI.toast(e.message, 'bad'); }
    reload();
  }

  async function addMany() {
    if (!Grades.list.length) { manageGrades(); return; }
    var box = await UI.dialog({
      title: 'ورود گروهی، ' + Grades.name(st.grade),
      body: '<label>هر نام در یک خط</label><textarea id="fMany"></textarea>' +
        '<div class="hint">شماره ابتدای خط‌ها خودکار حذف می‌شود و نام‌های تکراری ثبت نمی‌شوند. اگر می‌خواهید، شماره موبایل والدین را آخر هر خط بنویسید (مثلاً: علی احمدی 09123456789).</div>',
      ok: 'ثبت فهرست',
      validate: function (b) { return parseEntries(b.querySelector('#fMany').value).length ? '' : 'حداقل یک نام وارد کنید'; }
    });
    if (!box) return;
    var entries = parseEntries(box.querySelector('#fMany').value);
    var byName = {};
    entries.forEach(function (e) { if (e.phone) byName[cleanName(e.name)] = e.phone; });
    var list = entries.map(function (e) { return { name: e.name, type: 'student', grade: st.grade }; });
    try {
      var r = await DB.addPeople(list);
      var pairs = {}, n = 0;
      r.people.forEach(function (p) { if (byName[p.name]) { pairs[p.id] = byName[p.name]; n++; } });
      if (n) await Phones.setMany(pairs);
      UI.toast(UI.fa(r.added) + ' نفر اضافه شد' + (n ? ' (' + UI.fa(n) + ' شماره ثبت شد)' : '') +
        (r.skipped ? ' (' + UI.fa(r.skipped) + ' تکراری رد شد)' : ''), 'ok');
    } catch (e) { UI.toast(e.message, 'bad'); }
    reload();
  }

  async function edit(id) {
    var p = st.all.filter(function (s) { return s.id === id; })[0];
    if (!p) return;
    var opts = Grades.list.map(function (g) {
      return '<option value="' + g.id + '"' + (g.id === p.grade ? ' selected' : '') + '>' + UI.esc(g.name) + '</option>';
    }).join('');
    var box = await UI.dialog({
      title: 'ویرایش دانش‌آموز',
      body: '<label>نام و نام خانوادگی</label><input type="text" id="fName" value="' + UI.esc(p.name) + '">' +
        '<label>پایه</label><select id="fGrade">' + opts + '</select>' +
        '<label>شماره موبایل والدین (اختیاری)</label><input type="text" id="fPhone" inputmode="tel" autocomplete="off" value="' +
        UI.esc(st.phones[id] || '') + '" placeholder="09123456789">',
      ok: 'ذخیره',
      validate: function (b) {
        if (!b.querySelector('#fName').value.trim()) return 'نام را وارد کنید';
        return Phones.normalize(b.querySelector('#fPhone').value) === null ? PHONE_MSG : '';
      }
    });
    if (!box) return;
    try {
      await DB.updatePerson(id, { name: box.querySelector('#fName').value, grade: box.querySelector('#fGrade').value });
      await Phones.set(id, Phones.normalize(box.querySelector('#fPhone').value));
      UI.toast('ذخیره شد', 'ok');
    } catch (e) { UI.toast(e.message, 'bad'); }
    reload();
  }

  async function del(id) {
    var p = st.all.filter(function (s) { return s.id === id; })[0];
    if (!p) return;
    var yes = await UI.confirm('«' + p.name + '» حذف شود؟ همه سوابق حضور و غیاب، گزارش‌های انضباطی و شماره والدینش هم پاک می‌شود و قابل برگشت نیست.', 'حذف', true);
    if (!yes) return;
    try {
      await DB.deletePerson(id);
      await Phones.set(id, '');
      if (window.Incidents) await Incidents.removeByPerson(id);
      UI.toast('حذف شد', 'ok');
    } catch (e) { UI.toast(e.message, 'bad'); }
    reload();
  }

  App.register('students', { render: render });
})();
