(function () {
  'use strict';
  var NAMES = { 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم' };
  var collator = new Intl.Collator('fa');
  var st = { grade: 10, query: '', root: null, all: [], phones: {} };

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
      '<div class="searchbox">' + ic('search') + '<input id="sQ" type="search" placeholder="جستجوی نام"></div>' +
      '<div class="btn-row"><button class="btn primary" id="sAdd">' + ic('plus') + 'افزودن</button>' +
      '<button class="btn ghost" id="sBulk">' + ic('list') + 'ورود گروهی</button></div>' +
      '<div class="list" id="sList"></div></div>';
    root.querySelector('#sQ').addEventListener('input', function (e) { st.query = e.target.value; drawList(); });
    root.querySelector('#sAdd').addEventListener('click', addOne);
    root.querySelector('#sBulk').addEventListener('click', addMany);
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
      st.all = await DB.getPeople({ type: 'student' });
      st.phones = await Phones.all();
    } catch (e) { UI.toast('خطا در خواندن اطلاعات', 'bad'); st.all = []; st.phones = {}; }
    drawTabs(); drawList();
  }

  function drawTabs() {
    st.root.querySelector('#gTabs').innerHTML = [10, 11, 12].map(function (g) {
      var n = st.all.filter(function (s) { return s.grade === g; }).length;
      return '<button class="tab' + (g === st.grade ? ' active' : '') + '" data-g="' + g + '">پایه ' + NAMES[g] +
        '<small>' + UI.fa(n) + ' نفر</small></button>';
    }).join('');
  }

  function drawList() {
    var q = norm(st.query).trim();
    var inGrade = st.all.filter(function (s) { return s.grade === st.grade; });
    var rows = inGrade.filter(function (s) { return !q || norm(s.name).indexOf(q) !== -1; })
      .sort(function (a, b) { return collator.compare(a.name, b.name); });
    var el = st.root.querySelector('#sList');
    if (!inGrade.length) {
      el.innerHTML = '<div class="empty">هنوز دانش‌آموزی برای پایه ' + NAMES[st.grade] +
        ' ثبت نشده است.<br>با «ورود گروهی» می‌توانید کل فهرست را یک‌جا Paste کنید.</div>';
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

  async function addOne() {
    var box = await UI.dialog({
      title: 'افزودن دانش‌آموز، پایه ' + NAMES[st.grade],
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
    var box = await UI.dialog({
      title: 'ورود گروهی، پایه ' + NAMES[st.grade],
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
    var opts = [10, 11, 12].map(function (g) {
      return '<option value="' + g + '"' + (g === p.grade ? ' selected' : '') + '>پایه ' + NAMES[g] + '</option>';
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
    var yes = await UI.confirm('«' + p.name + '» حذف شود؟ همه سوابق حضور و غیاب او و شماره والدینش هم پاک می‌شود و قابل برگشت نیست.', 'حذف', true);
    if (!yes) return;
    try { await DB.deletePerson(id); await Phones.set(id, ''); UI.toast('حذف شد', 'ok'); }
    catch (e) { UI.toast(e.message, 'bad'); }
    reload();
  }

  App.register('students', { render: render });
})();
