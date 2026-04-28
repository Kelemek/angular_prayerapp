/**
 * Injected once into saddle-stitch booklet HTML. After fonts load, greedily assigns prayer
 * fragments to reader pages using an off-screen `.booklet-panel`: add cards until the chunk would
 * exceed usable height (`scrollHeight`), then start the next page. The fit tolerance allows a modest
 * dip into bottom inset plus rounding (~subpixel/fonts); overflow is still bounded by `.booklet-panel`
 * (`overflow:hidden` on paper). If measurement is unavailable (e.g. zero-height fixture),
 * the pre-rendered fallback markup in `#booklet-dynamic-root` stays.
 */

export function buildBookletMeasurePackScript(): string {
  return `(function(){
  function padToFourWithBackLast(pagesBeforeBack, blankInner, backCover) {
    var padCount = (4 - ((pagesBeforeBack.length + 1) % 4)) % 4;
    var blanks = [];
    for (var i = 0; i < padCount; i++) { blanks.push(blankInner); }
    return pagesBeforeBack.concat(blanks).concat([backCover]);
  }
  function surfaceHtmlFromReaders(readerPages) {
    var N = readerPages.length;
    var numSheets = N / 4;
    var out = [];
    for (var s = 0; s < numSheets; s++) {
      out.push(
        '\\n  <div class="booklet-print-surface">\\n' +
        '    <div class="booklet-panel">' + readerPages[N - 2 * s - 1] + '</div>\\n' +
        '    <div class="booklet-panel">' + readerPages[2 * s] + '</div>\\n' +
        '  </div>'
      );
      out.push(
        '\\n  <div class="booklet-print-surface">\\n' +
        '    <div class="booklet-panel">' + readerPages[2 * s + 1] + '</div>\\n' +
        '    <div class="booklet-panel">' + readerPages[N - 2 * s - 2] + '</div>\\n' +
        '  </div>'
      );
    }
    return out.join('');
  }
  function wrapChunk(includeH2, h2, innerFrags) {
    var head = includeH2 ? h2 : '';
    return '<div class="booklet-chunk">' + head + innerFrags.join('') + '</div>';
  }
  function decodeB64Utf8(b64) {
    var raw = atob(b64.replace(/\\s/g, ''));
    if (typeof TextDecoder !== 'undefined') {
      var len = raw.length;
      var arr = new Uint8Array(len);
      for (var i = 0; i < len; i++) arr[i] = raw.charCodeAt(i);
      return new TextDecoder('utf-8').decode(arr);
    }
    return decodeURIComponent(escape(raw));
  }
  /** px tolerance: font/rounding (~12) + up to ~45% of bottom inset (dip before hard clip at panel box). */
  function measureFitEpsPx(panel) {
    var pbStr = String(window.getComputedStyle(panel).paddingBottom || '');
    var pb = parseFloat(pbStr);
    if (isNaN(pb)) {
      pb = 0;
    } else if (pbStr.indexOf('in') !== -1) {
      pb = Math.round(pb * 96);
    } else {
      pb = Math.round(pb);
    }
    var dip = pb > 0 ? Math.min(20, Math.round(pb * 0.45)) : 8;
    return 12 + dip;
  }
  function packSectionFragments(measurePanel, h2, fragments, epsPx) {
    var chunksHtml = [];
    var cur = [];
    var includeH2Next = true;
    var fi = 0;
    while (fi < fragments.length) {
      var trial = cur.concat([fragments[fi]]);
      measurePanel.innerHTML = wrapChunk(includeH2Next, h2, trial);
      var maxH = measurePanel.clientHeight + epsPx;
      var fits = measurePanel.scrollHeight <= maxH;
      if (fits) {
        cur = trial;
        fi++;
        continue;
      }
      if (cur.length === 0) {
        chunksHtml.push(wrapChunk(includeH2Next, h2, [fragments[fi]]));
        includeH2Next = false;
        cur = [];
        fi++;
        continue;
      }
      chunksHtml.push(wrapChunk(includeH2Next, h2, cur));
      includeH2Next = false;
      cur = [];
    }
    if (cur.length) chunksHtml.push(wrapChunk(includeH2Next, h2, cur));
    return chunksHtml;
  }
  function run() {
    var b64El = document.getElementById('booklet-pack-b64');
    var mount = document.getElementById('booklet-dynamic-root');
    var meas = document.getElementById('__book_meas_panel');
    var measWrap = document.getElementById('__book_meas_host');
    if (!b64El || !mount || !meas) return;
    if (meas.clientHeight < 40) return;
    var data;
    try {
      data = JSON.parse(decodeB64Utf8(b64El.textContent || ''));
    } catch (e) {
      return;
    }
    if (!data || !data.sections) return;
    var eps = measureFitEpsPx(meas);
    var allChunks = [];
    for (var si = 0; si < data.sections.length; si++) {
      var sec = data.sections[si];
      var h2 = sec.h2 || '';
      var fr = sec.fragments || [];
      var part = packSectionFragments(meas, h2, fr, eps);
      for (var pi = 0; pi < part.length; pi++) allChunks.push(part[pi]);
    }
    var readerPages = [data.covers.coverFront].concat(allChunks);
    readerPages = padToFourWithBackLast(readerPages, data.covers.blankInner, data.covers.coverBack);
    mount.innerHTML = surfaceHtmlFromReaders(readerPages);
    if (measWrap && measWrap.parentNode) measWrap.parentNode.removeChild(measWrap);
    if (b64El.parentNode) b64El.parentNode.removeChild(b64El);
  }
  function launchPrint() {
    try { run(); } catch (err) {}
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.print();
      });
    });
  }
  function queuePrint() {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(launchPrint).catch(launchPrint);
    } else {
      setTimeout(launchPrint, 80);
    }
  }
  function start() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', queuePrint);
    } else {
      queuePrint();
    }
  }
  start();
})();`;
}
