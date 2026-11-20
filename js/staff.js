(function () {
  'use strict';

  var CSS = '' +
    '.seg{display:flex;gap:6px;margin-top:14px;background:#fff;border-radius:var(--radius);box-shadow:var(--shadow);padding:6px}' +
    '.seg button{flex:1;background:none;color:#7C8CA3;padding:10px 4px;border-radius:16px;font-size:.9rem;font-weight:700;transition:all .2s ease}' +
    '.seg button.on{background:var(--blue);color:#fff}' +
    '.mv{display:flex;flex-direction:column;gap:3px;flex:none}' +
    '.mv button{width:34px;height:26px;border-radius:10px;background:var(--bg);color:var(--blue);display:grid;place-items:center}' +
    '.mv svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}' +
    '.mv .up svg{transform:rotate(-90deg)}' +
    '.mv .dn svg{transform:rotate(90deg)}' +
    '.count-line{margin:12px 4px 0;font-size:.85rem;opacity:.7}';

  function ic(id) { return '<svg><use href="#i-' + id + '"/></svg>'; }

  function injectCss() {
    if (document.getElementById('staff-css')) return;
    var s = document.createElement('style');
    s.id = 'staff-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function parseNames(text) {
    return text.split(/[\r\n]+/).map(function (l) {
      return l.replace(/^[\s•\-–—*]*[\d۰-۹٠-٩]+\s*[\.\-\)\:،\/\\]+\s*/, '')
              .replace(/^[\s•\-–—*]+/, '').trim();
    }).filter(function (n) { return n && !/^[\d۰-۹٠-٩\s\.\-\)]+$/.test(n); });
  }

  function makeAtt(opts) {
    var captured, orig = App.register;
    App.register = function (n, p) { captured = p; };
    try { AttList.create(opts); } finally { App.register = orig; }
    return captured;
  }

  function seg(cfg, mode) {
    return '<div class="seg">' +
      '<button class="' + (mode === 'att' ? 'on' : '') + '" data-page="' + cfg.page + '">حضور و غیاب</button>' +
      '<button class="' + (mode === 'manage' ? 'on' : '') + '" data-page="' + cfg.page + '-manage">مدیریت فهرست</button></div>';
  }

  function manage(cfg, root) {
    injectCss();
    var st = { people: [] };
    root.innerHTML =
      '<div class="page st-page">' +
      '<div class="page-head"><button class="back" data-page="dashboard">' + ic('back') + '</button><h2>' + cfg.title + '</h2></div>' +
      seg(cfg, 'manage') +
      '<div class="btn-row"><button class="btn primary" data-act="add">' + ic('plus') + 'افزودن</button>' +
      '<button class="btn ghost" data-act="bulk">' + ic('list') + 'ورود گروهی</button></div>' +
      '<div class="count-line" id="mCount"></div>' +
      '<div class="list" id="mList"></div></div>';
    var page = root.querySelector('.st-page');

    function alive() { return page.isConnected; }

    async function reload() {
      try { st.people = await DB.getPeople({ type: cfg.type }); }
      catch (e) { UI.toast('خطا در خواندن اطلاعات', 'bad'); st.people = []; }
      if (alive()) draw();
    }

    function draw() {
      page.querySelector('#mCount').textContent = UI.fa(st.people.length) + ' نفر در فهرست (به ترتیب نمایش در حضور و غیاب)';
      var el = page.querySelector('#mList');
      if (!st.people.length) {
        el.innerHTML = '<div class="empty">هنوز نامی ثبت نشده است.<br>با «ورود گروهی» می‌توانید کل فهرست را یک‌جا Paste کنید.</div>';
        return;
      }
      el.innerHTML = st.people.map(function (p, i) {
        return '<div class="row"><div class="avatar">' + UI.fa(i + 1) + '</div>' +
          '<div class="name">' + UI.esc(p.name) + '</div>' +
          '<div class="mv"><button class="up" data-up="' + p.id + '" aria-label="بالا">' + ic('back') + '</button>' +
          '<button class="dn" data-dn="' + p.id + '" aria-label="پایین">' + ic('back') + '</button></div>' +
          '<button class="icon-btn" data-edit="' + p.id + '">' + ic('edit') + '</button>' +
          '<button class="icon-btn danger" data-del="' + p.id + '">' + ic('trash') + '</button></div>';
      }).join('');
    }

    function find(id) { return st.people.filter(function (p) { return p.id === id; })[0]; }

    async function addOne() {
      var box = await UI.dialog({
        title: 'افزودن ' + cfg.noun,
        body: '<label>نام و نام خانوادگی</label><input type="text" id="fName" autocomplete="off">',
        ok: 'افزودن',
        validate: function (b) { return b.querySelector('#fName').value.trim() ? '' : 'نام را وارد کنید'; }
      });
      if (!box) return;
      try {
        await DB.addPerson({ name: box.querySelector('#fName').value, type: cfg.type });
        UI.toast('اضافه شد', 'ok');
      } catch (e) { UI.toast(e.message, 'bad'); }
      reload();
    }

    async function addMany() {
      var box = await UI.dialog({
        title: 'ورود گروهی ' + cfg.nounPlural,
        body: '<label>هر نام در یک خط</label><textarea id="fMany"></textarea>' +
          '<div class="hint">ترتیب خط‌ها همان ترتیب فهرست می‌شود. شماره ابتدای خط‌ها خودکار حذف می‌شود و نام‌های تکراری ثبت نمی‌شوند.</div>',
        ok: 'ثبت فهرست',
        validate: function (b) { return parseNames(b.querySelector('#fMany').value).length ? '' : 'حداقل یک نام وارد کنید'; }
      });
      if (!box) return;
      var list = parseNames(box.querySelector('#fMany').value).map(function (n) { return { name: n, type: cfg.type }; });
      try {
        var r = await DB.addPeople(list);
        UI.toast(UI.fa(r.added) + ' نفر اضافه شد' + (r.skipped ? ' (' + UI.fa(r.skipped) + ' تکراری رد شد)' : ''), 'ok');
      } catch (e) { UI.toast(e.message, 'bad'); }
      reload();
    }

    async function edit(id) {
      var p = find(id);
      if (!p) return;
      var box = await UI.dialog({
        title: 'ویرایش ' + cfg.noun,
        body: '<label>نام و نام خانوادگی</label><input type="text" id="fName" value="' + UI.esc(p.name) + '">',
        ok: 'ذخیره',
        validate: function (b) { return b.querySelector('#fName').value.trim() ? '' : 'نام را وارد کنید'; }
      });
      if (!box) return;
      try {
        await DB.updatePerson(id, { name: box.querySelector('#fName').value });
        UI.toast('ذخیره شد', 'ok');
      } catch (e) { UI.toast(e.message, 'bad'); }
      reload();
    }

    async function del(id) {
      var p = find(id);
      if (!p) return;
      var yes = await UI.confirm('«' + p.name + '» حذف شود؟ همه سوابق غیبت او هم پاک می‌شود و قابل برگشت نیست.', 'حذف', true);
      if (!yes) return;
      try { await DB.deletePerson(id); UI.toast('حذف شد', 'ok'); }
      catch (e) { UI.toast(e.message, 'bad'); }
      reload();
    }

    async function move(id, dir) {
      var ids = st.people.map(function (p) { return p.id; });
      var i = ids.indexOf(id), j = i + dir;
      if (i < 0 || j < 0 || j >= ids.length) return;
      var t = ids[i]; ids[i] = ids[j]; ids[j] = t;
      try { await DB.reorderPeople(ids); }
      catch (e) { UI.toast(e.message, 'bad'); }
      reload();
    }

    page.addEventListener('click', function (e) {
      var t = e.target.closest('[data-act]');
      if (t) {
        var a = t.getAttribute('data-act');
        if (a === 'add') addOne();
        else if (a === 'bulk') addMany();
        return;
      }
      t = e.target.closest('[data-up]'); if (t) { move(t.getAttribute('data-up'), -1); return; }
      t = e.target.closest('[data-dn]'); if (t) { move(t.getAttribute('data-dn'), 1); return; }
      t = e.target.closest('[data-edit]'); if (t) { edit(t.getAttribute('data-edit')); return; }
      t = e.target.closest('[data-del]'); if (t) { del(t.getAttribute('data-del')); return; }
    });

    reload();
  }

  function define(cfg) {
    var att = makeAtt({
      name: cfg.page + '-att',
      title: cfg.title,
      type: cfg.type,
      activity: cfg.activity,
      grades: false,
      sort: 'order',
      reportTitle: cfg.reportTitle,
      absentLabel: cfg.absentLabel,
      emptyText: 'هنوز نامی در فهرست ثبت نشده است.',
      managePage: cfg.page + '-manage',
      manageLabel: 'ورود فهرست نام‌ها'
    });
    App.register(cfg.page, {
      render: function (root) {
        injectCss();
        att.render(root);
        var h = root.querySelector('.page-head');
        if (h) h.insertAdjacentHTML('afterend', seg(cfg, 'att'));
      }
    });
    App.register(cfg.page + '-manage', { render: function (root) { manage(cfg, root); } });
  }

  define({
    page: 'teachers', type: 'teacher', activity: 'teacher',
    title: 'حضور و غیاب دبیران',
    noun: 'دبیر', nounPlural: 'دبیران',
    reportTitle: 'گزارش دبیران غایب هنرستان',
    absentLabel: 'دبیران غایب'
  });

  define({
    page: 'officials', type: 'official', activity: 'official',
    title: 'دبیران و مسئولان هنرستان',
    noun: 'فرد', nounPlural: 'مسئولان و دبیران',
    reportTitle: 'گزارش غایبین دبیران و مسئولان هنرستان',
    absentLabel: 'غایبین'
  });
})();
