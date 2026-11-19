(function () {
  'use strict';

  function fa(v) { return String(v).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, type) {
    var el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 300);
    }, 2600);
  }

  function dialog(o) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div');
      ov.className = 'overlay';
      ov.innerHTML =
        '<div class="dlg"><h3>' + esc(o.title || '') + '</h3>' +
        '<div>' + (o.body || '') + '</div>' +
        '<div class="dlg-err" hidden></div>' +
        '<div class="dlg-actions">' +
        '<button class="btn ' + (o.danger ? 'danger' : 'primary') + '" data-ok>' + esc(o.ok || 'تأیید') + '</button>' +
        '<button class="btn ghost" data-cancel>انصراف</button></div></div>';
      document.body.appendChild(ov);
      var box = ov.querySelector('.dlg'), err = ov.querySelector('.dlg-err');
      function close(r) { ov.remove(); resolve(r); }
      ov.querySelector('[data-ok]').addEventListener('click', function () {
        var m = o.validate ? o.validate(box) : '';
        if (m) { err.textContent = m; err.hidden = false; return; }
        close(box);
      });
      ov.querySelector('[data-cancel]').addEventListener('click', function () { close(null); });
      var inp = box.querySelector('input[type="text"]');
      if (inp) inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); ov.querySelector('[data-ok]').click(); }
      });
    });
  }

  async function confirmBox(msg, ok, danger) {
    var b = await dialog({ title: 'تأیید', body: '<p class="dlg-text">' + esc(msg) + '</p>', ok: ok || 'بله', danger: !!danger });
    return !!b;
  }

  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast('کپی شد', 'ok');
        return true;
      }
    } catch (e) {}
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove();
    toast(ok ? 'کپی شد' : 'کپی انجام نشد', ok ? 'ok' : 'bad');
    return ok;
  }

  window.UI = { fa: fa, esc: esc, toast: toast, dialog: dialog, confirm: confirmBox, copy: copy };
})();
