(function () {
  'use strict';

  var DEFAULT_TYPES = ['درگیری در فضای مدرسه', 'بی‌انضباطی در کلاس', 'شوخی بی‌جا با همکلاسی', 'اخراج از کلاس توسط معلم', 'شکایت همکلاس'];
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var collator = new Intl.Collator('fa');
  var st = { grade: 0, query: '', view: null, people: [], incidents: [], types: [], page: null, tk: 0 };

  var CSS = '' +
    '#print-root{display:none}' +
    '.dc-row{width:100%;background:var(--card);border-radius:18px;box-shadow:var(--shadow);padding:10px 12px;display:flex;align-items:center;gap:10px;margin-bottom:8px;text-align:right;color:var(--navy)}' +
    '.dc-row .nm{flex:1;font-weight:600;font-size:.95rem}' +
    '.dc-count{font-size:.75rem;border-radius:10px;padding:2px 10px;font-weight:700;background:var(--bg);color:#5B6E8A}' +
    '.dc-count.has{background:#F7E4E6;color:var(--red)}' +
    '.dc-card{margin-top:14px;background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px}' +
    '.dc-name{font-size:1.1rem;font-weight:800}' +
    '.dc-sub{font-size:.85rem;opacity:.7;margin-top:2px}' +
    '.dc-item{margin-top:12px;background:var(--card);border-radius:18px;box-shadow:var(--shadow);padding:14px}' +
    '.dc-date{font-size:.85rem;font-weight:700;color:var(--blue)}' +
    '.dc-types{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '.dc-chip{background:#F7E4E6;color:var(--red);border-radius:12px;padding:3px 10px;font-size:.78rem;font-weight:700}' +
    '.dc-text{margin-top:8px;font-size:.9rem;line-height:2;white-space:pre-wrap}' +
    '.dc-actions{display:flex;gap:8px;margin-top:10px}' +
    '.dc-dsel{display:flex;gap:6px}' +
    '.dc-dsel select{flex:1;width:auto}' +
    '.dc-opts{display:flex;flex-direction:column;gap:6px;margin-top:6px}' +
    '.dlg label.dc-opt{display:flex;align-items:center;gap:10px;background:var(--bg);border-radius:14px;padding:10px 12px;font-size:.92rem;margin:0;opacity:1}' +
    '.dlg .dc-opt input{width:20px;height:20px;padding:0;accent-color:var(--blue);flex:none}' +
    '.dc-addtype{display:flex;gap:8px;margin-top:8px}' +
    '.dc-addtype input{flex:1;min-width:0}' +
    '.dc-addtype .btn{flex:none;padding:10px 14px}' +
    '.dc-trow{display:flex;align-items:center;gap:8px;margin-top:8px;background:var(--bg);border-radius:14px;padding:8px 8px 8px 12px}' +
    '.dc-trow span{flex:1;font-size:.92rem}' +
    '@media print{' +
    '@page{size:A4;margin:12mm}' +
    'body>*:not(#print-root){display:none!important}' +
    'body{padding:0!important;background:#fff!important}' +
    '#print-root{display:block!important;background:#fff;color:#000;direction:rtl}' +
    '#print-root h1{font-size:16pt;margin-bottom:4pt}' +
    '#print-root .pr-meta{font-size:10pt;margin-bottom:8pt}' +
    '#print-root p{font-size:11pt}' +
    '.pr-table{width:100%;border-collapse:collapse;font-size:10.5pt}' +
    '.pr-table th,.pr-table td{border:1px solid #888;padding:4pt 6pt;text-align:right;vertical-align:top}' +
    '.pr-table th{background:#E6F3FA}' +
    '.pr-table thead{display:table-header-group}' +
    '.pr-table tr{page-break-inside:avoid}' +
    '}';

  function ic(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }
  function fa(v) { return UI.fa(v); }
  function esc(s) { return UI.esc(s); }
  function alive() { return st.page && st.page.isConnected; }
  function q(sel) { return st.page.querySelector(sel); }
  function newId() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  function injectCss() {
    if (document.getElementById('dc-css')) return;
    var s = document.createElement('style');
    s.id = 'dc-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- داده‌ها (داخل بخش تنظیمات ذخیره می‌شود و در پشتیبان هم هست) ---------- */

  function validIncident(i) {
    return i && typeof i === 'object' && typeof i.id === 'string' && typeof i.personId === 'string' &&
      typeof i.date === 'string' && DATE_RE.test(i.date) && Array.isArray(i.types) && typeof i.text === 'string';
  }
  async function loadIncidents() {
    var v = await DB.getSetting('incidents', []);
    return Array.isArray(v) ? v.filter(validIncident) : [];
  }
  function saveIncidents(list) { return DB.setSetting('incidents', list); }
  async function loadTypes() {
    var v = await DB.getSetting('disciplineTypes', null);
    return (Array.isArray(v) && v.every(function (x) { return typeof x === 'string'; })) ? v : DEFAULT_TYPES.slice();
  }
  function saveTypes(list) { return DB.setSetting('disciplineTypes', list); }

  window.Incidents = {
    removeByPerson: async function (personId) {
      var list = await loadIncidents();
      var rest = list.filter(function (i) { return i.personId !== personId; });
      if (rest.length !== list.length) await saveIncidents(rest);
    }
  };

  function incidentsOf(personId, asc) {
    var list = st.incidents.filter(function (i) { return i.personId === personId; });
    list.sort(function (a, b) {
      var d = a.date < b.date ? -1 : (a.date > b.date ? 1 : 0);
      if (!d) d = (a.createdAt || 0) - (b.createdAt || 0);
      return asc ? d : -d;
    });
    return list;
  }
  function countOf(personId) {
    return st.incidents.filter(function (i) { return i.personId === personId; }).length;
  }
  function personById(id) { return st.people.filter(function (p) { return p.id === id; })[0]; }

  /* ---------- صفحه ---------- */

  function render(root) {
    injectCss();
    st.query = ''; st.view = null;
    root.innerHTML =
      '<div class="page dc-page"><div class="page-head"><button class="back" data-act="back">' + ic('back') +
      '</button><h2 id="dcTitle">گزارش انضباطی دانش‌آموزان</h2></div><div id="dcBody"></div></div>';
    st.page = root.querySelector('.dc-page');
    st.page.addEventListener('click', onClick);
    st.page.addEventListener('input', function (e) {
      if (e.target.id === 'dcQ') { st.query = e.target.value; drawRows(); }
    });
    load();
  }

  async function load() {
    var tk = ++st.tk;
    try {
      await Grades.load();
      var people = await DB.getPeople({ type: 'student' });
      Grades.sync(people);
      var inc = await loadIncidents();
      var types = await loadTypes();
      if (tk !== st.tk || !alive()) return;
      st.people = people; st.incidents = inc; st.types = types;
    } catch (e) { UI.toast('خطا در خواندن اطلاعات', 'bad'); }
    if (!Grades.has(st.grade)) st.grade = Grades.list.length ? Grades.list[0].id : 0;
    draw();
  }

  function draw() {
    if (!alive()) return;
    if (st.view && personById(st.view)) drawDetail(); else { st.view = null; drawList(); }
  }

  function norm(s) { return String(s).replace(/ي/g, 'ی').replace(/ك/g, 'ک'); }

  function drawList() {
    q('#dcTitle').textContent = 'گزارش انضباطی دانش‌آموزان';
    if (!Grades.list.length || !st.people.length) {
      q('#dcBody').innerHTML = '<div class="empty">هنوز دانش‌آموزی ثبت نشده است.<br>ابتدا از «مدیریت دانش‌آموزان» پایه و دانش‌آموز اضافه کنید.<br><br>' +
        '<button class="btn primary" data-page="students">مدیریت دانش‌آموزان</button></div>';
      return;
    }
    q('#dcBody').innerHTML =
      '<div class="tabs" id="dcTabs"></div>' +
      '<div class="searchbox">' + ic('search') + '<input id="dcQ" type="search" placeholder="جستجوی نام دانش‌آموز" value="' + esc(st.query) + '"></div>' +
      '<button class="link-btn" data-act="types">⚙ مدیریت فهرست موارد انضباطی</button>' +
      '<div class="list" id="dcList"></div>';
    drawTabs(); drawRows();
  }

  function drawTabs() {
    q('#dcTabs').innerHTML = Grades.list.map(function (g) {
      var n = st.people.filter(function (p) { return p.grade === g.id; }).length;
      return '<button class="tab' + (g.id === st.grade ? ' active' : '') + '" data-g="' + g.id + '">' + esc(g.name) +
        '<small>' + fa(n) + ' نفر</small></button>';
    }).join('');
  }

  function drawRows() {
    var k = norm(st.query).trim();
    var rows = st.people.filter(function (p) { return p.grade === st.grade && (!k || norm(p.name).indexOf(k) !== -1); })
      .sort(function (a, b) { return collator.compare(a.name, b.name); });
    var el = q('#dcList');
    if (!rows.length) { el.innerHTML = '<div class="empty">' + (k ? 'موردی پیدا نشد.' : 'برای این پایه دانش‌آموزی ثبت نشده است.') + '</div>'; return; }
    el.innerHTML = rows.map(function (p, i) {
      var n = countOf(p.id);
      return '<button class="dc-row" data-student="' + p.id + '"><span class="avatar">' + fa(i + 1) + '</span><span class="nm">' + esc(p.name) +
        '</span><span class="dc-count' + (n ? ' has' : '') + '">' + fa(n) + ' گزارش</span></button>';
    }).join('');
  }

  function drawDetail() {
    var p = personById(st.view);
    q('#dcTitle').textContent = p.name;
    var items = incidentsOf(p.id, false);
    var h = '<div class="dc-card"><div class="dc-name">' + esc(p.name) + '</div><div class="dc-sub">' + esc(Grades.name(p.grade)) +
      ' · ' + fa(items.length) + ' گزارش ثبت‌شده</div>' +
      '<div class="btn-row"><button class="btn primary" data-act="add">' + ic('plus') + 'ثبت گزارش جدید</button></div>' +
      '<div class="btn-row"><button class="btn ghost" data-act="copy">' + ic('copy') + 'کپی گزارش‌ها</button>' +
      '<button class="btn ghost" data-act="print">' + ic('list') + 'PDF / چاپ</button></div></div>';
    if (!items.length) {
      h += '<div class="empty">هنوز گزارشی برای این دانش‌آموز ثبت نشده است.</div>';
    } else {
      h += items.map(function (it) {
        return '<div class="dc-item"><div class="dc-date">' + esc(Jalali.longDate(it.date)) + '</div>' +
          (it.types.length ? '<div class="dc-types">' + it.types.map(function (t) { return '<span class="dc-chip">' + esc(t) + '</span>'; }).join('') + '</div>' : '') +
          (it.text ? '<div class="dc-text">' + esc(it.text) + '</div>' : '') +
          '<div class="dc-actions"><button class="icon-btn" data-edit="' + it.id + '">' + ic('edit') + '</button>' +
          '<button class="icon-btn danger" data-del="' + it.id + '">' + ic('trash') + '</button></div></div>';
      }).join('');
    }
    q('#dcBody').innerHTML = h;
    window.scrollTo(0, 0);
  }

  function onClick(e) {
    var t = e.target.closest('[data-act]');
    if (t) {
      var a = t.getAttribute('data-act');
      if (a === 'back') { if (st.view) { st.view = null; draw(); } else App.go('dashboard'); }
      else if (a === 'add') addIncident();
      else if (a === 'copy') UI.copy(studentText(personById(st.view)));
      else if (a === 'print') printStudent(personById(st.view));
      else if (a === 'types') manageTypes();
      return;
    }
    t = e.target.closest('[data-g]');
    if (t) { st.grade = Number(t.getAttribute('data-g')); drawTabs(); drawRows(); return; }
    t = e.target.closest('[data-student]');
    if (t) { st.view = t.getAttribute('data-student'); draw(); return; }
    t = e.target.closest('[data-edit]');
    if (t) { editIncident(t.getAttribute('data-edit')); return; }
    t = e.target.closest('[data-del]');
    if (t) { deleteIncident(t.getAttribute('data-del')); return; }
  }

  /* ---------- ثبت، ویرایش و حذف ---------- */

  function incidentDialog(p, inc) {
    return new Promise(function (resolve) {
      var d = Jalali.parse(inc ? inc.date : Jalali.todayString());
      var ty = Jalali.today().jy;
      var form = { y: d.jy, m: d.jm, d: d.jd, text: inc ? inc.text : '', sel: {} };
      (inc ? inc.types : []).forEach(function (t) { form.sel[t] = true; });
      var types = st.types.slice();
      (inc ? inc.types : []).forEach(function (t) { if (types.indexOf(t) === -1) types.push(t); });
      var ov = document.createElement('div');
      ov.className = 'overlay';
      document.body.appendChild(ov);

      function opts(from, to, sel, fmt) {
        var s = '';
        for (var i = from; i <= to; i++) s += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + fmt(i) + '</option>';
        return s;
      }
      function capture() {
        form.y = Number(ov.querySelector('#dcY').value);
        form.m = Number(ov.querySelector('#dcM').value);
        form.d = Number(ov.querySelector('#dcD').value);
        form.text = ov.querySelector('#dcText').value;
        types.forEach(function (t, i) {
          var cb = ov.querySelector('input[data-t="' + i + '"]');
          if (cb) form.sel[t] = cb.checked;
        });
      }
      function draw() {
        ov.innerHTML = '<div class="dlg"><h3>' + (inc ? 'ویرایش گزارش' : 'ثبت گزارش انضباطی') + ' — ' + esc(p.name) + '</h3>' +
          '<label>تاریخ</label><div class="dc-dsel"><select id="dcD">' + opts(1, 31, form.d, fa) + '</select><select id="dcM">' +
          opts(1, 12, form.m, function (i) { return Jalali.MONTHS[i - 1]; }) + '</select><select id="dcY">' + opts(ty - 6, ty + 1, form.y, fa) + '</select></div>' +
          '<label>مورد انضباطی (می‌توانید چند مورد انتخاب کنید)</label><div class="dc-opts">' +
          types.map(function (t, i) {
            return '<label class="dc-opt"><input type="checkbox" data-t="' + i + '"' + (form.sel[t] ? ' checked' : '') + '><span>' + esc(t) + '</span></label>';
          }).join('') + '</div>' +
          '<div class="dc-addtype"><input type="text" id="dcNew" placeholder="مورد جدید..."><button class="btn ghost" data-addtype>افزودن</button></div>' +
          '<label>گزارش من (توضیحات)</label><textarea id="dcText" style="min-height:120px">' + esc(form.text) + '</textarea>' +
          '<div class="dlg-err" hidden></div>' +
          '<div class="dlg-actions"><button class="btn primary" data-save>ذخیره</button><button class="btn ghost" data-cancel>انصراف</button></div></div>';
      }
      function showErr(m) { var e = ov.querySelector('.dlg-err'); e.textContent = m; e.hidden = false; }
      function close(r) { ov.remove(); resolve(r); }
      draw();

      ov.addEventListener('click', async function (e) {
        var b = e.target.closest('button');
        if (!b) { if (e.target === ov) close(null); return; }
        if (b.hasAttribute('data-cancel')) { close(null); return; }
        if (b.hasAttribute('data-addtype')) {
          var v = ov.querySelector('#dcNew').value.trim();
          if (!v) return;
          capture();
          var isNew = types.indexOf(v) === -1;
          if (isNew) types.push(v);
          form.sel[v] = true;
          draw();
          if (isNew && st.types.indexOf(v) === -1) {
            st.types.push(v);
            try { await saveTypes(st.types); } catch (err) { /* فقط برای همین گزارش می‌ماند */ }
          }
          return;
        }
        if (b.hasAttribute('data-save')) {
          capture();
          var len = Jalali.monthLength(form.y, form.m);
          if (form.d > len) { showErr('این ماه ' + fa(len) + ' روز دارد.'); return; }
          var chosen = types.filter(function (t) { return form.sel[t]; });
          var text = form.text.trim();
          if (!chosen.length && !text) { showErr('حداقل یک مورد را انتخاب کنید یا توضیحات بنویسید.'); return; }
          if (text.length > 3000) { showErr('توضیحات خیلی طولانی است.'); return; }
          close({ date: Jalali.format(form.y, form.m, form.d), types: chosen, text: text });
        }
      });
    });
  }

  async function addIncident() {
    var p = personById(st.view);
    if (!p) return;
    var r = await incidentDialog(p, null);
    if (!r) return;
    try {
      var list = await loadIncidents();
      list.push({ id: newId(), personId: p.id, date: r.date, types: r.types, text: r.text, createdAt: Date.now() });
      await saveIncidents(list);
      st.incidents = list;
      UI.toast('گزارش ثبت شد', 'ok');
    } catch (e) { UI.toast('ثبت انجام نشد', 'bad'); }
    draw();
  }

  async function editIncident(id) {
    var inc = st.incidents.filter(function (i) { return i.id === id; })[0];
    var p = inc && personById(inc.personId);
    if (!inc || !p) return;
    var r = await incidentDialog(p, inc);
    if (!r) return;
    try {
      var list = await loadIncidents();
      list.forEach(function (i) { if (i.id === id) { i.date = r.date; i.types = r.types; i.text = r.text; } });
      await saveIncidents(list);
      st.incidents = list;
      UI.toast('ذخیره شد', 'ok');
    } catch (e) { UI.toast('ذخیره انجام نشد', 'bad'); }
    draw();
  }

  async function deleteIncident(id) {
    var yes = await UI.confirm('این گزارش حذف شود؟ قابل برگشت نیست.', 'حذف', true);
    if (!yes) return;
    try {
      var list = (await loadIncidents()).filter(function (i) { return i.id !== id; });
      await saveIncidents(list);
      st.incidents = list;
      UI.toast('حذف شد', 'ok');
    } catch (e) { UI.toast('حذف انجام نشد', 'bad'); }
    draw();
  }

  /* ---------- فهرست موارد انضباطی ---------- */

  function manageTypes() {
    var ov = document.createElement('div');
    ov.className = 'overlay';
    document.body.appendChild(ov);
    function draw() {
      ov.innerHTML = '<div class="dlg"><h3>فهرست موارد انضباطی</h3>' +
        '<div class="hint">این موارد هنگام ثبت گزارش نمایش داده می‌شوند. حذف یک مورد از فهرست، گزارش‌های قبلی را تغییر نمی‌دهد.</div>' +
        st.types.map(function (t, i) {
          return '<div class="dc-trow"><span>' + esc(t) + '</span><button class="gm-btn del" data-del="' + i + '">' + ic('trash') + '</button></div>';
        }).join('') +
        '<div class="dc-addtype"><input type="text" id="dcNewT" placeholder="مورد جدید..."><button class="btn ghost" data-add>افزودن</button></div>' +
        '<div class="dlg-actions"><button class="btn primary" data-close>بستن</button></div></div>';
    }
    draw();
    ov.addEventListener('click', async function (e) {
      var b = e.target.closest('button');
      if (!b) { if (e.target === ov) ov.remove(); return; }
      if (b.hasAttribute('data-close')) { ov.remove(); return; }
      try {
        if (b.hasAttribute('data-add')) {
          var v = ov.querySelector('#dcNewT').value.trim();
          if (!v || st.types.indexOf(v) !== -1) return;
          st.types.push(v);
          await saveTypes(st.types);
          draw();
        } else if (b.hasAttribute('data-del')) {
          st.types.splice(Number(b.getAttribute('data-del')), 1);
          await saveTypes(st.types);
          draw();
        }
      } catch (err) { UI.toast('ذخیره انجام نشد', 'bad'); }
    });
  }

  /* ---------- کپی و چاپ ---------- */

  function studentText(p) {
    var items = incidentsOf(p.id, true);
    var L = ['گزارش انضباطی دانش‌آموز', 'نام: ' + p.name + ' (' + Grades.name(p.grade) + ')',
             'تاریخ تهیه: ' + Jalali.longDate(Jalali.todayString()), ''];
    if (!items.length) L.push('گزارشی ثبت نشده است.');
    items.forEach(function (it, i) {
      L.push(fa(i + 1) + '. ' + Jalali.longDate(it.date));
      if (it.types.length) L.push('   موارد: ' + it.types.join('، '));
      if (it.text) L.push('   گزارش: ' + it.text);
      L.push('');
    });
    return L.join('\n').trim();
  }

  function printStudent(p) {
    var items = incidentsOf(p.id, true);
    var h = '<h1>گزارش انضباطی دانش‌آموز</h1><div class="pr-meta">نام: ' + esc(p.name) + ' — ' + esc(Grades.name(p.grade)) +
      ' — تاریخ تهیه: ' + esc(Jalali.longDate(Jalali.todayString())) + '</div>';
    if (!items.length) {
      h += '<p>گزارشی ثبت نشده است.</p>';
    } else {
      h += '<table class="pr-table"><thead><tr><th>ردیف</th><th>تاریخ</th><th>موارد</th><th>گزارش</th></tr></thead><tbody>' +
        items.map(function (it, i) {
          return '<tr><td>' + fa(i + 1) + '</td><td>' + esc(Jalali.longDate(it.date)) + '</td><td>' + esc(it.types.join('، ')) +
            '</td><td style="white-space:pre-wrap">' + esc(it.text) + '</td></tr>';
        }).join('') + '</tbody></table>';
    }
    var el = document.getElementById('print-root');
    if (!el) { el = document.createElement('div'); el.id = 'print-root'; document.body.appendChild(el); }
    el.innerHTML = h;
    UI.toast('در پنجره چاپ، گزینه «ذخیره به‌عنوان PDF» را بزنید', '');
    setTimeout(function () { window.print(); }, 700);
  }

  App.register('discipline', { render: render });
})();
