(function () {
  'use strict';
  var BR = [-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  var MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
  var DAYS = ['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];

  function div(a, b) { return Math.trunc(a / b); }
  function mod(a, b) { return a - Math.trunc(a / b) * b; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fa(v) { return String(v).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); }

  function jalCal(jy, noLeap) {
    var gy = jy + 621, leapJ = -14, jp = BR[0], jm, jump = 0, n, i, leapG, march, leap;
    for (i = 1; i < BR.length; i++) {
      jm = BR[i]; jump = jm - jp;
      if (jy < jm) break;
      leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;
    leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (noLeap) return { gy: gy, march: march };
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;
    return { leap: leap, gy: gy, march: march };
  }

  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  }

  function d2g(jdn) {
    var j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    var i = div(mod(j, 1461), 4) * 5 + 308;
    var gd = div(mod(i, 153), 5) + 1;
    var gm = mod(div(i, 153), 12) + 1;
    return { gy: div(j, 1461) - 100100 + div(8 - gm, 6), gm: gm, gd: gd };
  }

  function j2d(jy, jm, jd) {
    var r = jalCal(jy, true);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy);
    var k = jdn - g2d(gy, 3, r.march);
    if (k >= 0) {
      if (k <= 185) return { jy: jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
      k -= 186;
    } else {
      jy -= 1; k += 179;
      if (r.leap === 1) k += 1;
    }
    return { jy: jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
  }

  function toJalali(gy, gm, gd) { return d2j(g2d(gy, gm, gd)); }
  function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }
  function format(jy, jm, jd) { return jy + '-' + pad(jm) + '-' + pad(jd); }
  function parse(s) { var p = s.split('-').map(Number); return { jy: p[0], jm: p[1], jd: p[2] }; }

  function today() {
    var d = new Date();
    return toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  function todayString() { var t = today(); return format(t.jy, t.jm, t.jd); }

  function weekday(jy, jm, jd) {
    var g = toGregorian(jy, jm, jd);
    return (new Date(g.gy, g.gm - 1, g.gd).getDay() + 1) % 7;
  }

  function monthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return jalCal(jy).leap === 0 ? 30 : 29;
  }

  function addDays(s, n) {
    var p = parse(s), r = d2j(j2d(p.jy, p.jm, p.jd) + n);
    return format(r.jy, r.jm, r.jd);
  }

  function longDate(s) {
    var p = parse(s);
    return DAYS[weekday(p.jy, p.jm, p.jd)] + ' ' + fa(p.jd) + ' ' + MONTHS[p.jm - 1] + ' ' + fa(p.jy);
  }

  window.Jalali = {
    MONTHS: MONTHS, DAYS: DAYS, toJalali: toJalali, toGregorian: toGregorian,
    format: format, parse: parse, today: today, todayString: todayString,
    weekday: weekday, monthLength: monthLength, addDays: addDays, longDate: longDate
  };
})();
