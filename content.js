(function () {
  'use strict';

  const DAILY_GOAL = 160;
  const POOL_PRIZE = 5000;
  const STORAGE_KEY = 'ysws_review_stats_v1';
  const POOL_KEY = 'ysws_pool_total_v1';
  const REVIEWER_FILTER_ID = 'ysws-reviewer-filter';

  function getTodayISO() {
    return new Date().toISOString().split('T')[0];
  }

  function getStats() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const today = getTodayISO();
    if (!raw) {
      return { date: today, today: 0, total: 0, reviewedIds: [] };
    }
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data.reviewedIds)) data.reviewedIds = [];
      if (data.date !== today) {
        return { date: today, today: 0, total: data.total || 0, reviewedIds: data.reviewedIds };
      }
      return data;
    } catch (e) {
      return { date: today, today: 0, total: 0, reviewedIds: [] };
    }
  }

  function saveStats(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function addDevlogs(count, reviewId) {
    const stats = getStats();
    if (reviewId && stats.reviewedIds.includes(reviewId)) {
      return { stats, alreadyCounted: true };
    }
    stats.today += count;
    stats.total += count;
    if (reviewId) stats.reviewedIds.push(reviewId);
    saveStats(stats);
    return { stats, alreadyCounted: false };
  }

  function calculatePoolTotal() {
    let total = 0;
    const rows = document.querySelectorAll('table tbody tr, table tr');
    for (const row of rows) {
      if (row.querySelector('th')) continue;
      const cells = row.querySelectorAll('td');
      if (cells.length < 4) continue;
      const val = parseInt((cells[3].textContent || '').trim(), 10);
      if (!isNaN(val)) total += val;
    }
    return total;
  }

  function getPoolTotal() {
    const saved = localStorage.getItem(POOL_KEY);
    if (saved) return parseInt(saved, 10);
    const calculated = calculatePoolTotal();
    if (calculated > 0) {
      localStorage.setItem(POOL_KEY, String(calculated));
    }
    return calculated;
  }

  function formatCurrency(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  function makeStatsBar() {
    const stats = getStats();
    const poolTotal = getPoolTotal();
    const prize = poolTotal > 0 ? (stats.total / poolTotal) * POOL_PRIZE : 0;
    const prizePct = poolTotal > 0 ? Math.min((stats.total / poolTotal) * 100, 100) : 0;

    const container = document.createElement('div');
    container.id = 'ysws-review-stats';
    container.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: rgba(251, 191, 36, 0.1);
      border: 1px solid rgba(251, 191, 36, 0.3);
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    `;

    const todayText = document.createElement('span');
    todayText.id = 'ysws-stat-today';
    todayText.style.cssText = 'color:#fbbf24;font-size:14px;font-weight:600;';
    todayText.textContent = `Devlogs reviewed today: ${stats.today}/${DAILY_GOAL}`;

    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      width: 120px; height: 8px;
      background: rgba(251,191,36,0.2);
      border-radius: 4px; overflow: hidden;
    `;
    const progressFill = document.createElement('div');
    progressFill.id = 'ysws-stat-progress';
    const pct = Math.min((stats.today / DAILY_GOAL) * 100, 100);
    progressFill.style.cssText = `
      width: ${pct}%; height: 100%;
      background: #fbbf24; transition: width 0.3s ease;
    `;
    progressContainer.appendChild(progressFill);

    const totalText = document.createElement('span');
    totalText.id = 'ysws-stat-total';
    totalText.style.cssText = 'color:#d1d5db;font-size:14px;';
    totalText.textContent = `Total reviewed: ${stats.total}/${poolTotal}`;

    const prizeText = document.createElement('span');
    prizeText.id = 'ysws-stat-prize';
    prizeText.style.cssText = 'color:#4ade80;font-size:14px;margin-left:auto;';
    prizeText.textContent = `Pool Prize: ${formatCurrency(prize)} (${prizePct.toFixed(1)}%)`;

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.style.cssText = `
      background: transparent; border: 1px solid rgba(251,191,36,0.4);
      color: #fbbf24; padding: 4px 10px; border-radius: 4px;
      font-size: 12px; cursor: pointer; font-family: inherit; margin-left: 8px;
    `;
    refreshBtn.onclick = () => {
      const s = getStats();
      const pTotal = getPoolTotal();
      const pVal = pTotal > 0 ? (s.total / pTotal) * POOL_PRIZE : 0;
      const pPct = pTotal > 0 ? Math.min((s.total / pTotal) * 100, 100) : 0;
      document.getElementById('ysws-stat-today').textContent =
        `Devlogs reviewed today: ${s.today}/${DAILY_GOAL}`;
      document.getElementById('ysws-stat-total').textContent =
        `Total reviewed: ${s.total}/${pTotal}`;
      document.getElementById('ysws-stat-prize').textContent =
        `Pool Prize: ${formatCurrency(pVal)} (${pPct.toFixed(1)}%)`;
      document.getElementById('ysws-stat-progress').style.width =
        `${Math.min((s.today / DAILY_GOAL) * 100, 100)}%`;
    };

    container.appendChild(todayText);
    container.appendChild(progressContainer);
    container.appendChild(totalText);
    container.appendChild(prizeText);
    container.appendChild(refreshBtn);

    return container;
  }

  function showToast(message) {
    const existing = document.getElementById('ysws-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ysws-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px; right: 24px;
      background: rgba(251,191,36,0.15);
      border: 1px solid rgba(251,191,36,0.4);
      color: #fbbf24;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      z-index: 99999;
      backdrop-filter: blur(4px);
      animation: yswsToastIn 0.3s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes yswsToastIn {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes yswsToastOut {
        from { opacity: 1; transform: translateY(0); }
        to   { opacity: 0; transform: translateY(10px); }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'yswsToastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function getStatusFilterText() {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if ((label.textContent || '').trim() !== 'Status') continue;
      const wrapper = label.closest('.space-y-1');
      const selected = wrapper && wrapper.querySelector('button span');
      return (selected && selected.textContent || '').trim();
    }
    return '';
  }

  function isDoneStatusSelected() {
    return /^done\b/i.test(getStatusFilterText());
  }

  function getStatusFilterGrid() {
    const labels = document.querySelectorAll('label');
    for (const label of labels) {
      if ((label.textContent || '').trim() === 'Status') {
        return label.closest('.grid');
      }
    }
    return null;
  }

  function getReviewRows() {
    return Array.from(document.querySelectorAll('table tbody tr, table tr')).filter((row) => {
      return !row.querySelector('th') && row.querySelectorAll('td').length >= 7;
    });
  }

  function getRowReviewer(row) {
    const cells = row.querySelectorAll('td');
    return ((cells[6] && cells[6].textContent) || '').trim();
  }

  function getReviewerNames() {
    const names = new Set();
    for (const row of getReviewRows()) {
      const reviewer = getRowReviewer(row);
      if (reviewer && reviewer !== '-') names.add(reviewer);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }

  function setRowVisible(row, visible) {
    if (visible) {
      if (row.dataset.yswsReviewerHidden === '1') {
        row.style.display = row.dataset.yswsOriginalDisplay || '';
        delete row.dataset.yswsReviewerHidden;
        delete row.dataset.yswsOriginalDisplay;
      }
      return;
    }
    if (row.dataset.yswsReviewerHidden !== '1') {
      row.dataset.yswsOriginalDisplay = row.style.display || '';
      row.dataset.yswsReviewerHidden = '1';
    }
    row.style.display = 'none';
  }

  function resetReviewerFilterRows() {
    for (const row of getReviewRows()) setRowVisible(row, true);
  }

  function applyReviewerFilter() {
    const select = document.getElementById('ysws-reviewer-filter-select');
    if (!select || !isDoneStatusSelected()) {
      resetReviewerFilterRows();
      return;
    }
    const reviewer = select.value;
    for (const row of getReviewRows()) {
      setRowVisible(row, !reviewer || getRowReviewer(row) === reviewer);
    }
  }

  function syncReviewerOptions(select) {
    const selected = select.value;
    const names = getReviewerNames();
    const signature = names.join('\u001f');
    if (select.dataset.yswsReviewerNames === signature) return;

    select.dataset.yswsReviewerNames = signature;
    select.textContent = '';

    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'All reviewers';
    select.appendChild(allOption);

    for (const name of names) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    }

    select.value = names.includes(selected) ? selected : '';
  }

  function removeReviewerFilter() {
    const filter = document.getElementById(REVIEWER_FILTER_ID);
    if (filter) filter.remove();
    resetReviewerFilterRows();
  }

  function ensureReviewerFilter() {
    if (!isDoneStatusSelected()) {
      removeReviewerFilter();
      return;
    }

    const grid = getStatusFilterGrid();
    if (!grid) return;

    let filter = document.getElementById(REVIEWER_FILTER_ID);
    if (!filter) {
      filter = document.createElement('div');
      filter.id = REVIEWER_FILTER_ID;
      filter.className = 'space-y-1';
      filter.innerHTML = `
        <label class="text-amber-400 font-mono text-xs">Reviewer</label>
        <select id="ysws-reviewer-filter-select" class="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 font-mono text-xs text-white focus:outline-none focus:border-amber-600 hover:border-zinc-500 transition-colors" style="color-scheme: dark;"></select>
      `;
      grid.appendChild(filter);
      filter.querySelector('select').addEventListener('change', applyReviewerFilter);
    }

    syncReviewerOptions(filter.querySelector('select'));
    applyReviewerFilter();
  }

  function countDevlogsOnPage() {
    const headings = document.querySelectorAll('h3');
    for (const h of headings) {
      const text = h.textContent || '';
      const m = text.match(/Devlogs\s*\((\d+)\)/);
      if (m) return parseInt(m[1], 10);
    }
    const labels = document.querySelectorAll('span, div, p');
    let count = 0;
    for (const el of labels) {
      if (/Devlog\s+#\d+/.test(el.textContent || '')) count++;
    }
    return count || 0;
  }

  function getReviewIdFromUrl() {
    const m = location.pathname.match(/\/admin\/ysws_reviews\/(\d+)/);
    return m ? m[1] : null;
  }

  function setupDetailPage() {
    const reviewId = getReviewIdFromUrl();

    const stats = getStats();
    const wasAlreadyCounted = reviewId ? stats.reviewedIds.includes(reviewId) : false;

    const badge = document.createElement('div');
    badge.id = 'ysws-detail-badge';
    badge.style.cssText = `
      position: fixed; top: 16px; right: 16px;
      background: rgba(0,0,0,0.8);
      border: 1px solid rgba(251,191,36,0.3);
      color: #fbbf24;
      padding: 8px 14px; border-radius: 8px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px; z-index: 9999; line-height: 1.5;
      backdrop-filter: blur(4px);
    `;

    const devlogCountNow = countDevlogsOnPage();
    const statusLine = wasAlreadyCounted
      ? `<div style="color:#4ade80;margin-top:2px;font-size:11px;">Already counted</div>`
      : `<div style="color:#9ca3af;margin-top:2px;font-size:11px;">This review: ${devlogCountNow || '?'} devlog${(devlogCountNow !== 1) ? 's' : ''}</div>`;

    badge.innerHTML = `
      <div>Today: <b>${stats.today}</b> / ${DAILY_GOAL}</div>
      <div>Total: <b>${stats.total}</b></div>
      ${statusLine}
    `;
    document.body.appendChild(badge);

    let alreadyCountedThisSession = false;

    document.body.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      const text = (btn.textContent || '').trim();
      const isComplete = text === 'Complete Review' || text.includes('Complete Review');

      if (isComplete && !alreadyCountedThisSession && !btn.disabled) {
        alreadyCountedThisSession = true;
        const devlogCount = countDevlogsOnPage() || 0;
        const result = addDevlogs(devlogCount, reviewId);

        if (result.alreadyCounted) {
          showToast(`Already counted this review! Today: ${result.stats.today}  •  Total: ${result.stats.total}`);
        } else {
          showToast(`+${devlogCount} devlog${devlogCount !== 1 ? 's' : ''} counted! Today: ${result.stats.today}  •  Total: ${result.stats.total}`);
        }

        const b = document.getElementById('ysws-detail-badge');
        if (b) {
          b.innerHTML = `
            <div>Today: <b>${result.stats.today}</b> / ${DAILY_GOAL}</div>
            <div>Total: <b>${result.stats.total}</b></div>
            <div style="color:#4ade80;margin-top:2px;font-size:11px;">Already counted</div>
          `;
        }
      }
    });
  }

  function injectListStats() {
    const header = document.querySelector('h1.text-2xl');
    if (!header) return;
    const headerContainer = header.closest('.flex.flex-wrap');
    if (!headerContainer) return;
    ensureReviewerFilter();
    if (document.getElementById('ysws-review-stats')) return;

    getPoolTotal();
    const bar = makeStatsBar();
    headerContainer.parentNode.insertBefore(bar, headerContainer.nextSibling);
  }

  function isListPage(path) {
    return /^\/admin\/ysws_reviews\/?$/.test(path);
  }

  function isDetailPage(path) {
    return /^\/admin\/ysws_reviews\/\d+/.test(path);
  }

  function run() {
    const path = location.pathname;
    if (isListPage(path)) {
      injectListStats();
    } else if (isDetailPage(path)) {
      setupDetailPage();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  let listUpdateScheduled = false;

  function scheduleListUpdate() {
    if (listUpdateScheduled) return;
    listUpdateScheduled = true;
    requestAnimationFrame(() => {
      listUpdateScheduled = false;
      if (isListPage(location.pathname)) injectListStats();
    });
  }

  const observer = new MutationObserver(() => {
    const path = location.pathname;
    if (isListPage(path)) {
      scheduleListUpdate();
    } else if (isDetailPage(path) && !document.getElementById('ysws-detail-badge')) {
      setupDetailPage();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
