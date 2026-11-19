(function () {
  'use strict';

  var DB_NAME = 'honarAttendanceDB';
  var DB_VERSION = 1;
  var dbPromise = null;

  var PERSON_TYPES = ['student', 'teacher', 'official'];
  var GRADES = [10, 11, 12];
  var STATUSES = ['absent', 'late', 'leave'];
  var ACTIVITIES_BY_TYPE = {
    student: ['daily', 'sport'],
    teacher: ['teacher'],
    official: ['official']
  };
  var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('people')) {
          var p = db.createObjectStore('people', { keyPath: 'id' });
          p.createIndex('type', 'type');
        }
        if (!db.objectStoreNames.contains('records')) {
          var r = db.createObjectStore('records', { keyPath: 'key' });
          r.createIndex('date', 'date');
          r.createIndex('personId', 'personId');
          r.createIndex('activity', 'activity');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { dbPromise = null; reject(req.error); };
    });
    return dbPromise;
  }

  function wrap(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function txDone(tx) {
    return new Promise(function (resolve, reject) {
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error || new Error('تراکنش لغو شد')); };
    });
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function cleanName(name) {
    return String(name || '')
      .replace(/ي/g, 'ی')
      .replace(/ك/g, 'ک')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function groupKey(p) {
    return p.type + '|' + (p.grade || '');
  }

  function recordKey(personId, date, activity) {
    return personId + '|' + date + '|' + activity;
  }

  /* ---------- افراد ---------- */

  async function addPeople(list) {
    var clean = list
      .map(function (p) {
        return {
          name: cleanName(p.name),
          type: p.type,
          grade: p.type === 'student' ? Number(p.grade) : null
        };
      })
      .filter(function (p) { return p.name !== ''; });

    clean.forEach(function (p) {
      if (PERSON_TYPES.indexOf(p.type) === -1) throw new Error('نوع فرد نامعتبر است');
      if (p.type === 'student' && GRADES.indexOf(p.grade) === -1) throw new Error('پایه نامعتبر است');
    });

    var db = await open();
    var tx = db.transaction('people', 'readwrite');
    var s = tx.objectStore('people');
    var existing = await wrap(s.getAll());

    var maxOrder = {};
    var names = {};
    existing.forEach(function (p) {
      var k = groupKey(p);
      maxOrder[k] = Math.max(maxOrder[k] || 0, p.order || 0);
      names[k] = names[k] || {};
      names[k][p.name] = true;
    });

    var added = [];
    var skipped = 0;
    clean.forEach(function (p) {
      var k = groupKey(p);
      names[k] = names[k] || {};
      if (names[k][p.name]) { skipped++; return; }
      names[k][p.name] = true;
      maxOrder[k] = (maxOrder[k] || 0) + 1;
      var rec = {
        id: newId(),
        name: p.name,
        type: p.type,
        grade: p.grade,
        order: maxOrder[k],
        createdAt: Date.now()
      };
      s.add(rec);
      added.push(rec);
    });

    await txDone(tx);
    return { added: added.length, skipped: skipped, people: added };
  }

  async function addPerson(person) {
    var r = await addPeople([person]);
    if (r.added === 0) throw new Error('این نام قبلاً در همین فهرست ثبت شده است');
    return r.people[0];
  }

  async function getPeople(filter) {
    filter = filter || {};
    var db = await open();
    var all = await wrap(db.transaction('people').objectStore('people').getAll());
    return all
      .filter(function (p) {
        if (filter.type && p.type !== filter.type) return false;
        if (filter.grade && p.grade !== Number(filter.grade)) return false;
        return true;
      })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }

  async function updatePerson(id, changes) {
    var db = await open();
    var tx = db.transaction('people', 'readwrite');
    var s = tx.objectStore('people');
    var person = await wrap(s.get(id));
    if (!person) throw new Error('فرد پیدا نشد');

    if (changes.name !== undefined) {
      var name = cleanName(changes.name);
      if (!name) throw new Error('نام نمی‌تواند خالی باشد');
      var all = await wrap(s.getAll());
      var dup = all.some(function (p) {
        return p.id !== id && groupKey(p) === groupKey(person) && p.name === name;
      });
      if (dup) throw new Error('این نام قبلاً در همین فهرست ثبت شده است');
      person.name = name;
    }
    if (changes.grade !== undefined && person.type === 'student') {
      var g = Number(changes.grade);
      if (GRADES.indexOf(g) === -1) throw new Error('پایه نامعتبر است');
      person.grade = g;
    }
    s.put(person);
    await txDone(tx);
    return person;
  }

  async function reorderPeople(idsInOrder) {
    var db = await open();
    var tx = db.transaction('people', 'readwrite');
    var s = tx.objectStore('people');
    for (var i = 0; i < idsInOrder.length; i++) {
      var p = await wrap(s.get(idsInOrder[i]));
      if (p) { p.order = i + 1; s.put(p); }
    }
    await txDone(tx);
  }

  async function deletePerson(id) {
    var db = await open();
    var tx = db.transaction(['people', 'records'], 'readwrite');
    var records = tx.objectStore('records');
    var keys = await wrap(records.index('personId').getAllKeys(IDBKeyRange.only(id)));
    keys.forEach(function (k) { records.delete(k); });
    tx.objectStore('people').delete(id);
    await txDone(tx);
  }

  /* ---------- سوابق حضور و غیاب ---------- */

  async function setRecord(personId, date, activity, status) {
    if (!DATE_RE.test(date)) throw new Error('تاریخ نامعتبر است');
    if (STATUSES.indexOf(status) === -1) throw new Error('وضعیت نامعتبر است');

    var db = await open();
    var tx = db.transaction(['people', 'records'], 'readwrite');
    var person = await wrap(tx.objectStore('people').get(personId));
    if (!person) throw new Error('فرد پیدا نشد');
    if (ACTIVITIES_BY_TYPE[person.type].indexOf(activity) === -1) {
      throw new Error('نوع فعالیت برای این فرد معتبر نیست');
    }
    var rec = {
      key: recordKey(personId, date, activity),
      personId: personId,
      date: date,
      activity: activity,
      status: status,
      updatedAt: Date.now()
    };
    tx.objectStore('records').put(rec);
    await txDone(tx);
    return rec;
  }

  async function clearRecord(personId, date, activity) {
    var db = await open();
    var tx = db.transaction('records', 'readwrite');
    tx.objectStore('records').delete(recordKey(personId, date, activity));
    await txDone(tx);
  }

  function byActivity(list, activity) {
    return activity ? list.filter(function (r) { return r.activity === activity; }) : list;
  }

  async function getRecordsByDate(date, activity) {
    var db = await open();
    var idx = db.transaction('records').objectStore('records').index('date');
    return byActivity(await wrap(idx.getAll(IDBKeyRange.only(date))), activity);
  }

  async function getRecordsInRange(from, to, activity) {
    var db = await open();
    var idx = db.transaction('records').objectStore('records').index('date');
    return byActivity(await wrap(idx.getAll(IDBKeyRange.bound(from, to))), activity);
  }

  async function getRecordsByPerson(personId, activity) {
    var db = await open();
    var idx = db.transaction('records').objectStore('records').index('personId');
    return byActivity(await wrap(idx.getAll(IDBKeyRange.only(personId))), activity);
  }

  /* ---------- تنظیمات ---------- */

  async function getSetting(key, fallback) {
    var db = await open();
    var row = await wrap(db.transaction('settings').objectStore('settings').get(key));
    return row ? row.value : fallback;
  }

  async function setSetting(key, value) {
    var db = await open();
    var tx = db.transaction('settings', 'readwrite');
    tx.objectStore('settings').put({ key: key, value: value });
    await txDone(tx);
  }

  /* ---------- پشتیبان‌گیری و ماندگاری ---------- */

  async function exportAll() {
    var db = await open();
    var tx = db.transaction(['people', 'records', 'settings']);
    var out = {
      people: await wrap(tx.objectStore('people').getAll()),
      records: await wrap(tx.objectStore('records').getAll()),
      settings: await wrap(tx.objectStore('settings').getAll())
    };
    return out;
  }

  async function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
    return false;
  }

  window.DB = {
    open: open,
    addPerson: addPerson,
    addPeople: addPeople,
    getPeople: getPeople,
    updatePerson: updatePerson,
    reorderPeople: reorderPeople,
    deletePerson: deletePerson,
    setRecord: setRecord,
    clearRecord: clearRecord,
    getRecordsByDate: getRecordsByDate,
    getRecordsInRange: getRecordsInRange,
    getRecordsByPerson: getRecordsByPerson,
    getSetting: getSetting,
    setSetting: setSetting,
    exportAll: exportAll,
    requestPersistence: requestPersistence
  };
})();
