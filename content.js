(function () {
  'use strict';

  const DAILY_GOAL = 160;
  const STORAGE_KEY = 'ysws_review_stats_v1';

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

  function makeStatsBar() {
    const stats = getStats();

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
    totalText.style.cssText = 'color:#d1d5db;font-size:14px;margin-left:auto;';
    totalText.textContent = `Total reviewed: ${stats.total}`;

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.style.cssText = `
      background: transparent; border: 1px solid rgba(251,191,36,0.4);
      color: #fbbf24; padding: 4px 10px; border-radius: 4px;
      font-size: 12px; cursor: pointer; font-family: inherit; margin-left: 8px;
    `;
    refreshBtn.onclick = () => {
      const s = getStats();
      document.getElementById('ysws-stat-today').textContent =
        `Devlogs reviewed today: ${s.today}/${DAILY_GOAL}`;
      document.getElementById('ysws-stat-total').textContent =
        `Total reviewed: ${s.total}`;
      document.getElementById('ysws-stat-progress').style.width =
        `${Math.min((s.today / DAILY_GOAL) * 100, 100)}%`;
    };

    container.appendChild(todayText);
    container.appendChild(progressContainer);
    container.appendChild(totalText);
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
    const devlogCount = countDevlogsOnPage();
    if (!devlogCount) return;

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

    const statusLine = wasAlreadyCounted
      ? `<div style="color:#4ade80;margin-top:2px;font-size:11px;">Already counted</div>`
      : `<div style="color:#9ca3af;margin-top:2px;font-size:11px;">This review: ${devlogCount} devlog${devlogCount!==1?'s':''}</div>`;

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
        const result = addDevlogs(devlogCount, reviewId);

        if (result.alreadyCounted) {
          showToast(`Already counted this review! Today: ${result.stats.today}  •  Total: ${result.stats.total}`);
        } else {
          showToast(`+${devlogCount} devlog${devlogCount!==1?'s':''} counted! Today: ${result.stats.today}  •  Total: ${result.stats.total}`);
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
    if (document.getElementById('ysws-review-stats')) return;

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

  const observer = new MutationObserver(() => {
    const path = location.pathname;
    if (isListPage(path) && !document.getElementById('ysws-review-stats')) {
      injectListStats();
    } else if (isDetailPage(path) && !document.getElementById('ysws-detail-badge')) {
      setupDetailPage();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
