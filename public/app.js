// ============================================
// App Logic - Review Scraper Tool
// ============================================

const API_BASE = '';

// DOM Elements
const androidUrl = document.getElementById('androidUrl');
const iosUrl = document.getElementById('iosUrl');
const dateFrom = document.getElementById('dateFrom');
const dateTo = document.getElementById('dateTo');
const saveConfigBtn = document.getElementById('saveConfig');
const scrapeAndroidBtn = document.getElementById('scrapeAndroid');
const scrapeIosBtn = document.getElementById('scrapeIos');
const scrapeBothBtn = document.getElementById('scrapeBoth');
const checkAndroidBtn = document.getElementById('checkAndroid');
const checkIosBtn = document.getElementById('checkIos');
const themeToggle = document.getElementById('themeToggle');
const progressSection = document.getElementById('progressSection');
const progressText = document.getElementById('progressText');
const progressBar = document.getElementById('progressBar');
const progressDetails = document.getElementById('progressDetails');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');

// ============================================
// Theme Management
// ============================================
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// ============================================
// Date Management
// ============================================
function setDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  
  dateFrom.value = formatDate(start);
  dateTo.value = formatDate(end);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// ============================================
// Config Management
// ============================================
async function loadConfig() {
  try {
    const response = await fetch(`${API_BASE}/api/config`);
    const config = await response.json();
    
    if (config.androidUrl) androidUrl.value = config.androidUrl;
    if (config.iosUrl) iosUrl.value = config.iosUrl;
    
    showToast('Đã tải cấu hình đã lưu', 'info');
  } catch (err) {
    console.log('No saved config found');
  }
}

