/*
  Add-on for the existing getMarriageDetailsFromQR.html.
  It only reads one record using the ID in ?ano=... and fills the existing
  .col-sm-8.text-start value columns. Existing page markup/styles remain intact.
*/
(function () {
  'use strict';
  const CONFIG_URL = 'js/online-supabase-config.js';
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const $ = (selector) => document.querySelector(selector);
  const rows = () => Array.from(document.querySelectorAll('#tdOne .row'));

  function addIndependentNotice() {
    if ($('#onlineIndependentNotice')) return;
    const box = document.createElement('div');
    box.id = 'onlineIndependentNotice';
    box.textContent = 'स्वतंत्र निजी रिकॉर्ड डेमो — यह सरकारी पोर्टल नहीं है और किसी सरकारी प्रमाणपत्र/पंजीकरण की पुष्टि नहीं करता।';
    box.style.cssText = 'margin:10px 0;padding:9px 12px;border:1px solid #c49a32;background:#fff4d6;color:#3b2d0b;font:14px/1.5 Arial,sans-serif;text-align:center;';
    const container = $('.container') || document.body;
    container.insertBefore(box, container.firstChild);
  }

  function showMessage(message, isError) {
    let node = $('#onlineRecordMessage');
    if (!node) {
      node = document.createElement('div');
      node.id = 'onlineRecordMessage';
      node.style.cssText = 'margin:10px 0;padding:10px;border:1px solid #cbd5e1;background:#f8fafc;color:#111;font:14px/1.5 Arial,sans-serif;';
      const container = $('.container') || document.body;
      const notice = $('#onlineIndependentNotice');
      container.insertBefore(node, notice ? notice.nextSibling : container.firstChild);
    }
    node.textContent = message;
    node.style.borderColor = isError ? '#b42318' : '#cbd5e1';
  }

  function clearExistingValues() {
    rows().forEach(row => {
      const value = row.querySelector('.col-sm-8.text-start');
      if (value) value.textContent = '—';
    });
  }

  function setValues(record) {
    const keys = ['app','groom','bride','venue','district','tehsil','subreg','event_date','regno','regdate'];
    const allRows = rows();
    if (allRows.length < keys.length) throw new Error('मौजूदा विवरण पेज में 10 value rows नहीं मिलीं।');
    keys.forEach((key, index) => {
      const value = allRows[index].querySelector('.col-sm-8.text-start');
      if (!value) throw new Error('विवरण value column नहीं मिला (row '+(index+1)+').');
      value.textContent = record[key] || '—';
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = Array.from(document.scripts).find(s => s.src === new URL(src, location.href).href);
      if (existing) {
        if (window.supabase) return resolve();
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('स्क्रिप्ट लोड नहीं हुई: '+src)), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('स्क्रिप्ट लोड नहीं हुई: '+src));
      document.head.appendChild(script);
    });
  }

  async function run() {
    addIndependentNotice();
    const id = new URLSearchParams(location.search).get('ano');
    clearExistingValues();
    if (!id) {
      showMessage('इस विवरण को खोलने के लिए रिकॉर्ड URL में ?ano=RecordID होना जरूरी है।', true);
      return;
    }
    try {
      if (typeof window.ONLINE_SUPABASE_URL === 'undefined' || typeof window.ONLINE_SUPABASE_PUBLISHABLE_KEY === 'undefined') {
        throw new Error('js/online-supabase-config.js का script tag मौजूदा HTML के अंत में जोड़ें।');
      }
      if (!window.ONLINE_SUPABASE_URL || window.ONLINE_SUPABASE_URL.includes('PASTE_') ||
          !window.ONLINE_SUPABASE_PUBLISHABLE_KEY || window.ONLINE_SUPABASE_PUBLISHABLE_KEY.includes('PASTE_')) {
        throw new Error('Supabase URL/Publishable Key अभी सेट नहीं की गई है।');
      }
      if (!window.supabase || !window.supabase.createClient) await loadScript(SUPABASE_CDN);
      const client = window.supabase.createClient(window.ONLINE_SUPABASE_URL, window.ONLINE_SUPABASE_PUBLISHABLE_KEY);
      const { data, error } = await client.rpc('get_marriage_record_by_id', { p_id: id });
      if (error) throw error;
      if (!data) {
        showMessage('इस ID से कोई रिकॉर्ड नहीं मिला। कृपया रिकॉर्ड URL जाँचें।', true);
        return;
      }
      setValues(data);
      const note = $('#onlineRecordMessage');
      if (note) note.remove();
    } catch (error) {
      showMessage('ऑनलाइन रिकॉर्ड लोड नहीं हो सका: '+(error.message || String(error)), true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
