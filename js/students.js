(function () {
  'use strict';
  var NAMES = { 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم' };
  var collator = new Intl.Collator('fa');
  var st = { grade: 10, query: '', root: null, all: [] };

  function ic(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }
  function norm(s) { return String(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }

  function parseNames(text) {
    return text.split(/[\r\n]+/).map(function (l) {
      return l.replace(/^[\s•\-–—*]*[\d۰-۹٠-٩]+\s*[\.\-\)\:،\/\\]+\s*/, '')
              .replace(/^[\s•\-–—*]+/, '').trim();
    }).filter(function (n) { return n && !/^[\d۰-۹٠-٩\s\.\-\)]+$/.test(n); });
  }

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
    try { st.all = await DB.getPeople({ type: 'student' }); }
    catch (e) { UI.toast('خطا در خواندن اطلاعات', 'bad'); st.all = []; }
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
      return '<div class="row"><div class="avatar">' + UI.fa(i + 1) + '</div><div class="name">' + UI.esc(s.name) + '</div>' +
        '<button class="icon-btn" data-edit="' + s.id + '">' + ic('edit') + '</button>' +
        '<button class="icon-btn danger" data-del="' + s.id + '">' + ic('trash') + '</button></div>';
    }).join('');
  }

  async function addOne() {
    var box = await UI.dialog({
      title: 'افزودن دانش‌آموز، پایه ' + NAMES[st.grade],
      body: '<label>نام و نام خانوادگی</label><input type="text" id="fName" autocomplete="off">',
      ok: 'افزودن',
      validate: function (b) { return b.querySelector('#fName').value.trim() ? '' : 'نام را وارد کنید'; }
    });
    if (!box) return;
    try {
      await DB.addPerson({ name: box.querySelector('#fName').value, type: 'student', grade: st.grade });
      UI.toast('اضافه شد', 'ok');
    } catch (e) { UI.toast(e.message, 'bad'); }
    reload();
  }

  async function addMany() {
    var box = await UI.dialog({
      title: 'ورود گروهی، پایه ' + NAMES[st.grade],
      body: '<label>هر نام در یک خط</label><textarea id="fMany"></textarea>' +
        '<div class="hint">شماره ابتدای خط‌ها خودکار حذف می‌شود و نام‌های تکراری ثبت نمی‌شوند.</div>',
      ok: 'ثبت فهرست',
      validate: function (b) { return parseNames(b.querySelector('#fMany').value).length ? '' : 'حداقل یک نام وارد کنید'; }
    });
    if (!box) return;
    var list = parseNames(box.querySelector('#fMany').value).map(function (n) {
      return { name: n, type: 'student', grade: st.grade };
    });
    try {
      var r = await DB.addPeople(list);
      UI.toast(UI.fa(r.added) + ' نفر اضافه شد' + (r.skipped ? ' (' + UI.fa(r.skipped) + ' تکراری رد شد)' : ''), 'ok');
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
        '<label>پایه</label><select id="fGrade">' + opts + '</select>',
      ok: 'ذخیره',
      validate: function (b) { return b.querySelector('#fName').value.trim() ? '' : 'نام را وارد کنید'; }
    });
    if (!box) return;
    try {
      await DB.updatePerson(id, { name: box.querySelector('#fName').value, grade: box.querySelector('#fGrade').value });
      UI.toast('ذخیره شد', 'ok');
    } catch (e) { UI.toast(e.message, 'bad'); }
    reload();
  }

  async function del(id) {
    var p = st.all.filter(function (s) { return s.id === id; })[0];
    if (!p) return;
    var yes = await UI.confirm('«' + p.name + '» حذف شود؟ همه سوابق حضور و غیاب او هم پاک می‌شود و قابل برگشت نیست.', 'حذف', true);
    if (!yes) return;
    try { await DB.deletePerson(id); UI.toast('حذف شد', 'ok'); }
    catch (e) { UI.toast(e.message, 'bad'); }
    reload();
  }

  App.register('students', { render: render });
})();
