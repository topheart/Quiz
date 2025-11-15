import { getLeaderboardEntries, clearLeaderboard, formatDuration } from './leaderboard-store.js';

const qrBox = document.getElementById('qrBox');
const fallbackLink = document.getElementById('fallbackLink');
const modal = document.getElementById('leaderboardModal');
const leaderboardContent = document.getElementById('leaderboardContent');
const btnLeaderboard = document.getElementById('btnLeaderboard');
const btnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');
const btnRefreshLeaderboard = document.getElementById('btnRefreshLeaderboard');
const btnClear = document.getElementById('btnClear');

function escapeHtml(text) {
  const str = String(text ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderQRCode() {
  if (!qrBox) {
    return;
  }
  const quizUrl = new URL('quiz.html', window.location.href).toString();
  const qrUrl = `https://quickchart.io/qr?size=480&text=${encodeURIComponent(quizUrl)}`;
  const img = document.createElement('img');
  img.src = qrUrl;
  img.alt = 'Top Fun 3.0 問答 QR Code';
  img.loading = 'lazy';

  qrBox.innerHTML = '';
  qrBox.appendChild(img);

  if (fallbackLink) {
    fallbackLink.textContent = quizUrl;
    fallbackLink.hidden = false;
  }
}

async function renderLeaderboard() {
  if (!leaderboardContent) {
    return;
  }
  leaderboardContent.innerHTML = '<div class="leaderboard-empty">載入中...</div>';

  try {
    const entries = await getLeaderboardEntries();
    if (!entries.length) {
      leaderboardContent.innerHTML = '<div class="leaderboard-empty">尚無紀錄，歡迎第一個挑戰！</div>';
      return;
    }

    const header = `
      <div class="leaderboard-row header">
        <div>名次</div>
        <div>隊伍資訊</div>
      </div>
    `;

    const rows = entries
      .map((entry, index) => {
        const accuracy = entry.total ? `${entry.correct}/${entry.total}` : `${entry.correct}`;
        const duration = entry.durationSeconds ? formatDuration(entry.durationSeconds) : '';
        const detail = duration ? `${accuracy}｜${duration}` : accuracy;
        return `
          <div class="leaderboard-row">
            <div class="leaderboard-rank">#${index + 1}</div>
            <div class="leaderboard-body">
              <div class="leaderboard-team" title="${escapeHtml(entry.teamName)}">${escapeHtml(entry.teamName)}</div>
              <div class="leaderboard-line">
                <span class="leaderboard-score">分數 ${entry.score}</span>
                <span class="leaderboard-meta">${escapeHtml(detail)}</span>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    leaderboardContent.innerHTML = `<div class="leaderboard-grid">${header}${rows}</div>`;
  } catch (error) {
    leaderboardContent.innerHTML = '<div class="leaderboard-empty">排行榜暫時無法載入，請稍後再試。</div>';
    console.error('[Top Fun 3.0] 讀取排行榜失敗', error);
  }
}

function openModal() {
  if (!modal) {
    return;
  }
  modal.style.display = 'grid';
  modal.dataset.open = 'true';
  renderLeaderboard().catch(() => {});
}

function closeModal() {
  if (!modal) {
    return;
  }
  modal.style.display = 'none';
  delete modal.dataset.open;
}

async function handleClearLeaderboard() {
  if (!window.confirm('確定要清除所有紀錄嗎？')) {
    return;
  }
  try {
    await clearLeaderboard();
    await renderLeaderboard();
  } catch (error) {
    console.error('[Top Fun 3.0] 清除排行榜失敗', error);
    window.alert('清除失敗，請稍後再試。');
  }
}

function setupEvents() {
  if (btnLeaderboard) {
    btnLeaderboard.addEventListener('click', openModal);
  }
  if (btnCloseLeaderboard) {
    btnCloseLeaderboard.addEventListener('click', closeModal);
  }
  if (btnRefreshLeaderboard) {
    btnRefreshLeaderboard.addEventListener('click', () => {
      renderLeaderboard().catch(() => {});
    });
  }
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      handleClearLeaderboard().catch(() => {});
    });
  }
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal?.dataset.open === 'true') {
      closeModal();
    }
  });
}

function init() {
  renderQRCode();
  renderLeaderboard().catch(() => {});
  setupEvents();
}

document.addEventListener('DOMContentLoaded', init);
