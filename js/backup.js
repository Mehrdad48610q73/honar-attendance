(function () {
  'use strict';

  var APP_ID = 'honar-attendance';
  var FORMAT = 1;
  var TYPES = ['student', 'teacher', 'official'];
  var GRADES = [10, 11, 12];
  var STATUSES = ['absent', 'late', 'leave'];
  var ACTS = { student: ['daily', 'sport'], teacher: ['teacher'], official: ['official'] };
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  var STORES = ['people', 'records', 'settings'];

  var CSS = '' +
    '.bk-card{margin-top:14px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:16px}' +
    '.bk-card h3{font-size:1rem;margin-bottom:6px}' +
    '.bk-line{font-size:.9rem;line-height:2}' +
    '.bk-warn{margin-top:10px;background:#FDF0E2;border-radius:18px;padding:12px 14px;font-size:.84rem;line-height:1.95}' +
    '.bk-ok{background:#E5F5EC}' +
    '.bk-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:10px}' +
    '.bk-stat{background:var(--bg);border-radius:16px;padding:10px;text-align:center;font-size:.78rem}' +
    '.bk-stat b{display:block;font-size:1.25rem;line-height:1.6}' +
    '.bk-col{display:flex;flex-direction:column;gap:10px;margin-top:14px}' +
    '.bk-col .btn{flex:none;padding:15px 14px}' +
    '.bk-col svg{width:20px;height:20px}' +
    '.bk-steps{font-size:.84rem;line-height:2;padding-right:18px;margin-top:6px}' +
    '.bk-danger{border:2px solid #F7D3D5}' +
    '.bk-danger h3{color:var(--red)}' +
    '.bk-card select{width:100%;border:2px solid #E1EAF3;border-radius:16px;padding:11px 12px;font-family:inherit;font-size:.92rem;color:var(--navy);background:var(--bg);outline:none;direction:rtl;margin-top:8px}' +
    '.bk-link{margin-top:8px;background:var(--navy);color:#fff;border-radius:14px;padding:8px 14px;font-size:.8rem;font-weight:700}' +
    '.bk-sum{font-size:.88rem;line-height:2}' +
    '.bk-sum b{color:var(--blue)}';

  function ic(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }
  function fa(v) { return UI.fa(v); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function injectCss() {
    if (document.getElementById('bk-css')) return;
    var s = document.createElement('style');
    s.id = 'bk-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- تاریخ و زمان ---------- */

  function stamp(d) {
    var j = Jalali.toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { date: Jalali.format(j.jy, j.jm, j.jd), time: pad(d.getHours()) + ':' + pad(d.getMinutes()) };
  }
  function when(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    var s = stamp(d);
    return Jalali.longDate(s.date) + ' — ساعت ' + fa(s.time);
  }
  function daysSince(iso) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }
  function ago(iso) {
    var d = daysSince(iso);
    return d <= 0 ? 'امروز' : fa(d) + ' روز پیش';
  }

  /* ---------- ساخت و اعتبارسنجی فایل پشتیبان ---------- */

  function countOf(people, records) {
    var c = { student: 0, teacher: 0, official: 0, records: records.length };
    people.forEach(function (p) { if (c[p.type] !== undefined) c[p.type]++; });
    return c;
  }

  async function buildBackup() {
    var now = new Date();
    await DB.setSetting('lastBackupAt', now.toISOString());
    var all = await DB.exportAll();
    var s = stamp(now);
    return {
      app: APP_ID,
      formatVersion: FORMAT,
      exportedAt: now.toISOString(),
      exportedAtJalali: s.date + ' ' + s.time,
      counts: countOf(all.people, all.records),
      data: { people: all.people, records: all.records, settings: all.settings }
    };
  }

  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }

  function validate(obj) {
    function bad(msg) { return { ok: false, error: msg }; }
    if (!isObj(obj)) return bad('ساختار فایل درست نیست.');
    if (obj.app !== APP_ID) return bad('این فایل، پشتیبان برنامه HONAR ATTENDANCE نیست.');
    if (typeof obj.formatVersion !== 'number' || obj.formatVersion > FORMAT) {
      return bad('این فایل با نسخه‌ای جدیدتر از برنامه ساخته شده و قابل بازیابی نیست.');
    }
    if (!isObj(obj.data) || !Array.isArray(obj.data.people) || !Array.isArray(obj.data.records) || !Array.isArray(obj.data.settings)) {
      return bad('بخش اطلاعات فایل ناقص یا خراب است.');
    }
    var people = [], ids = {}, i, p;
    for (i = 0; i < obj.data.people.length; i++) {
      p = obj.data.people[i];
      if (!isObj(p) || typeof p.id !== 'string' || !p.id || p.id.length > 100) return bad('اطلاعات یکی از افراد خراب است (ردیف ' + (i + 1) + ').');
      if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 200) return bad('نام یکی از افراد نامعتبر است (ردیف ' + (i + 1) + ').');
      if (TYPES.indexOf(p.type) === -1) return bad('نوع یکی از افراد نامعتبر است (ردیف ' + (i + 1) + ').');
      if (p.type === 'student' && GRADES.indexOf(p.grade) === -1) return bad('پایه یکی از دانش‌آموزان نامعتبر است (ردیف ' + (i + 1) + ').');
      if (ids[p.id]) return bad('در فایل، شناسه تکراری وجود دارد.');
      ids[p.id] = p.type;
      people.push({
        id: p.id, name: p.name.trim(), type: p.type,
        grade: p.type === 'student' ? p.grade : null,
        order: typeof p.order === 'number' ? p.order : i + 1,
        createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now()
      });
    }
    var records = [], keys = {}, r, key;
    for (i = 0; i < obj.data.records.length; i++) {
      r = obj.data.records[i];
      if (!isObj(r) || typeof r.personId !== 'string' || !ids[r.personId]) return bad('یکی از سوابق به فرد نامشخصی وصل است (ردیف ' + (i + 1) + ').');
      if (typeof r.date !== 'string' || !DATE_RE.test(r.date)) return bad('تاریخ یکی از سوابق نامعتبر است (ردیف ' + (i + 1) + ').');
      var mm = Number(r.date.slice(5, 7)), dd = Number(r.date.slice(8, 10));
      if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return bad('تاریخ یکی از سوابق نامعتبر است (ردیف ' + (i + 1) + ').');
      if (ACTS[ids[r.personId]].indexOf(r.activity) === -1) return bad('نوع فعالیت یکی از سوابق نامعتبر است (ردیف ' + (i + 1) + ').');
      if (STATUSES.indexOf(r.status) === -1) return bad('وضعیت یکی از سوابق نامعتبر است (ردیف ' + (i + 1) + ').');
      key = r.personId + '|' + r.date + '|' + r.activity;
      if (keys[key]) return bad('در فایل، سابقه تکراری وجود دارد.');
      keys[key] = true;
      records.push({ key: key, personId: r.personId, date: r.date, activity: r.activity, status: r.status,
                     updatedAt: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now() });
    }
    var settings = [], sk = {}, s;
    for (i = 0; i < obj.data.settings.length; i++) {
      s = obj.data.settings[i];
      if (!isObj(s) || typeof s.key !== 'string' || !s.key || s.key.length > 100) return bad('یکی از تنظیمات نامعتبر است.');
      if (sk[s.key]) return bad('در فایل، تنظیم تکراری وجود دارد.');
      sk[s.key] = true;
      settings.push({ key: s.key, value: s.value });
    }
    return { ok: true, people: people, records: records, settings: settings };
  }

  async function replaceAll(clean) {
    var db = await DB.open();
    var tx = db.transaction(STORES, 'readwrite');
    var done = new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('عملیات لغو شد')); };
    });
    STORES.forEach(function (n) { tx.objectStore(n).clear(); });
    clean.people.forEach(function (p) { tx.objectStore('people').put(p); });
    clean.records.forEach(function (r) { tx.objectStore('records').put(r); });
    clean.settings.forEach(function (s) { tx.objectStore('settings').put(s); });
    await done;
  }

  async function clearAll() {
    await replaceAll({ people: [], records: [], settings: [] });
  }

  /* ---------- فایل: ذخیره، اشتراک، خواندن ---------- */

  function fileName() {
    var s = stamp(new Date());
    return 'honar-backup-' + s.date + '-' + s.time.replace(':', '') + '.json';
  }

  async function saveBackup() {
    try {
      var obj = await buildBackup();
      var text = JSON.stringify(obj);
      var blob = new Blob([text], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
      UI.toast('فایل پشتیبان ساخته شد', 'ok');
      refreshNote();
      if (location.hash.slice(1) === 'backup') App.go('backup');
    } catch (e) {
      UI.toast('ساخت نسخه پشتیبان با خطا روبه‌رو شد', 'bad');
    }
  }

  function canShareFiles() {
    try {
      if (!navigator.canShare || !navigator.share) return false;
      var f = new File(['{}'], 'x.json', { type: 'application/json' });
      return navigator.canShare({ files: [f] });
    } catch (e) { return false; }
  }

  async function shareBackup() {
    try {
      var obj = await buildBackup();
      var file = new File([JSON.stringify(obj)], fileName(), { type: 'application/json' });
      await navigator.share({ files: [file], title: 'پشتیبان HONAR ATTENDANCE' });
      UI.toast('فایل پشتیبان ارسال شد', 'ok');
      refreshNote();
      if (location.hash.slice(1) === 'backup') App.go('backup');
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      UI.toast('اشتراک‌گذاری انجام نشد. از «تهیه نسخه پشتیبان» استفاده کنید.', 'bad');
    }
  }

  async function restoreFrom(file) {
    var text;
    try { text = await file.text(); }
    catch (e) { UI.toast('خواندن فایل ممکن نشد', 'bad'); return; }
    var obj;
    try { obj = JSON.parse(text); }
    catch (e) {
      await UI.dialog({ title: 'فایل نامعتبر', body: '<p class="dlg-text">این فایل خراب است یا فایل پشتیبان نیست. اطلاعات فعلی شما تغییری نکرد.</p>', ok: 'متوجه شدم' });
      return;
    }
    var v = validate(obj);
    if (!v.ok) {
      await UI.dialog({ title: 'فایل نامعتبر', body: '<p class="dlg-text">' + UI.esc(v.error) + '<br>اطلاعات فعلی شما تغییری نکرد.</p>', ok: 'متوجه شدم' });
      return;
    }
    var cur = await DB.exportAll();
    var nc = countOf(v.people, v.records), cc = countOf(cur.people, cur.records);
    var dateLine = obj.exportedAt ? when(obj.exportedAt) : '';
    var box = await UI.dialog({
      title: 'بازیابی اطلاعات',
      body: '<div class="bk-sum"><p>' + (dateLine ? 'فایل ساخته‌شده در <b>' + UI.esc(dateLine) + '</b>' : 'فایل پشتیبان') + '</p>' +
        '<p>اطلاعات داخل فایل: <b>' + fa(nc.student) + '</b> دانش‌آموز، <b>' + fa(nc.teacher) + '</b> دبیر، <b>' + fa(nc.official) +
        '</b> مسئول، <b>' + fa(nc.records) + '</b> ثبت حضور و غیاب</p>' +
        '<p>اطلاعات فعلی گوشی: <b>' + fa(cc.student) + '</b> دانش‌آموز، <b>' + fa(cc.teacher) + '</b> دبیر، <b>' + fa(cc.official) +
        '</b> مسئول، <b>' + fa(cc.records) + '</b> ثبت</p>' +
        '<p style="color:var(--red);font-weight:700">با ادامه، تمام اطلاعات فعلی حذف و با محتوای این فایل جایگزین می‌شود. اگر مطمئن نیستید، ابتدا از اطلاعات فعلی نسخه پشتیبان بگیرید.</p></div>',
      ok: 'جایگزین شود',
      danger: true
    });
    if (!box) return;
    try {
      await replaceAll(v);
      UI.toast('اطلاعات با موفقیت بازیابی شد', 'ok');
      refreshNote();
      App.go('backup');
    } catch (e) {
      UI.toast('بازیابی انجام نشد و اطلاعات قبلی حفظ شد', 'bad');
    }
  }

  /* ---------- یادآور روی داشبورد ---------- */

  async function refreshNote() {
    var el = document.querySelector('.backup-note');
    if (!el) return;
    try {
      var people = await DB.getPeople();
      if (!people.length) return;
      var last = await DB.getSetting('lastBackupAt', null);
      var days = await DB.getSetting('backupReminderDays', 7);
      var overdue, msg;
      if (!last) {
        overdue = true;
        msg = '⚠️ هنوز هیچ نسخه پشتیبانی تهیه نشده است. اطلاعات فقط روی همین گوشی است و با پاک شدن داده‌های Chrome از بین می‌رود.';
      } else {
        overdue = days > 0 && daysSince(last) >= days;
        msg = (overdue ? '⚠️ ' : '✅ ') + 'آخرین نسخه پشتیبان: ' + when(last) + ' (' + ago(last) + ')' +
          (overdue ? '. وقت تهیه نسخه جدید است.' : '.');
      }
      el.innerHTML = UI.esc(msg) + (overdue ? '<br><button class="bk-link" data-page="backup">رفتن به پشتیبان‌گیری</button>' : '');
      el.style.background = overdue ? '#FDF0E2' : '#E5F5EC';
    } catch (e) {}
  }

  /* ---------- صفحه پشتیبان‌گیری ---------- */

  async function renderBackup(root) {
    injectCss();
    root.innerHTML = '<div class="page bk-page"><div class="page-head"><button class="back" data-page="dashboard">' + ic('back') +
      '</button><h2>پشتیبان‌گیری و بازیابی</h2></div><div class="empty">در حال خواندن اطلاعات...</div></div>';
    var page = root.querySelector('.bk-page');
    var all, last;
    try {
      all = await DB.exportAll();
      last = await DB.getSetting('lastBackupAt', null);
    } catch (e) {
      UI.toast('خطا در خواندن اطلاعات', 'bad');
      return;
    }
    if (!page.isConnected) return;
    var c = countOf(all.people, all.records);
    var days = last ? daysSince(last) : null;
    var stale = last === null || days >= 7;
    var share = canShareFiles();
    page.innerHTML =
      '<div class="page-head"><button class="back" data-page="dashboard">' + ic('back') + '</button><h2>پشتیبان‌گیری و بازیابی</h2></div>' +
      '<div class="bk-card"><h3>وضعیت پشتیبان‌گیری</h3>' +
      '<div class="bk-line">' + (last ? 'آخرین نسخه پشتیبان: <b>' + UI.esc(when(last)) + '</b> (' + ago(last) + ')' : 'هنوز نسخه پشتیبانی تهیه نشده است.') + '</div>' +
      '<div class="bk-warn' + (stale ? '' : ' bk-ok') + '">' + (stale ? '⚠️ ' : '✅ ') +
      'اطلاعات این برنامه فقط روی حافظه همین گوشی ذخیره می‌شود. اگر داده‌های سایت در Chrome پاک شود یا برنامه حذف شود، همه اطلاعات از بین می‌رود. به‌طور منظم (مثلاً هفته‌ای یک بار) فایل پشتیبان تهیه کنید و آن را جای امن (مثلاً پیام‌های ذخیره‌شده تلگرام یا Google Drive) نگه دارید.</div>' +
      '<div class="bk-stats"><div class="bk-stat"><b>' + fa(c.student) + '</b>دانش‌آموز</div><div class="bk-stat"><b>' + fa(c.teacher) + '</b>دبیر</div>' +
      '<div class="bk-stat"><b>' + fa(c.official) + '</b>مسئول</div><div class="bk-stat"><b>' + fa(c.records) + '</b>ثبت حضور و غیاب</div></div></div>' +
      '<div class="bk-col">' +
      '<button class="btn primary" data-act="save">' + ic('backup') + 'تهیه نسخه پشتیبان (ذخیره در گوشی)</button>' +
      (share ? '<button class="btn ghost" data-act="share">' + ic('copy') + 'ارسال فایل پشتیبان به برنامه دیگر</button>' : '') +
      '<button class="btn ghost" data-act="restore">' + ic('leave') + 'بازیابی از فایل پشتیبان</button>' +
      '<input type="file" id="bkFile" accept=".json,application/json" hidden></div>' +
      '<div class="bk-card"><h3>راهنما</h3><ol class="bk-steps">' +
      '<li>«تهیه نسخه پشتیبان» یک فایل JSON در پوشه دانلودهای گوشی می‌سازد.</li>' +
      '<li>فایل را به جای امن بفرستید تا اگر گوشی عوض شد یا اطلاعات پاک شد، در دسترس باشد.</li>' +
      '<li>برای بازیابی، «بازیابی از فایل پشتیبان» را بزنید و همان فایل را انتخاب کنید. قبل از جایگزینی از شما تأیید گرفته می‌شود.</li>' +
      '<li>فایل خراب یا نامعتبر هرگز اطلاعات فعلی را تغییر نمی‌دهد.</li></ol></div>';
    var input = page.querySelector('#bkFile');
    page.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]');
      if (!t) return;
      var a = t.getAttribute('data-act');
      if (a === 'save') saveBackup();
      else if (a === 'share') shareBackup();
      else if (a === 'restore') input.click();
    });
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      input.value = '';
      if (f) restoreFrom(f);
    });
  }

  /* ---------- صفحه تنظیمات ---------- */

  function fmtSize(bytes) {
    return bytes < 1024 ? fa(bytes) + ' بایت' : fa(Math.round(bytes / 1024)) + ' کیلوبایت';
  }

  async function renderSettings(root) {
    injectCss();
    root.innerHTML = '<div class="page bk-page"><div class="page-head"><button class="back" data-page="dashboard">' + ic('back') +
      '</button><h2>تنظیمات برنامه</h2></div><div class="empty">در حال خواندن...</div></div>';
    var page = root.querySelector('.bk-page');
    var persisted = false, size = 0, days = 7;
    try {
      var all = await DB.exportAll();
      size = new Blob([JSON.stringify(all)]).size;
      days = await DB.getSetting('backupReminderDays', 7);
      if (navigator.storage && navigator.storage.persisted) persisted = await navigator.storage.persisted();
    } catch (e) {}
    if (!page.isConnected) return;
    var opts = [[3, 'هر ۳ روز'], [7, 'هر ۷ روز'], [14, 'هر ۱۴ روز'], [0, 'غیرفعال']].map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === days ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('');
    page.innerHTML =
      '<div class="page-head"><button class="back" data-page="dashboard">' + ic('back') + '</button><h2>تنظیمات برنامه</h2></div>' +
      '<div class="bk-card"><h3>یادآور پشتیبان‌گیری</h3>' +
      '<div class="bk-line">اگر از آخرین نسخه پشتیبان این‌قدر گذشته باشد، در صفحه اصلی هشدار نمایش داده می‌شود.</div>' +
      '<select id="stDays">' + opts + '</select></div>' +
      '<div class="bk-card"><h3>وضعیت ذخیره‌سازی</h3>' +
      '<div class="bk-line">حجم اطلاعات ذخیره‌شده: <b>' + fmtSize(size) + '</b></div>' +
      '<div class="bk-line">محافظت از حافظه: <b>' + (persisted ? 'فعال (Chrome به‌طور خودکار اطلاعات را پاک نمی‌کند)' : 'درخواست نشده یا تأیید نشده') + '</b></div>' +
      (persisted ? '' : '<div class="bk-col"><button class="btn ghost" data-act="persist">درخواست محافظت از حافظه</button></div>') +
      '</div>' +
      '<div class="bk-card"><h3>حریم خصوصی</h3><div class="bk-line">همه اطلاعات فقط روی حافظه همین گوشی ذخیره می‌شود و هیچ داده‌ای به اینترنت یا سرور ارسال نمی‌شود.</div></div>' +
      '<div class="bk-card bk-danger"><h3>حذف همه اطلاعات</h3>' +
      '<div class="bk-line">همه دانش‌آموزان، دبیران، مسئولان و سوابق حضور و غیاب پاک می‌شود و قابل برگشت نیست، مگر اینکه فایل پشتیبان داشته باشید.</div>' +
      '<div class="bk-col"><button class="btn danger" data-act="wipe">حذف همه اطلاعات</button></div></div>' +
      '<div class="bk-card"><h3>درباره برنامه</h3><div class="bk-line">HONAR ATTENDANCE — نسخه ۱٫۰<br>مدیریت حضور و غیاب هنرستان، بدون نیاز به اینترنت</div></div>';
    page.addEventListener('change', async function (e) {
      if (e.target.id === 'stDays') {
        try { await DB.setSetting('backupReminderDays', Number(e.target.value)); UI.toast('ذخیره شد', 'ok'); refreshNote(); }
        catch (err) { UI.toast('ذخیره نشد', 'bad'); }
      }
    });
    page.addEventListener('click', async function (e) {
      var t = e.target.closest('[data-act]');
      if (!t) return;
      var a = t.getAttribute('data-act');
      if (a === 'persist') {
        var ok = await DB.requestPersistence();
        UI.toast(ok ? 'محافظت از حافظه فعال شد' : 'Chrome این درخواست را نپذیرفت. پشتیبان‌گیری منظم را فراموش نکنید.', ok ? 'ok' : 'bad');
        App.go('settings');
      } else if (a === 'wipe') {
        var box = await UI.dialog({
          title: 'حذف همه اطلاعات',
          body: '<p class="dlg-text" style="color:var(--red);font-weight:700">این کار همه اطلاعات برنامه را برای همیشه پاک می‌کند. ابتدا از بخش پشتیبان‌گیری نسخه بگیرید.</p>' +
            '<label>برای تأیید، کلمه «حذف» را بنویسید</label><input type="text" id="wipeWord" autocomplete="off">',
          ok: 'حذف همه اطلاعات',
          danger: true,
          validate: function (b) { return b.querySelector('#wipeWord').value.trim() === 'حذف' ? '' : 'کلمه «حذف» را دقیق بنویسید'; }
        });
        if (!box) return;
        try { await clearAll(); UI.toast('همه اطلاعات حذف شد', 'ok'); App.go('dashboard'); }
        catch (err) { UI.toast('حذف انجام نشد', 'bad'); }
      }
    });
  }

  App.register('backup', { render: renderBackup });
  App.register('settings', { render: renderSettings });

  document.addEventListener('DOMContentLoaded', refreshNote);
  window.addEventListener('hashchange', function () {
    var h = location.hash.slice(1);
    if (!h || h === 'dashboard') setTimeout(refreshNote, 60);
  });
})();