async function saveConfig() {
  try {
    const config = {
      androidUrl: androidUrl.value,
      iosUrl: iosUrl.value,
    };
    
    const response = await fetch(`${API_BASE}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    
    const result = await response.json();
    if (result.success) {
      showToast('Đã lưu cấu hình thành công! Lần sau không cần nhập lại.', 'success');
    }
  } catch (err) {
    showToast('Lỗi khi lưu cấu hình', 'error');
  }
}

saveConfigBtn.addEventListener('click', saveConfig);

// ============================================
// App Info Check
// ============================================
async function checkAppInfo(platform) {
  const url = platform === 'android' ? androidUrl.value : iosUrl.value;
  
  if (!url.trim()) {
    showToast(`Vui lòng nhập đường dẫn ${platform === 'android' ? 'Google Play' : 'App Store'}`, 'error');
    return;
  }

  const btn = platform === 'android' ? checkAndroidBtn : checkIosBtn;
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div>';

  try {
    const response = await fetch(`${API_BASE}/api/app-info/${platform}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    // Show preview
    const previewEl = document.getElementById(`${platform}Preview`);
    const iconEl = document.getElementById(`${platform}Icon`);
    const nameEl = document.getElementById(`${platform}AppName`);
    const scoreEl = document.getElementById(`${platform}Score`);

    iconEl.src = data.icon;
    nameEl.textContent = data.title;
    scoreEl.textContent = `⭐ ${data.score ? data.score.toFixed(1) : 'N/A'} • ${data.ratings || 0} đánh giá`;
    previewEl.style.display = 'flex';

    showToast(`Tìm thấy: ${data.title}`, 'success');
  } catch (err) {
    showToast(`Lỗi: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><polyline points="20 6 9 17 4 12"/></svg>`;
  }
}

checkAndroidBtn.addEventListener('click', () => checkAppInfo('android'));
checkIosBtn.addEventListener('click', () => checkAppInfo('ios'));

// ============================================
// Scraping Logic
// ============================================
function validateInputs(platform) {
  if (platform === 'android' || platform === 'both') {
    if (!androidUrl.value.trim()) {
      showToast('Vui lòng nhập đường dẫn Google Play', 'error');
      return false;
    }
  }
  if (platform === 'ios' || platform === 'both') {
    if (!iosUrl.value.trim()) {
      showToast('Vui lòng nhập đường dẫn App Store', 'error');
      return false;
    }
  }
  if (!dateFrom.value || !dateTo.value) {
    showToast('Vui lòng chọn khoảng thời gian', 'error');
    return false;
  }
  if (new Date(dateFrom.value) > new Date(dateTo.value)) {
    showToast('Ngày bắt đầu phải nhỏ hơn ngày kết thúc', 'error');
    return false;
  }
  return true;
}

function setButtonsDisabled(disabled) {
  scrapeAndroidBtn.disabled = disabled;
  scrapeIosBtn.disabled = disabled;
  scrapeBothBtn.disabled = disabled;
}

function showProgress(text, percent, details = '') {
  progressSection.style.display = 'block';
  progressText.textContent = text;
  progressBar.style.width = `${percent}%`;
  progressDetails.textContent = details;
}

function hideProgress() {
  progressSection.style.display = 'none';
  progressBar.style.width = '0%';
}

let activeResults = {};

// Tab switching elements & handlers
const tabBtnSummary = document.getElementById('tabBtnSummary');
const tabBtnAndroid = document.getElementById('tabBtnAndroid');
const tabBtnIos = document.getElementById('tabBtnIos');
const tabContentSummary = document.getElementById('tabContentSummary');
const tabContentAndroid = document.getElementById('tabContentAndroid');
const tabContentIos = document.getElementById('tabContentIos');
const summaryTabCount = document.getElementById('summaryTabCount');
const androidTabCount = document.getElementById('androidTabCount');
const iosTabCount = document.getElementById('iosTabCount');
const summaryResultsWrapper = document.getElementById('summaryResultsWrapper');
const androidResultsWrapper = document.getElementById('androidResultsWrapper');
const iosResultsWrapper = document.getElementById('iosResultsWrapper');

function switchTab(tabName) {
  [tabBtnSummary, tabBtnAndroid, tabBtnIos].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });
  [tabContentSummary, tabContentAndroid, tabContentIos].forEach(content => {
    if (content) content.classList.remove('active');
  });

  if (tabName === 'summary' && tabBtnSummary && tabContentSummary) {
    tabBtnSummary.classList.add('active');
    tabContentSummary.classList.add('active');
  } else if (tabName === 'ios' && tabBtnIos && tabContentIos) {
    tabBtnIos.classList.add('active');
    tabContentIos.classList.add('active');
  } else if (tabBtnAndroid && tabContentAndroid) {
    tabBtnAndroid.classList.add('active');
    tabContentAndroid.classList.add('active');
  }
}

if (tabBtnSummary) tabBtnSummary.addEventListener('click', () => switchTab('summary'));
if (tabBtnAndroid) tabBtnAndroid.addEventListener('click', () => switchTab('android'));
if (tabBtnIos) tabBtnIos.addEventListener('click', () => switchTab('ios'));

