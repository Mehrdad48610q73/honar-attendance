(function () {
  'use strict';

  var GN = { 10: 'دهم', 11: 'یازدهم', 12: 'دوازدهم' };
  var collator = new Intl.Collator('fa');
  var ALL_ACTS = { student: ['daily', 'sport'], teacher: ['teacher'], official: ['official'] };
  var ACT_TITLE = { daily: 'حضور و غیاب مدرسه', sport: 'ورزش' };
  var CAT_TITLE = { student: 'دانش‌آموزان', teacher: 'دبیران', official: 'مسئولان' };
  var PERIODS = [['day', 'روزانه'], ['week', 'هفتگی'], ['month', 'ماهانه'], ['multi', 'چندماهه'], ['year', 'سالانه'], ['custom', 'بازه دلخواه']];

  var CSS = '' +
    '#print-root{display:none}' +
    '.rp-seg{display:flex;gap:6px;margin-top:14px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:6px}' +
    '.rp-seg button{flex:1;background:none;color:#7C8CA3;padding:10px 4px;border-radius:16px;font-size:.88rem;font-weight:700;transition:all .2s ease}' +
    '.rp-seg button.on{background:var(--blue);color:#fff}' +
    '.rp-card{margin-top:12px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:14px}' +
    '.rp-card select{width:100%;border:2px solid #E1EAF3;border-radius:16px;padding:11px 12px;font-family:inherit;font-size:.92rem;color:var(--navy);background:var(--bg);outline:none;direction:rtl}' +
    '.rp-lab{display:block;font-size:.82rem;margin:10px 0 4px;opacity:.75}' +
    '.rp-lab:first-child{margin-top:0}' +
    '.rp-sel{display:flex;gap:6px}' +
    '.rp-sel select{flex:1;width:auto;padding:11px 6px}' +
    '.rp-chips{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap}' +
    '.rp-chips button{flex:1;min-width:22%;background:var(--bg);color:#7C8CA3;padding:9px 4px;border-radius:14px;font-size:.82rem;font-weight:700}' +
    '.rp-chips button.on{background:var(--blue-light);color:var(--blue)}' +
    '.rp-row2{display:flex;align-items:center;gap:10px;margin-top:4px}' +
    '.rp-row2 label{font-size:.85rem;white-space:nowrap}' +
    '.rp-check{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:.88rem}' +
    '.rp-check input{width:20px;height:20px;accent-color:var(--blue)}' +
    '.rp-sum{margin-top:14px;background:linear-gradient(135deg,var(--navy),var(--blue));color:#fff;border-radius:var(--radius);padding:14px 16px;line-height:1.9}' +
    '.rp-range{font-weight:800;font-size:.95rem}' +
    '.rp-sum small{opacity:.85;font-size:.8rem}' +
    '.rp-actions{display:flex;gap:8px;margin-top:12px}' +
    '.rp-actions .btn{font-size:.82rem;padding:12px 4px}' +
    '.rp-actions svg{width:18px;height:18px}' +
    '.rp-sec{margin-top:16px}' +
    '.rp-sec-h{display:flex;align-items:center;justify-content:space-between;padding:0 4px 8px}' +
    '.rp-sec-h h3{font-size:1rem}' +
    '.rp-sec-h span{font-size:.78rem;opacity:.7}' +
    '.rp-item{width:100%;background:#fff;border-radius:16px;box-shadow:var(--shadow);padding:11px 14px;display:flex;align-items:center;gap:10px;margin-bottom:8px;text-align:right;color:var(--navy)}' +
    '.rp-name{flex:1;font-weight:600;font-size:.93rem}' +
    '.rp-name small{display:block;font-weight:500;font-size:.72rem;opacity:.65}' +
    '.rp-badges{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}' +
    '.rb{font-size:.72rem;border-radius:10px;padding:2px 9px;font-weight:700;line-height:1.7}' +
    '.rb.abs{background:#FCE9EA;color:var(--red)}' +
    '.rb.late{background:#FDF0E2;color:var(--orange)}' +
    '.rb.leave{background:#E2F5F4;color:var(--teal)}' +
    '.rb.zero{background:var(--bg);color:#7C8CA3}' +
    '.rp-empty{margin-top:4px;padding:16px}' +
    '.rp-card .searchbox{margin:0 0 12px;box-shadow:none;background:var(--bg)}' +
    '.rp-pd{line-height:2.1;font-size:.9rem;margin-top:6px}' +
    '@media print{' +
    '@page{size:A4;margin:12mm}' +
    'body>*:not(#print-root){display:none!important}' +
    'body{padding:0!important;background:#fff!important}' +
    '#print-root{display:block!important;background:#fff;color:#000;direction:rtl}' +
    '#print-root h1{font-size:16pt;margin-bottom:4pt}' +
    '#print-root h2{font-size:13pt;margin:14pt 0 6pt}' +
    '#print-root .pr-meta{font-size:10pt;margin-bottom:6pt}' +
    '#print-root p{font-size:11pt}' +
    '.pr-table{width:100%;border-collapse:collapse;font-size:10.5pt}' +
    '.pr-table th,.pr-table td{border:1px solid #888;padding:4pt 6pt;text-align:right;vertical-align:top}' +
    '.pr-table th{background:#E6F3FA}' +
    '.pr-table thead{display:table-header-group}' +
    '.pr-table tr{page-break-inside:avoid}' +
    '}';

  var st = { cat: 'student', grade: 0, scope: 'both', sort: 'name', only: true, q: '', period: 'month',
             rows: [], range: null, err: '', page: null, tk: 0 };

  function ic(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }
  function fa(v) { return UI.fa(v); }
  function alive() { return st.page && st.page.isConnected; }
  function q(sel) { return st.page.querySelector(sel); }

  function injectCss() {
    if (document.getElementById('rp-css')) return;
    var s = document.createElement('style');
    s.id = 'rp-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- ابزارهای تاریخ و متن ---------- */

  function shortDate(d, withYear) {
    var p = Jalali.parse(d);
    return fa(p.jd) + ' ' + Jalali.MONTHS[p.jm - 1] + (withYear ? ' ' + fa(p.jy) : '');
  }
  function dates(list) {
    var withYear = st.range && st.range.from.slice(0, 4) !== st.range.to.slice(0, 4);
    return list.map(function (d) { return shortDate(d, withYear); }).join('، ');
  }
  function rangeLabel(r) {
    return r.from === r.to ? Jalali.longDate(r.from) : 'از ' + Jalali.longDate(r.from) + ' تا ' + Jalali.longDate(r.to);
  }
  function actsNow() {
    if (st.cat !== 'student') return [st.cat];
    return st.scope === 'school' ? ['daily'] : (st.scope === 'sport' ? ['sport'] : ['daily', 'sport']);
  }
  function secTitle(act) { return st.cat === 'student' ? ACT_TITLE[act] : 'غیبت‌های ثبت‌شده'; }
  function reportTitle() {
    var t = 'گزارش غیبت ' + CAT_TITLE[st.cat];
    if (st.cat === 'student' && st.grade) t += ' — پایه ' + GN[st.grade];
    return t;
  }

  /* ---------- شمارش و مرتب‌سازی ---------- */

  function cnt(row, act, status) { return row.a[act][status].length; }
  function hasAny(row, acts) {
    return acts.some(function (act) {
      var a = row.a[act];
      return a.absent.length + a.late.length + a.leave.length > 0;
    });
  }
  function baseCmp(x, y) {
    if (st.cat === 'student') return collator.compare(x.p.name, y.p.name);
    return (x.p.order || 0) - (y.p.order || 0);
  }
  function norm(s) {
    return String(s || '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function matches(r) {
    var k = norm(st.q);
    return !k || norm(r.p.name).indexOf(k) !== -1;
  }
  function rowsFor(act) {
    var list = st.rows.filter(matches);
    if (st.only && !st.q.trim()) list = list.filter(function (r) { return hasAny(r, [act]); });
    if (st.sort === 'count') {
      list.sort(function (x, y) { return (cnt(y, act, 'absent') - cnt(x, act, 'absent')) || baseCmp(x, y); });
    } else {
      list.sort(baseCmp);
    }
    return list;
  }
  function rowsAll() {
    var acts = actsNow();
    var list = st.rows.filter(matches);
    if (st.only && !st.q.trim()) list = list.filter(function (r) { return hasAny(r, acts); });
    return list.sort(baseCmp);
  }

  /* ---------- انتخاب بازه ---------- */

  function opts(from, to, sel, fmt) {
    var s = '';
    for (var i = from; i <= to; i++) s += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + fmt(i) + '</option>';
    return s;
  }
  function monthName(i) { return Jalali.MONTHS[i - 1]; }
  function lab(t) { return '<label class="rp-lab">' + t + '</label>'; }

  function dateSel(id, d) {
    var p = Jalali.parse(d), ty = Jalali.today().jy;
    return '<div class="rp-sel" data-sel="' + id + '">' +
      '<select data-p="d">' + opts(1, 31, p.jd, fa) + '</select>' +
      '<select data-p="m">' + opts(1, 12, p.jm, monthName) + '</select>' +
      '<select data-p="y">' + opts(ty - 6, ty + 1, p.jy, fa) + '</select></div>';
  }
  function ymSel(id, jy, jm) {
    var ty = Jalali.today().jy;
    return '<div class="rp-sel" data-sel="' + id + '">' +
      '<select data-p="m">' + opts(1, 12, jm, monthName) + '</select>' +
      '<select data-p="y">' + opts(ty - 6, ty + 1, jy, fa) + '</select></div>';
  }
  function ySel(id, jy) {
    var ty = Jalali.today().jy;
    return '<div class="rp-sel" data-sel="' + id + '"><select data-p="y">' + opts(ty - 6, ty + 1, jy, fa) + '</select></div>';
  }

  function controlsHtml(period) {
    var t = Jalali.today(), today = Jalali.todayString();
    if (period === 'day') return lab('تاریخ') + dateSel('a', today);
    if (period === 'week') return lab('یک روز از هفته مورد نظر (هفته از شنبه تا جمعه)') + dateSel('a', today);
    if (period === 'month') return lab('ماه') + ymSel('m1', t.jy, t.jm);
    if (period === 'multi') {
      var m = t.jm - 2, y = t.jy;
      if (m < 1) { m += 12; y--; }
      return lab('از ماه') + ymSel('m1', y, m) + lab('تا ماه') + ymSel('m2', t.jy, t.jm);
    }
    if (period === 'year') return lab('سال') + ySel('y', t.jy);
    return lab('از تاریخ') + dateSel('a', Jalali.format(t.jy, t.jm, 1)) + lab('تا تاریخ') + dateSel('b', today);
  }

  function selVal(id, k) {
    var el = q('[data-sel="' + id + '"] [data-p="' + k + '"]');
    return el ? Number(el.value) : 0;
  }
  function readDate(id) {
    var y = selVal(id, 'y'), m = selVal(id, 'm'), d = Math.min(selVal(id, 'd'), Jalali.monthLength(y, m));
    return Jalali.format(y, m, d);
  }
  function monthRange(y, m) { return { from: Jalali.format(y, m, 1), to: Jalali.format(y, m, Jalali.monthLength(y, m)) }; }

  function readRange() {
    var p = st.period, a, b, r;
    if (p === 'day') { a = readDate('a'); return { from: a, to: a }; }
    if (p === 'week') {
      a = readDate('a');
      var pa = Jalali.parse(a);
      var s = Jalali.addDays(a, -Jalali.weekday(pa.jy, pa.jm, pa.jd));
      return { from: s, to: Jalali.addDays(s, 6) };
    }
    if (p === 'month') return monthRange(selVal('m1', 'y'), selVal('m1', 'm'));
    if (p === 'multi') {
      var y1 = selVal('m1', 'y'), m1 = selVal('m1', 'm'), y2 = selVal('m2', 'y'), m2 = selVal('m2', 'm');
      if (y1 * 100 + m1 > y2 * 100 + m2) return { error: 'ماه شروع باید قبل از ماه پایان باشد.' };
      return { from: monthRange(y1, m1).from, to: monthRange(y2, m2).to };
    }
    if (p === 'year') {
      var y = selVal('y', 'y');
      return { from: Jalali.format(y, 1, 1), to: Jalali.format(y, 12, Jalali.monthLength(y, 12)) };
    }
    a = readDate('a'); b = readDate('b');
    if (a > b) return { error: 'تاریخ پایان باید بعد از تاریخ شروع باشد.' };
    return { from: a, to: b };
  }

  /* ---------- محاسبه ---------- */

  async function compute() {
    var tk = ++st.tk;
    var r = readRange();
    if (r.error) { st.range = null; st.err = r.error; st.rows = []; drawResult(); return; }
    try {
      var people = await DB.getPeople({ type: st.cat, grade: st.cat === 'student' ? st.grade : 0 });
      var recs = await DB.getRecordsInRange(r.from, r.to);
      if (tk !== st.tk || !alive()) return;
      var acts = ALL_ACTS[st.cat], map = {};
      st.rows = people.map(function (p) {
        var a = {};
        acts.forEach(function (act) { a[act] = { absent: [], late: [], leave: [] }; });
        var row = { p: p, a: a };
        map[p.id] = row;
        return row;
      });
      recs.forEach(function (rec) {
        var row = map[rec.personId];
        if (row && row.a[rec.activity]) row.a[rec.activity][rec.status].push(rec.date);
      });
      st.rows.forEach(function (row) {
        Object.keys(row.a).forEach(function (act) {
          ['absent', 'late', 'leave'].forEach(function (s) { row.a[act][s].sort(); });
        });
      });
      st.range = r; st.err = '';
    } catch (e) {
      UI.toast('خطا در خواندن اطلاعات', 'bad');
      return;
    }
    drawResult();
  }

  /* ---------- نمایش ---------- */

  function badge(cls, n, label) { return '<b class="rb ' + cls + '">' + fa(n) + ' ' + label + '</b>'; }

  function sectionHtml(act) {
    var list = rowsFor(act);
    var total = list.reduce(function (s, r) { return s + cnt(r, act, 'absent'); }, 0);
    var h = '<div class="rp-sec"><div class="rp-sec-h"><h3>' + secTitle(act) + '</h3><span>' +
      fa(list.length) + ' نفر · ' + fa(total) + ' غیبت</span></div>';
    if (!list.length) {
      h += '<div class="empty rp-empty">' + (st.q.trim() ? 'موردی با این جستجو پیدا نشد.' : 'در این بازه موردی ثبت نشده است.') + '</div>';
    } else {
      h += list.map(function (r) {
        var n = cnt(r, act, 'absent'), late = cnt(r, act, 'late'), leave = cnt(r, act, 'leave');
        return '<button class="rp-item" data-person="' + r.p.id + '"><span class="rp-name">' + UI.esc(r.p.name) +
          (st.cat === 'student' && !st.grade ? '<small>پایه ' + GN[r.p.grade] + '</small>' : '') + '</span><span class="rp-badges">' +
          badge(n ? 'abs' : 'zero', n, 'غیبت') + (late ? badge('late', late, 'تأخیر') : '') + (leave ? badge('leave', leave, 'مرخصی') : '') +
          '</span></button>';
      }).join('');
    }
    return h + '</div>';
  }

  function drawResult() {
    if (!alive()) return;
    var out = q('#rOut');
    if (!st.range) { out.innerHTML = st.err ? '<div class="empty">' + st.err + '</div>' : ''; return; }
    var h = '<div class="rp-sum"><div class="rp-range">' + UI.esc(rangeLabel(st.range)) + '</div>' +
      '<small>' + fa(st.rows.length) + ' نفر در فهرست · ' + reportTitle() + (st.q.trim() ? ' · جستجو: «' + UI.esc(st.q.trim()) + '»' : '') + '</small></div>' +
      '<div class="rp-actions">' +
      '<button class="btn ghost" data-act="copy">' + ic('copy') + 'کپی متن</button>' +
      '<button class="btn ghost" data-act="csv">' + ic('backup') + 'فایل CSV</button>' +
      '<button class="btn ghost" data-act="pdf">' + ic('list') + 'PDF / چاپ</button></div>';
    actsNow().forEach(function (act) { h += sectionHtml(act); });
    out.innerHTML = h;
  }

  function drawOpts() {
    var h = '<div class="rp-card">' +
      '<div class="searchbox">' + ic('search') + '<input id="rQ" type="search" placeholder="جستجوی نام در گزارش" value="' + UI.esc(st.q) + '"></div>';
    if (st.cat === 'student') {
      h += '<div class="rp-chips">' + [0, 10, 11, 12].map(function (g) {
        return '<button class="' + (st.grade === g ? 'on' : '') + '" data-grade="' + g + '">' + (g ? 'پایه ' + GN[g] : 'همه پایه‌ها') + '</button>';
      }).join('') + '</div>';
      h += '<div class="rp-chips">' + [['both', 'مدرسه و ورزش'], ['school', 'فقط مدرسه'], ['sport', 'فقط ورزش']].map(function (s) {
        return '<button class="' + (st.scope === s[0] ? 'on' : '') + '" data-scope="' + s[0] + '">' + s[1] + '</button>';
      }).join('') + '</div>';
    }
    h += '<div class="rp-row2"><label>مرتب‌سازی</label><select id="rSort">' +
      '<option value="name"' + (st.sort === 'name' ? ' selected' : '') + '>' + (st.cat === 'student' ? 'الفبایی' : 'ترتیب فهرست') + '</option>' +
      '<option value="count"' + (st.sort === 'count' ? ' selected' : '') + '>بیشترین غیبت</option></select></div>' +
      '<label class="rp-check"><input type="checkbox" id="rOnly"' + (st.only ? ' checked' : '') + '> فقط افراد دارای سابقه در این بازه</label></div>';
    q('#rOpts').innerHTML = h;
  }

  /* ---------- خروجی‌ها ---------- */

  function reportText() {
    var L = [reportTitle(), 'بازه: ' + rangeLabel(st.range)];
    if (st.q.trim()) L.push('جستجو: ' + st.q.trim());
    L.push('');
    actsNow().forEach(function (act) {
      var list = rowsFor(act);
      L.push(secTitle(act) + ':');
      if (!list.length) L.push('موردی ثبت نشده است.');
      list.forEach(function (r, i) {
        var a = r.a[act];
        var s = fa(i + 1) + '. ' + r.p.name + (st.cat === 'student' && !st.grade ? ' (پایه ' + GN[r.p.grade] + ')' : '') +
          ': ' + fa(a.absent.length) + ' غیبت';
        if (a.late.length) s += ' | ' + fa(a.late.length) + ' تأخیر';
        if (a.leave.length) s += ' | ' + fa(a.leave.length) + ' مرخصی';
        if (a.absent.length) s += ' | تاریخ‌ها: ' + dates(a.absent);
        L.push(s);
      });
      L.push('');
    });
    return L.join('\n').trim();
  }

  function personText(row) {
    var L = [row.p.name + (row.p.grade ? ' — پایه ' + GN[row.p.grade] : ''), 'بازه: ' + rangeLabel(st.range), ''];
    actsNow().forEach(function (act) {
      var a = row.a[act];
      if (st.cat === 'student') L.push(ACT_TITLE[act] + ':');
      L.push('غیبت: ' + fa(a.absent.length) + ' | تأخیر: ' + fa(a.late.length) + ' | مرخصی: ' + fa(a.leave.length));
      if (a.absent.length) L.push('تاریخ‌های غیبت: ' + dates(a.absent));
      if (a.late.length) L.push('تاریخ‌های تأخیر: ' + dates(a.late));
      if (a.leave.length) L.push('تاریخ‌های مرخصی: ' + dates(a.leave));
      L.push('');
    });
    return L.join('\n').trim();
  }

  function csvText() {
    var acts = actsNow(), student = st.cat === 'student', hdr = ['نام'];
    if (student) hdr.push('پایه');
    acts.forEach(function (act) {
      var p = student ? ACT_TITLE[act] + ' - ' : '';
      hdr.push(p + 'غیبت', p + 'تأخیر', p + 'مرخصی', p + 'تاریخ‌های غیبت');
    });
    function cell(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }
    var lines = [hdr.map(cell).join(',')];
    rowsAll().forEach(function (r) {
      var f = [r.p.name];
      if (student) f.push('پایه ' + GN[r.p.grade]);
      acts.forEach(function (act) {
        var a = r.a[act];
        f.push(a.absent.length, a.late.length, a.leave.length, a.absent.join(' | '));
      });
      lines.push(f.map(cell).join(','));
    });
    return lines.join('\r\n');
  }

  function downloadCsv() {
    var blob = new Blob(['\ufeff' + csvText()], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'honar-' + st.cat + '-' + st.range.from + '_' + st.range.to + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    UI.toast('فایل CSV ساخته شد', 'ok');
  }

  function printHtml() {
    var student = st.cat === 'student';
    var h = '<h1>' + UI.esc(reportTitle()) + '</h1><div class="pr-meta">بازه: ' + UI.esc(rangeLabel(st.range)) +
      (st.q.trim() ? ' — جستجو: ' + UI.esc(st.q.trim()) : '') +
      ' — تاریخ تهیه گزارش: ' + UI.esc(Jalali.longDate(Jalali.todayString())) + '</div>';
    actsNow().forEach(function (act) {
      var list = rowsFor(act);
      h += '<h2>' + secTitle(act) + '</h2>';
      if (!list.length) { h += '<p>در این بازه موردی ثبت نشده است.</p>'; return; }
      h += '<table class="pr-table"><thead><tr><th>ردیف</th><th>نام</th>' + (student ? '<th>پایه</th>' : '') +
        '<th>غیبت</th><th>تأخیر</th><th>مرخصی</th><th>تاریخ‌های غیبت</th></tr></thead><tbody>';
      list.forEach(function (r, i) {
        var a = r.a[act];
        h += '<tr><td>' + fa(i + 1) + '</td><td>' + UI.esc(r.p.name) + '</td>' + (student ? '<td>' + GN[r.p.grade] + '</td>' : '') +
          '<td>' + fa(a.absent.length) + '</td><td>' + fa(a.late.length) + '</td><td>' + fa(a.leave.length) + '</td><td>' +
          UI.esc(dates(a.absent)) + '</td></tr>';
      });
      h += '</tbody></table>';
    });
    return h;
  }

  function printReport() {
    var el = document.getElementById('print-root');
    if (!el) { el = document.createElement('div'); el.id = 'print-root'; document.body.appendChild(el); }
    el.innerHTML = printHtml();
    UI.toast('در پنجره چاپ، گزینه «ذخیره به‌عنوان PDF» را بزنید', '');
    setTimeout(function () { window.print(); }, 700);
  }

  async function showPerson(id) {
    var row = st.rows.filter(function (r) { return r.p.id === id; })[0];
    if (!row) return;
    var text = personText(row);
    var box = await UI.dialog({
      title: row.p.name,
      body: '<div class="rp-pd">' + UI.esc(text).replace(/\n/g, '<br>') + '</div>',
      ok: 'کپی گزارش'
    });
    if (box) UI.copy(text);
  }

  /* ---------- صفحه ---------- */

  function render(root) {
    injectCss();
    st.cat = 'student'; st.grade = 0; st.scope = 'both'; st.sort = 'name'; st.only = true; st.q = ''; st.period = 'month';
    st.rows = []; st.range = null; st.err = '';
    root.innerHTML =
      '<div class="page rp-page">' +
      '<div class="page-head"><button class="back" data-page="dashboard">' + ic('back') + '</button><h2>گزارش‌ها و آمار</h2></div>' +
      '<div class="rp-seg" id="rCat">' + ['student', 'teacher', 'official'].map(function (c) {
        return '<button class="' + (c === st.cat ? 'on' : '') + '" data-cat="' + c + '">' + CAT_TITLE[c] + '</button>';
      }).join('') + '</div>' +
      '<div class="rp-card"><label class="rp-lab">نوع بازه</label><select id="rPeriod">' +
      PERIODS.map(function (p) { return '<option value="' + p[0] + '"' + (p[0] === st.period ? ' selected' : '') + '>' + p[1] + '</option>'; }).join('') +
      '</select><div id="rCtl">' + controlsHtml(st.period) + '</div></div>' +
      '<div id="rOpts"></div><div id="rOut"></div></div>';
    st.page = root.querySelector('.rp-page');
    st.page.addEventListener('click', onClick);
    st.page.addEventListener('change', onChange);
    st.page.addEventListener('input', function (e) {
      if (e.target.id === 'rQ') { st.q = e.target.value; drawResult(); }
    });
    drawOpts();
    compute();
  }

  function onClick(e) {
    var t = e.target.closest('[data-cat]');
    if (t) {
      st.cat = t.getAttribute('data-cat'); st.grade = 0; st.scope = 'both'; st.sort = 'name'; st.q = '';
      st.page.querySelectorAll('#rCat button').forEach(function (b) { b.classList.toggle('on', b === t); });
      drawOpts(); compute(); return;
    }
    t = e.target.closest('[data-grade]');
    if (t) { st.grade = Number(t.getAttribute('data-grade')); drawOpts(); compute(); return; }
    t = e.target.closest('[data-scope]');
    if (t) { st.scope = t.getAttribute('data-scope'); drawOpts(); drawResult(); return; }
    t = e.target.closest('[data-person]');
    if (t) { showPerson(t.getAttribute('data-person')); return; }
    t = e.target.closest('[data-act]');
    if (t) {
      if (!st.range) { UI.toast('ابتدا یک بازه معتبر انتخاب کنید', 'bad'); return; }
      var a = t.getAttribute('data-act');
      if (a === 'copy') UI.copy(reportText());
      else if (a === 'csv') downloadCsv();
      else if (a === 'pdf') printReport();
    }
  }

  function onChange(e) {
    var t = e.target;
    if (t.id === 'rPeriod') { st.period = t.value; q('#rCtl').innerHTML = controlsHtml(st.period); compute(); return; }
    if (t.id === 'rSort') { st.sort = t.value; drawResult(); return; }
    if (t.id === 'rOnly') { st.only = t.checked; drawResult(); return; }
    if (t.closest('#rCtl')) compute();
  }

  App.register('reports', { render: render });
})();
