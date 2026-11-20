/*
 * GitHub-only public record loader.
 * Reads the public records.json from the same GitHub Pages site and fills
 * the existing value spans in getMarriageDetailsFromQR.html.
 * No Supabase/Firebase/other database service is used.
 */
(function () {
  'use strict';

  var FIELD_MAP = {
    recordApplication: 'app',
    recordGroom: 'groom',
    recordBride: 'bride',
    recordVenue: 'venue',
    recordDistrict: 'district',
    recordTehsil: 'tehsil',
    recordSubreg: 'subreg',
    recordEventDate: 'eventDate',
    recordRegno: 'regno',
    recordRegdate: 'regdate'
  };

  function byId(id) { return document.getElementById(id); }

  function showMessage(message) {
    var box = byId('recordMessage');
    if (!box) {
      box = document.createElement('div');
      box.id = 'recordMessage';
      box.style.cssText = 'display:block;text-align:center;margin:10px auto;padding:8px 12px;color:#8a1c1c;background:#fff4f4;border:1px solid #e2b7b7;';
      var table = document.querySelector('table');
      if (table && table.parentNode) table.parentNode.insertBefore(box, table);
      else document.body.insertBefore(box, document.body.firstChild);
    }
    box.textContent = message;
    box.style.display = 'block';
  }

  function hideMessage() {
    var box = byId('recordMessage');
    if (box) {
      box.textContent = '';
      box.style.display = 'none';
    }
  }

  function clearValues() {
    Object.keys(FIELD_MAP).forEach(function (id) {
      var node = byId(id);
      if (node) node.textContent = '—';
    });
  }

  function addNonGovernmentNotice() {
    // Reuse the disclaimer already added by the earlier add-on, if present.
    var notice = byId('onlineIndependentNotice') || byId('githubOnlyIndependentNotice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'githubOnlyIndependentNotice';
      var container = document.querySelector('.container') || document.body;
      container.insertBefore(notice, container.firstChild);
    }
  }

  function displayRecord(record) {
    Object.keys(FIELD_MAP).forEach(function (elementId) {
      var target = byId(elementId);
      if (!target) return;
      var value = record[FIELD_MAP[elementId]];
      target.textContent = value === null || value === undefined || String(value).trim() === '' ? '—' : String(value);
    });
  }

  function recordsUrl() {
    var url = new URL('records.json', window.location.href);
    url.searchParams.set('_refresh', String(Date.now()));
    return url.href;
  }

  async function run() {
    var id = new URLSearchParams(window.location.search).get('ano');
    addNonGovernmentNotice();

    if (!id) {
      clearValues();
      showMessage('रिकॉर्ड ID URL में उपलब्ध नहीं है। उदाहरण: ?ano=RECORD_ID');
      return;
    }

    // Clear any value left by the old local IndexedDB script while the public file loads.
    clearValues();

    try {
      var response = await fetch(recordsUrl(), { cache: 'no-store' });
      if (!response.ok) throw new Error('records.json लोड नहीं हुआ (HTTP ' + response.status + ')');
      var records = await response.json();
      if (!Array.isArray(records)) throw new Error('records.json का format सही नहीं है; इसमें JSON array होना चाहिए।');

      var record = records.find(function (item) { return item && String(item.id) === id; });
      if (!record) {
        showMessage('इस Record ID से कोई रिकॉर्ड नहीं मिला। कृपया URL जाँचें।');
        return;
      }

      displayRecord(record);
      hideMessage();
    } catch (error) {
      showMessage('ऑनलाइन रिकॉर्ड नहीं खुल सका: ' + (error && error.message ? error.message : String(error)));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