async function scrape(platform) {
  if (!validateInputs(platform)) return;

  setButtonsDisabled(true);
  resultsSection.style.display = 'none';

  try {
    if (platform === 'both') {
      showProgress('Đang lấy và tổng hợp dữ liệu từ cả 2 stores...', 40, 'Hệ thống đang cào dữ liệu và phân tích nhóm chủ đề...');
      
      const response = await fetch(`${API_BASE}/api/scrape/both`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urlAndroid: androidUrl.value,
          urlIos: iosUrl.value,
          dateFrom: dateFrom.value,
          dateTo: dateTo.value,
        }),
      });

      const data = await response.json();
      showProgress('Hoàn tất tổng hợp!', 100);
      await new Promise(r => setTimeout(r, 400));
      hideProgress();

      if (!response.ok) {
        showToast(data.error || 'Lỗi khi cào tổng hợp dữ liệu', 'error');
      } else {
        activeResults.summary = { platform: 'summary', ...(data.summary || {}), fileName: (data.summary && data.summary.fileName) || data.fileName || 'tong_hop_rating_comment.xlsx', filePath: (data.summary && data.summary.filePath) || data.filePath || '/api/download/tong_hop_rating_comment.xlsx', base64: (data.summary && data.summary.base64) || data.base64 };
        activeResults.android = { platform: 'android', ...(data.android || {}), fileName: (data.android && data.android.fileName) || 'android_rating_comment.xlsx', filePath: (data.android && data.android.filePath) || '/api/download/android_rating_comment.xlsx', base64: (data.android && data.android.base64) || data.base64 };
        activeResults.ios = { platform: 'ios', ...(data.ios || {}), fileName: (data.ios && data.ios.fileName) || 'ios_rating_comment.xlsx', filePath: (data.ios && data.ios.filePath) || '/api/download/ios_rating_comment.xlsx', base64: (data.ios && data.ios.base64) || data.base64 };
        displayResults('both');
      }
    } else if (platform === 'android') {
      showProgress('Đang lấy đánh giá từ Google Play...', 50, 'Quá trình này có thể mất ít phút');
      const response = await fetch(`${API_BASE}/api/scrape/android`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: androidUrl.value,
          dateFrom: dateFrom.value,
          dateTo: dateTo.value,
        }),
      });
      const data = await response.json();
      hideProgress();

      if (!response.ok) {
        activeResults.android = { platform: 'android', error: data.error };
      } else {
        activeResults.android = { platform: 'android', ...data };
        if (data.summaryTopics) {
          activeResults.summary = {
            platform: 'summary',
            totalCombined: data.totalReviews,
            avgCombined: data.avgRating,
            topics: data.summaryTopics,
            fileName: 'tong_hop_rating_comment.xlsx'
          };
        }
      }
      displayResults('android');
    } else if (platform === 'ios') {
      showProgress('Đang lấy đánh giá từ App Store...', 50, 'Quá trình này có thể mất ít phút');
      const response = await fetch(`${API_BASE}/api/scrape/ios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: iosUrl.value,
          dateFrom: dateFrom.value,
          dateTo: dateTo.value,
        }),
      });
      const data = await response.json();
      hideProgress();

      if (!response.ok) {
        activeResults.ios = { platform: 'ios', error: data.error };
      } else {
        activeResults.ios = { platform: 'ios', ...data };
        if (data.summaryTopics) {
          activeResults.summary = {
            platform: 'summary',
            totalCombined: data.totalReviews,
            avgCombined: data.avgRating,
            topics: data.summaryTopics,
            fileName: 'tong_hop_rating_comment.xlsx'
          };
        }
      }
      displayResults('ios');
    }
  } catch (err) {
    hideProgress();
    showToast(`Lỗi: ${err.message}`, 'error');
  } finally {
    setButtonsDisabled(false);
  }
}

function displayResults(requestPlatform) {
  resultsSection.style.display = 'block';

  // Summary Tab
  if (activeResults.summary) {
    summaryTabCount.textContent = activeResults.summary.topics ? activeResults.summary.topics.length : 0;
    summaryResultsWrapper.innerHTML = renderSummaryTabPanel(activeResults.summary);
  } else if (!summaryResultsWrapper.children.length) {
    summaryResultsWrapper.innerHTML = `<div class="empty-tab">Chưa có dữ liệu tổng hợp. Bấm "Lấy cả hai" để xem báo cáo tổng hợp.</div>`;
  }

  // Android Tab
  if (activeResults.android) {
    androidTabCount.textContent = activeResults.android.error ? 'Lỗi' : (activeResults.android.totalReviews || 0);
    androidResultsWrapper.innerHTML = renderTabPanel(activeResults.android);
  } else if (!androidResultsWrapper.children.length) {
    androidResultsWrapper.innerHTML = `<div class="empty-tab">Chưa có dữ liệu cho Android. Hãy chọn "Lấy đánh giá Google Play".</div>`;
  }

  // iOS Tab
  if (activeResults.ios) {
    iosTabCount.textContent = activeResults.ios.error ? 'Lỗi' : (activeResults.ios.totalReviews || 0);
    iosResultsWrapper.innerHTML = renderTabPanel(activeResults.ios);
  } else if (!iosResultsWrapper.children.length) {
    iosResultsWrapper.innerHTML = `<div class="empty-tab">Chưa có dữ liệu cho iOS. Hãy chọn "Lấy đánh giá App Store".</div>`;
  }

  // Switch to requested tab
  if (requestPlatform === 'both' || requestPlatform === 'summary') {
    switchTab('summary');
  } else if (requestPlatform === 'ios') {
    switchTab('ios');
  } else {
    switchTab('android');
  }

  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

let sortState = {
  android: { column: 'date', dir: 'desc' },
  ios: { column: 'date', dir: 'desc' }
};

function handleSort(platform, col) {
  if (col !== 'rating' && col !== 'date') return;
  if (!sortState[platform]) {
    sortState[platform] = { column: 'date', dir: 'desc' };
  }
  const current = sortState[platform];
  if (current.column === col) {
    current.dir = current.dir === 'desc' ? 'asc' : 'desc';
  } else {
    current.column = col;
    current.dir = 'desc';
  }

  if (activeResults[platform]) {
    const wrapper = platform === 'android' ? androidResultsWrapper : iosResultsWrapper;
    wrapper.innerHTML = renderTabPanel(activeResults[platform]);
  }
}

function getSortHeaderHtml(platform, col, title, widthStyle = '') {
  const current = sortState[platform] || { column: 'date', dir: 'desc' };
  const isActive = current.column === col;
  const icon = isActive ? (current.dir === 'desc' ? '⬇️' : '⬆️') : '↕️';
  const activeClass = isActive ? 'active-sort' : '';
  
  return `<th class="sortable-th ${activeClass}" style="${widthStyle}" onclick="handleSort('${platform}', '${col}')" title="Click để sắp xếp theo ${title}">
    ${title}<span class="sort-icon">${icon}</span>
  </th>`;
}

function renderTabPanel(result) {
  if (result.error) {
    return `
      <div class="result-card error">
        <p class="result-error">❌ ${escapeHtml(result.error)}</p>
      </div>
    `;
  }

  const isAndroid = result.platform === 'android';
  const state = sortState[result.platform] || { column: 'date', dir: 'desc' };
  const mult = state.dir === 'desc' ? -1 : 1;

  const rawReviews = result.reviews || [];
  const reviews = rawReviews.slice().sort((a, b) => {
    if (state.column === 'rating') {
      return ((a.rating || 0) - (b.rating || 0)) * mult;
    }
    if (state.column === 'date') {
      const dA = a.date ? new Date(a.date).getTime() : 0;
      const dB = b.date ? new Date(b.date).getTime() : 0;
      return (dA - dB) * mult;
    }
    return 0;
  });

  const total = result.totalReviews || reviews.length;
  const avg = result.avgRating !== undefined ? result.avgRating : (total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2) : '0.0');
  const ratingCounts = result.ratingCounts || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

  const getPercent = (count) => total > 0 ? Math.round((count / total) * 100) : 0;
  const previewReviews = reviews.slice(0, 100);

  let tableHeader = isAndroid ? `
    <tr>
      <th style="width: 50px;">STT</th>
      <th style="width: 140px;">Người dùng</th>
      ${getSortHeaderHtml('android', 'rating', 'Số sao', 'width: 100px;')}
      <th>Bình luận</th>
      ${getSortHeaderHtml('android', 'date', 'Ngày', 'width: 110px;')}
      <th style="width: 70px;">Thích</th>
      <th style="width: 200px;">Phản hồi từ NPT</th>
    </tr>
  ` : `
    <tr>
      <th style="width: 50px;">STT</th>
      <th style="width: 140px;">Người dùng</th>
      ${getSortHeaderHtml('ios', 'rating', 'Số sao', 'width: 100px;')}
      <th style="width: 150px;">Tiêu đề</th>
      <th>Bình luận</th>
      ${getSortHeaderHtml('ios', 'date', 'Ngày', 'width: 110px;')}
      <th style="width: 90px;">Phiên bản</th>
    </tr>
  `;

  let tableRows = previewReviews.map((r, idx) => {
    const starClass = r.rating >= 4 ? 'star-high' : r.rating >= 3 ? 'star-med' : 'star-low';
    const starsHtml = `<span class="rating-badge ${starClass}">⭐ ${r.rating}</span>`;
    
    if (isAndroid) {
      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td class="font-medium">${escapeHtml(r.userName || 'Ẩn danh')}</td>
          <td class="text-center">${starsHtml}</td>
          <td class="comment-cell">${escapeHtml(r.comment || '')}</td>
          <td class="text-center text-muted">${r.date || ''}</td>
          <td class="text-center">${r.thumbsUp || 0}</td>
          <td class="reply-cell">${escapeHtml(r.replyText || '')}</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td class="font-medium">${escapeHtml(r.userName || 'Ẩn danh')}</td>
          <td class="text-center">${starsHtml}</td>
          <td class="title-cell">${escapeHtml(r.title || '')}</td>
          <td class="comment-cell">${escapeHtml(r.comment || '')}</td>
          <td class="text-center text-muted">${r.date || ''}</td>
          <td class="text-center text-muted">${escapeHtml(r.version || '')}</td>
        </tr>
      `;
    }
  }).join('');

  return `
    <div class="tab-panel-inner">
      <!-- Download Bar -->
      <div class="download-bar ${result.platform}">
        <div class="download-info">
          <div class="file-icon">📊</div>
          <div>
            <div class="file-name">${result.fileName}</div>
            <div class="file-sub">Đã tạo file sẵn sàng - Tổng cộng ${total.toLocaleString()} đánh giá</div>
          </div>
        </div>
        <button class="btn btn-download-primary" onclick="triggerDownload('${result.platform}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Tải xuống File Excel (.xlsx)
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-title">Tổng số đánh giá</span>
          <div class="stat-value">${total.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <span class="stat-title">Rating trung bình</span>
          <div class="stat-value rating-val">⭐ ${avg}</div>
        </div>
        <div class="stat-card distribution-card">
          <span class="stat-title">Phân bố số sao</span>
          <div class="stars-bars">
            ${[5, 4, 3, 2, 1].map(star => {
              const cnt = ratingCounts[star] || 0;
              const pct = getPercent(cnt);
              return `
                <div class="star-row">
                  <span class="star-label">${star} ★</span>
                  <div class="bar-bg">
                    <div class="bar-fill star-${star}" style="width: ${pct}%"></div>
                  </div>
                  <span class="star-count">${cnt} (${pct}%)</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Data Preview Table -->
      <div class="preview-section">
        <div class="preview-header">
          <h3>Xem trước danh sách ${reviews.length > 100 ? `(100 / ${total} dòng)` : `(${total} dòng)`}</h3>
        </div>
        <div class="table-container">
          <table class="preview-table">
            <thead>${tableHeader}</thead>
            <tbody>${tableRows || '<tr><td colspan="7" class="text-center">Không có dữ liệu</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderSummaryTabPanel(summaryData) {
  if (!summaryData || !summaryData.topics || summaryData.topics.length === 0) {
    return `
      <div class="empty-tab">
        <p>Chưa có dữ liệu tổng hợp. Vui lòng cào dữ liệu từ Android / iOS hoặc bấm <strong>"Lấy cả hai"</strong>.</p>
      </div>
    `;
  }

  const topics = summaryData.topics || [];
  const totalCombined = summaryData.totalCombined || topics.reduce((s, t) => s + t.count, 0);
  const avgCombined = summaryData.avgCombined || '0.00';

  const rowsHtml = topics.map(t => {
    const isGood = t.sentiment.includes('Tốt') && !t.sentiment.includes('Chưa');
    const badgeClass = isGood ? 'sentiment-badge-good' : 'sentiment-badge-warning';
    
    return `
      <tr>
        <td class="text-center font-bold" style="font-weight: 700;">${t.rank}</td>
        <td class="topic-title-cell">${escapeHtml(t.topic)}</td>
        <td class="text-center count-cell">${t.count}</td>
        <td class="text-center">
          <span class="sentiment-badge ${badgeClass}">${escapeHtml(t.sentiment)}</span>
        </td>
        <td class="detail-cell">${escapeHtml(t.details)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="tab-panel-inner">
      <!-- Download Bar Summary -->
      <div class="download-bar summary">
        <div class="download-info">
          <div class="file-icon">📊</div>
          <div>
            <div class="file-name">${summaryData.fileName || 'tong_hop_rating_comment.xlsx'}</div>
            <div class="file-sub">File Báo cáo tổng hợp (gồm 3 Sheet: Tổng hợp, Google Play, App Store)</div>
          </div>
        </div>
        <button class="btn btn-download-primary" onclick="triggerDownload('summary')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Tải xuống Báo cáo tổng hợp (.xlsx)
        </button>
      </div>

      <!-- Stats Grid Summary -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-title">Tổng số ý kiến / đánh giá</span>
          <div class="stat-value">${totalCombined.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <span class="stat-title">Rating trung bình tổng hợp</span>
          <div class="stat-value rating-val">⭐ ${avgCombined}</div>
        </div>
        <div class="stat-card">
          <span class="stat-title">Số nhóm chủ đề phân tích</span>
          <div class="stat-value">${topics.length} nhóm</div>
        </div>
      </div>

      <!-- Data Preview Table Summary -->
      <div class="preview-section">
        <div class="preview-header">
          <h3>📋 Báo cáo tổng hợp nhóm ý kiến & phản hồi khách hàng (${topics.length} nhóm chủ đề)</h3>
        </div>
        <div class="table-container">
          <table class="preview-table summary-table">
            <thead>
              <tr>
                <th style="width: 90px;" class="text-center">Xếp hạng</th>
                <th style="width: 250px;">Chủ đề</th>
                <th style="width: 110px;" class="text-center">Số ý kiến</th>
                <th style="width: 130px;" class="text-center">Đánh giá</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function triggerDownload(platform) {
  const result = activeResults[platform];
  if (!result) {
    showToast('Chưa có dữ liệu để tải file!', 'error');
    return;
  }

  const path = result.filePath;
  const base64 = result.base64;
  const fileName = result.fileName || `${platform}_rating_comment.xlsx`;
  downloadFile(path, base64, fileName);
}

function downloadFile(path, base64, fileName) {
  if (base64) {
    try {
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes.buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || (path ? path.split('/').pop() : 'reviews.xlsx');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      showToast('Đã tải file thành công!', 'success');
      return;
    } catch (e) {
      console.error('Base64 download failed, falling back to URL download:', e);
    }
  }

  if (path && path !== 'undefined' && !path.includes('undefined')) {
    const a = document.createElement('a');
    a.href = `${API_BASE}${path}`;
    a.download = fileName || '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Đang tải file...', 'success');
    return;
  }

  showToast('Không tìm thấy dữ liệu file Excel. Vui lòng bấm cào lại!', 'error');
}

// Header Mode Navigation
const navTabScraper = document.getElementById('navTabScraper');
const navTabAI = document.getElementById('navTabAI');
const modeScraperView = document.getElementById('modeScraperView');
const modeAIView = document.getElementById('modeAIView');

function switchMode(mode) {
  if (mode === 'ai') {
    if (navTabAI) navTabAI.classList.add('active');
    if (navTabScraper) navTabScraper.classList.remove('active');
    if (modeAIView) modeAIView.classList.add('active');
    if (modeScraperView) modeScraperView.classList.remove('active');
  } else {
    if (navTabScraper) navTabScraper.classList.add('active');
    if (navTabAI) navTabAI.classList.remove('active');
    if (modeScraperView) modeScraperView.classList.add('active');
    if (modeAIView) modeAIView.classList.remove('active');
  }
}

if (navTabScraper) navTabScraper.addEventListener('click', () => switchMode('scraper'));
if (navTabAI) navTabAI.addEventListener('click', () => switchMode('ai'));

// Rating AI State & Elements
let selectedRatingFiles = [];
let selectedDictFile = null;

const dropzoneRatingFiles = document.getElementById('dropzoneRatingFiles');
const inputRatingFiles = document.getElementById('inputRatingFiles');
const listRatingFiles = document.getElementById('listRatingFiles');

const dropzoneDictFile = document.getElementById('dropzoneDictFile');
const inputDictFile = document.getElementById('inputDictFile');
const listDictFile = document.getElementById('listDictFile');

const btnAnalyzeAI = document.getElementById('btnAnalyzeAI');
const aiProgressSection = document.getElementById('aiProgressSection');
const aiProgressText = document.getElementById('aiProgressText');
const aiProgressBar = document.getElementById('aiProgressBar');
const aiResultsSection = document.getElementById('aiResultsSection');
const aiResultsWrapper = document.getElementById('aiResultsWrapper');

function setupDropzone(dropzone, input, fileHandler) {
  if (!dropzone || !input) return;
  dropzone.addEventListener('click', () => input.click());

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('dropzone-active');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('dropzone-active');
    });
  });

  dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt ? dt.files : [];
    if (files && files.length) fileHandler(files);
  });

  input.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) {
      fileHandler(e.target.files);
    }
  });
}

setupDropzone(dropzoneRatingFiles, inputRatingFiles, (files) => {
  for (let file of files) {
    if (!selectedRatingFiles.some(f => f.name === file.name && f.size === file.size)) {
      selectedRatingFiles.push(file);
    }
  }
  renderFileChips();
});

setupDropzone(dropzoneDictFile, inputDictFile, (files) => {
  if (files && files.length) {
    selectedDictFile = files[0];
  }
  renderFileChips();
});

function renderFileChips() {
  if (listRatingFiles) {
    listRatingFiles.innerHTML = selectedRatingFiles.map((f, i) => `
      <div class="file-chip">
        <span>📁 ${escapeHtml(f.name)} (${(f.size / 1024).toFixed(1)} KB)</span>
        <span class="file-chip-remove" onclick="removeRatingFile(${i})">×</span>
      </div>
    `).join('');
  }

  if (listDictFile) {
    listDictFile.innerHTML = selectedDictFile ? `
      <div class="file-chip" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3);">
        <span>📚 ${escapeHtml(selectedDictFile.name)} (${(selectedDictFile.size / 1024).toFixed(1)} KB)</span>
        <span class="file-chip-remove" onclick="removeDictFile()">×</span>
      </div>
    ` : '';
  }
}

function removeRatingFile(idx) {
  selectedRatingFiles.splice(idx, 1);
  renderFileChips();
}

function removeDictFile() {
  selectedDictFile = null;
  renderFileChips();
}

if (btnAnalyzeAI) {
  btnAnalyzeAI.addEventListener('click', async () => {
    if (!selectedRatingFiles.length) {
      showToast('Vui lòng chọn hoặc kéo thả ít nhất 1 file Excel chứa Rating!', 'error');
      return;
    }

    const formData = new FormData();
    selectedRatingFiles.forEach(file => {
      formData.append('ratingFiles', file);
    });
    if (selectedDictFile) {
      formData.append('dictFile', selectedDictFile);
    }

    btnAnalyzeAI.disabled = true;
    if (aiProgressSection) aiProgressSection.style.display = 'block';
    if (aiProgressBar) aiProgressBar.style.width = '40%';
    if (aiProgressText) aiProgressText.textContent = 'Đang đọc các file Excel và phân tích từ khóa...';
    if (aiResultsSection) aiResultsSection.style.display = 'none';

    try {
      const response = await fetch(`${API_BASE}/api/ai/analyze`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (aiProgressBar) aiProgressBar.style.width = '100%';
      await new Promise(r => setTimeout(r, 400));
      if (aiProgressSection) aiProgressSection.style.display = 'none';

      if (!response.ok || !data.success) {
        showToast(data.error || 'Lỗi khi phân tích Rating AI', 'error');
        return;
      }

      activeResults.ai = data;
      renderAIResults(data);
      showToast('Đã phân tích cảm xúc từ khóa thành công!', 'success');
    } catch (err) {
      if (aiProgressSection) aiProgressSection.style.display = 'none';
      showToast(`Lỗi: ${err.message}`, 'error');
    } finally {
      btnAnalyzeAI.disabled = false;
    }
  });
}

function renderAIResults(data) {
  if (!aiResultsSection || !aiResultsWrapper) return;
  aiResultsSection.style.display = 'block';

  const rows = (data.results || []).map((r, idx) => `
    <tr>
      <td class="text-center font-bold" style="font-weight: 700;">${idx + 1}</td>
      <td class="font-medium text-muted">${escapeHtml(r.sourceFile || '')}</td>
      <td class="font-medium">${escapeHtml(r.userName || 'Ẩn danh')}</td>
      <td class="text-center">
        <span class="rating-badge ${r.rating >= 4 ? 'star-high' : r.rating >= 3 ? 'star-med' : 'star-low'}">⭐ ${r.rating}</span>
      </td>
      <td class="comment-cell">${escapeHtml(r.comment || '')}</td>
      <td class="text-center text-muted">${r.date || ''}</td>
      <td class="text-center">
        <span class="${r.badgeClass}">${escapeHtml(r.sentiment)}</span>
      </td>
      <td class="detail-cell" style="color: var(--accent); font-weight: 600;">${escapeHtml(r.matchedKeywords || '')}</td>
    </tr>
  `).join('');

  aiResultsWrapper.innerHTML = `
    <div class="tab-panel-inner">
      <!-- Download Bar AI -->
      <div class="download-bar summary" style="border-left-color: #8b5cf6;">
        <div class="download-info">
          <div class="file-icon">⚡</div>
          <div>
            <div class="file-name">${data.fileName || 'rating_ai_analysis.xlsx'}</div>
            <div class="file-sub">File Báo cáo Phân tích Cảm xúc Rating AI (Đã gắn nhãn Tích cực / Tiêu cực / Từ khóa)</div>
          </div>
        </div>
        <button class="btn btn-download-primary" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);" onclick="triggerDownload('ai')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Tải xuống Báo cáo Phân tích AI (.xlsx)
        </button>
      </div>

      <!-- Stats Grid AI -->
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-title">Tổng số dòng phân tích</span>
          <div class="stat-value">${(data.totalReviews || 0).toLocaleString()} dòng</div>
        </div>
        <div class="stat-card">
          <span class="stat-title">Đánh giá Tích cực</span>
          <div class="stat-value" style="color: #10b981;">✅ ${(data.countPos || 0).toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <span class="stat-title">Đánh giá Tiêu cực</span>
          <div class="stat-value" style="color: #ef4444;">⚠️ ${(data.countNeg || 0).toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <span class="stat-title">Đánh giá Trung tính</span>
          <div class="stat-value" style="color: #9ca3af;">⚪ ${(data.countNeu || 0).toLocaleString()}</div>
        </div>
      </div>

      <!-- Data Preview Table AI -->
      <div class="preview-section">
        <div class="preview-header">
          <h3>📋 Bảng phân loại cảm xúc chi tiết theo từ điển (${(data.results || []).length} dòng)</h3>
        </div>
        <div class="table-container">
          <table class="preview-table summary-table">
            <thead>
              <tr>
                <th style="width: 60px;" class="text-center">STT</th>
                <th style="width: 160px;">Nguồn File</th>
                <th style="width: 140px;">Người dùng</th>
                <th style="width: 90px;" class="text-center">Số sao</th>
                <th>Bình luận</th>
                <th style="width: 100px;" class="text-center">Ngày</th>
                <th style="width: 120px;" class="text-center">Phân loại AI</th>
                <th style="width: 200px;">Từ khóa trùng khớp</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="8" class="text-center">Không có dữ liệu</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  aiResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Button event listeners
scrapeAndroidBtn.addEventListener('click', () => scrape('android'));
scrapeIosBtn.addEventListener('click', () => scrape('ios'));
scrapeBothBtn.addEventListener('click', () => scrape('both'));

// ============================================
// Toast Notifications
// ============================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
  };

  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadConfig();
  
  // Default: last 6 months
  setDateRange(180);
});
