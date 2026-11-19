(function () {
  'use strict';
  var pages = {};
  var TITLES = {
    attendance: 'حضور و غیاب دانش‌آموزان', sport: 'حضور و غیاب ورزش',
    teachers: 'حضور و غیاب دبیران', officials: 'دبیران و مسئولان هنرستان',
    calendar: 'تقویم شمسی', reports: 'گزارش‌ها و آمار',
    backup: 'پشتیبان‌گیری و بازیابی', settings: 'تنظیمات'
  };

  function register(name, page) { pages[name] = page; }
  function current() { return location.hash.slice(1) || 'dashboard'; }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = UI.fa(Math.max(0, v)); }

  async function refreshDashboard() {
    document.getElementById('todayDate').textContent = Jalali.longDate(Jalali.todayString());
    try {
      var students = await DB.getPeople({ type: 'student' });
      var recs = await DB.getRecordsByDate(Jalali.todayString());
      var ids = {};
      students.forEach(function (s) { ids[s.id] = true; });
      var absent = 0, leave = 0, sport = 0, teachers = 0, officials = 0;
      recs.forEach(function (r) {
        if (r.activity === 'daily') {
          if (!ids[r.personId]) return;
          if (r.status === 'absent') absent++;
          else if (r.status === 'leave') leave++;
        } else if (r.status === 'absent') {
          if (r.activity === 'sport') sport++;
          else if (r.activity === 'teacher') teachers++;
          else if (r.activity === 'official') officials++;
        }
      });
      setText('statTotal', students.length);
      setText('statPresent', students.length - absent - leave);
      setText('statAbsent', absent);
      setText('statSport', sport);
      setText('statTeachers', teachers);
      setText('statOfficials', officials);
    } catch (e) {}
  }

  function show(name) {
    var dash = document.getElementById('page-dashboard');
    var view = document.getElementById('page-view');
    if (name === 'dashboard') {
      dash.hidden = false; view.hidden = true; view.innerHTML = '';
      refreshDashboard();
    } else {
      dash.hidden = true; view.hidden = false; view.innerHTML = '';
      if (pages[name]) pages[name].render(view);
      else view.innerHTML =
        '<div class="page"><div class="page-head"><button class="back" data-page="dashboard"><svg><use href="#i-back"/></svg></button><h2>' +
        (TITLES[name] || '') + '</h2></div><div class="empty">این بخش در مرحله‌های بعدی ساخته می‌شود.</div></div>';
    }
    document.querySelectorAll('.bottom-nav button').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-page') === name);
    });
    window.scrollTo(0, 0);
  }

  function go(name) {
    if (current() === name) show(name);
    else location.hash = name;
  }

  function init() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-page]');
      if (t) { e.preventDefault(); go(t.getAttribute('data-page')); }
    });
    window.addEventListener('hashchange', function () { show(current()); });
    show(current());
    DB.open().then(function () { DB.requestPersistence(); })
      .catch(function () { UI.toast('خطا در باز کردن حافظه برنامه', 'bad'); });
  }

  window.App = { register: register, go: go, refreshDashboard: refreshDashboard };
  document.addEventListener('DOMContentLoaded', init);
})();
