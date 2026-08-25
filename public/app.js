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
    applyPlatformFilter('summary');
  } else if (!summaryResultsWrapper.children.length) {
    summaryResultsWrapper.innerHTML = `<div class="empty-tab">Chưa có dữ liệu tổng hợp. Bấm "Lấy cả hai" để xem báo cáo tổng hợp.</div>`;
  }

  // Android Tab
  if (activeResults.android) {
    androidTabCount.textContent = activeResults.android.error ? 'Lỗi' : (activeResults.android.totalReviews || 0);
    androidResultsWrapper.innerHTML = renderTabPanel(activeResults.android);
    applyPlatformFilter('android');
  } else if (!androidResultsWrapper.children.length) {
    androidResultsWrapper.innerHTML = `<div class="empty-tab">Chưa có dữ liệu cho Android. Hãy chọn "Lấy đánh giá Google Play".</div>`;
  }

  // iOS Tab
  if (activeResults.ios) {
    iosTabCount.textContent = activeResults.ios.error ? 'Lỗi' : (activeResults.ios.totalReviews || 0);
    iosResultsWrapper.innerHTML = renderTabPanel(activeResults.ios);
    applyPlatformFilter('ios');
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

function getIosVersionOptionsHtml(reviews) {
  if (!reviews || !reviews.length) return '';
  const versions = [...new Set(reviews.map(r => r.version).filter(Boolean))].sort().reverse();
  return versions.map(v => `<option value="${escapeHtml(v)}">v${escapeHtml(v)}</option>`).join('');
}

function applyPlatformFilter(platform) {
  const data = activeResults[platform];
  if (!data) return;

  if (platform === 'summary') {
    const kw = (document.getElementById('summaryFilterKeyword')?.value || '').toLowerCase().trim();
    const sentiment = document.getElementById('summaryFilterSentiment')?.value || 'all';
    const sort = document.getElementById('summaryFilterSort')?.value || 'rank_asc';

    let list = (data.topics || []).slice();

    if (kw) {
      list = list.filter(t => (t.topic || '').toLowerCase().includes(kw) || (t.details || '').toLowerCase().includes(kw));
    }
    if (sentiment === 'good') {
      list = list.filter(t => t.sentiment.includes('Tốt') && !t.sentiment.includes('Chưa'));
    } else if (sentiment === 'warning') {
      list = list.filter(t => !t.sentiment.includes('Tốt') || t.sentiment.includes('Chưa'));
    }

    if (sort === 'rank_asc') {
      list.sort((a, b) => (a.rank || 0) - (b.rank || 0));
    } else if (sort === 'count_desc') {
      list.sort((a, b) => (b.count || 0) - (a.count || 0));
    } else if (sort === 'count_asc') {
      list.sort((a, b) => (a.count || 0) - (b.count || 0));
    } else if (sort === 'topic_asc') {
      list.sort((a, b) => (a.topic || '').localeCompare(b.topic || ''));
    }

    const tbody = document.getElementById('summaryTableBody');
    const title = document.getElementById('summaryTableTitle');
    if (title) {
      const isFiltered = kw || sentiment !== 'all' || sort !== 'rank_asc';
      title.textContent = isFiltered
        ? `📋 Báo cáo tổng hợp nhóm ý kiến (Đã lọc Excel: ${list.length} / ${data.topics.length} nhóm)`
        : `📋 Báo cáo tổng hợp nhóm ý kiến & phản hồi khách hàng (${data.topics.length} nhóm chủ đề)`;
    }

    if (tbody) {
      if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 28px;">Không tìm thấy chủ đề trùng khớp với bộ lọc Excel</td></tr>`;
      } else {
        tbody.innerHTML = list.map((t, idx) => {
          const isGood = t.sentiment.includes('Tốt') && !t.sentiment.includes('Chưa');
          const badgeClass = isGood ? 'sentiment-badge-good' : 'sentiment-badge-warning';
          return `
            <tr>
              <td class="text-center font-bold" style="font-weight: 700;">${idx + 1}</td>
              <td class="topic-title-cell">${escapeHtml(t.topic)}</td>
              <td class="text-center count-cell font-bold">${t.count}</td>
              <td class="text-center">
                <span class="sentiment-badge ${badgeClass}">${escapeHtml(t.sentiment)}</span>
              </td>
              <td class="detail-cell">${escapeHtml(t.details)}</td>
            </tr>
          `;
        }).join('');
      }
    }
    return;
  }

  // Android or iOS
  const isAndroid = platform === 'android';
  const kw = (document.getElementById(`${platform}FilterKeyword`)?.value || '').toLowerCase().trim();
  const rating = document.getElementById(`${platform}FilterRating`)?.value || 'all';
  const dateFrom = document.getElementById(`${platform}FilterDateFrom`)?.value || '';
  const dateTo = document.getElementById(`${platform}FilterDateTo`)?.value || '';

  let list = (data.reviews || []).slice();

  if (kw) {
    list = list.filter(r => {
      const fullText = `${r.comment || ''} ${r.userName || ''} ${r.title || ''} ${r.replyText || ''}`.toLowerCase();
      return fullText.includes(kw);
    });
  }
  if (rating !== 'all') {
    list = list.filter(r => String(r.rating) === String(rating));
  }
  if (dateFrom) {
    list = list.filter(r => r.date && r.date >= dateFrom);
  }
  if (dateTo) {
    list = list.filter(r => r.date && r.date <= dateTo);
  }

  const tbody = document.getElementById(`${platform}TableBody`);
  const title = document.getElementById(`${platform}TableTitle`);
  const total = (data.reviews || []).length;
  const isFiltered = kw || rating !== 'all' || dateFrom || dateTo;

  if (title) {
    if (isFiltered) {
      title.textContent = `📋 Xem trước danh sách (Đã lọc Excel: ${list.length} / ${total} dòng)`;
    } else {
      title.textContent = `📋 Xem trước danh sách (${total} dòng)`;
    }
  }

  if (tbody) {
    if (!list.length) {
      const colSpan = isAndroid ? 7 : 7;
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-muted" style="padding: 28px;">Không tìm thấy đánh giá trùng khớp với bộ lọc Excel</td></tr>`;
    } else {
      tbody.innerHTML = list.map((r, idx) => {
        const starClass = r.rating >= 4 ? 'star-high' : r.rating >= 3 ? 'star-med' : 'star-low';
        const starsHtml = `<span class="rating-badge ${starClass}">⭐ ${r.rating}</span>`;
        if (isAndroid) {
          return `
            <tr>
              <td class="text-center font-bold" style="font-weight: 700;">${idx + 1}</td>
              <td class="font-medium">${escapeHtml(r.userName || 'Ẩn danh')}</td>
              <td class="text-center">${starsHtml}</td>
              <td class="comment-cell">${escapeHtml(r.comment || '')}</td>
              <td class="text-center text-muted date-cell">${r.date || ''}</td>
              <td class="text-center">${r.thumbsUp || 0}</td>
              <td class="reply-cell">${escapeHtml(r.replyText || '')}</td>
            </tr>
          `;
        } else {
          return `
            <tr>
              <td class="text-center font-bold" style="font-weight: 700;">${idx + 1}</td>
              <td class="font-medium">${escapeHtml(r.userName || 'Ẩn danh')}</td>
              <td class="text-center">${starsHtml}</td>
              <td class="title-cell">${escapeHtml(r.title || '')}</td>
              <td class="comment-cell">${escapeHtml(r.comment || '')}</td>
              <td class="text-center text-muted date-cell">${r.date || ''}</td>
              <td class="text-center text-muted">${escapeHtml(r.version || '')}</td>
            </tr>
          `;
        }
      }).join('');
    }
  }
}

function resetPlatformFilter(platform) {
  const kw = document.getElementById(`${platform}FilterKeyword`);
  if (kw) kw.value = '';

  const rating = document.getElementById(`${platform}FilterRating`);
  if (rating) rating.value = 'all';

  const dateFrom = document.getElementById(`${platform}FilterDateFrom`);
  if (dateFrom) dateFrom.value = '';

  const dateTo = document.getElementById(`${platform}FilterDateTo`);
  if (dateTo) dateTo.value = '';

  const sentiment = document.getElementById('summaryFilterSentiment');
  if (sentiment) sentiment.value = 'all';

  const sort = document.getElementById('summaryFilterSort');
  if (sort) sort.value = 'rank_asc';

  applyPlatformFilter(platform);
}

function handleSort(platform, col) {
  const data = activeResults[platform];
  if (!data || !data.reviews) return;

  if (!sortState[platform]) {
    sortState[platform] = { column: col, dir: 'desc' };
  } else if (sortState[platform].column === col) {
    sortState[platform].dir = sortState[platform].dir === 'desc' ? 'asc' : 'desc';
  } else {
    sortState[platform].column = col;
    sortState[platform].dir = 'desc';
  }

  const mult = sortState[platform].dir === 'desc' ? -1 : 1;
  data.reviews.sort((a, b) => {
    if (col === 'rating') {
      return ((a.rating || 0) - (b.rating || 0)) * mult;
    }
    if (col === 'date') {
      return ((new Date(a.date || 0)) - (new Date(b.date || 0))) * mult;
    }
    return 0;
  });

  applyPlatformFilter(platform);
}

let sortState = {
  android: { column: 'date', dir: 'desc' },
  ios: { column: 'date', dir: 'desc' }
};

function renderTabPanel(result) {
  if (result.error) {
    return `
      <div class="result-card error">
        <p class="result-error">❌ ${escapeHtml(result.error)}</p>
      </div>
    `;
  }

  const isAndroid = result.platform === 'android';
  const total = result.totalReviews || (result.reviews ? result.reviews.length : 0);
  const avg = result.avgRating !== undefined ? result.avgRating : (total > 0 ? (result.reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(2) : '0.0');
  const ratingCounts = result.ratingCounts || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const getPercent = (count) => total > 0 ? Math.round((count / total) * 100) : 0;

  let tableHeader = isAndroid ? `
    <tr>
      <th style="width: 50px;" class="text-center">STT</th>
      <th style="width: 140px;">Người dùng</th>
      <th style="width: 100px;" class="text-center sortable-th" onclick="handleSort('android', 'rating')" title="Click để sắp xếp số sao">Số sao <span class="excel-header-btn" onclick="document.getElementById('androidFilterRating').focus()">▼</span></th>
      <th style="min-width: 340px; width: 40%;">Bình luận <span class="excel-header-btn" onclick="document.getElementById('androidFilterKeyword').focus()">▼</span></th>
      <th style="width: 125px; min-width: 115px;" class="text-center sortable-th" onclick="handleSort('android', 'date')" title="Click để sắp xếp ngày">Ngày <span class="excel-header-btn" onclick="document.getElementById('androidFilterDateFrom').focus()">▼</span></th>
      <th style="width: 75px;" class="text-center">Thích</th>
      <th style="width: 200px;">Phản hồi từ NPT</th>
    </tr>
  ` : `
    <tr>
      <th style="width: 50px;" class="text-center">STT</th>
      <th style="width: 140px;">Người dùng</th>
      <th style="width: 100px;" class="text-center sortable-th" onclick="handleSort('ios', 'rating')" title="Click để sắp xếp số sao">Số sao <span class="excel-header-btn" onclick="document.getElementById('iosFilterRating').focus()">▼</span></th>
      <th style="width: 150px;">Tiêu đề <span class="excel-header-btn" onclick="document.getElementById('iosFilterKeyword').focus()">▼</span></th>
      <th style="min-width: 340px; width: 38%;">Bình luận <span class="excel-header-btn" onclick="document.getElementById('iosFilterKeyword').focus()">▼</span></th>
      <th style="width: 125px; min-width: 115px;" class="text-center sortable-th" onclick="handleSort('ios', 'date')" title="Click để sắp xếp ngày">Ngày <span class="excel-header-btn" onclick="document.getElementById('iosFilterDateFrom').focus()">▼</span></th>
      <th style="width: 95px;" class="text-center">Phiên bản</th>
    </tr>
  `;

  return `
    <div class="tab-panel-inner">
      <!-- Download Bar -->
      <div class="download-bar ${result.platform}">
        <div class="download-info">
          <div class="file-icon">${isAndroid ? '🤖' : '🍏'}</div>
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
          <!-- Excel Filter Toolbar -->
          <div class="excel-filter-toolbar">
            <div class="excel-filter-group">
              <span class="excel-filter-label">🔍 Tìm kiếm:</span>
              <input type="text" id="${result.platform}FilterKeyword" class="excel-filter-input" placeholder="${isAndroid ? 'Từ khóa, bình luận, người dùng...' : 'Tiêu đề, bình luận, người dùng...'}" oninput="applyPlatformFilter('${result.platform}')">
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">⭐ Số sao:</span>
              <select id="${result.platform}FilterRating" class="excel-filter-select" onchange="applyPlatformFilter('${result.platform}')">
                <option value="all">Tất cả số sao</option>
                <option value="5">⭐ 5 sao</option>
                <option value="4">⭐ 4 sao</option>
                <option value="3">⭐ 3 sao</option>
                <option value="2">⭐ 2 sao</option>
                <option value="1">⭐ 1 sao</option>
              </select>
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">📅 Từ ngày:</span>
              <input type="date" id="${result.platform}FilterDateFrom" class="excel-filter-input date-input" onchange="applyPlatformFilter('${result.platform}')">
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">📅 Đến ngày:</span>
              <input type="date" id="${result.platform}FilterDateTo" class="excel-filter-input date-input" onchange="applyPlatformFilter('${result.platform}')">
            </div>
            <button class="btn-excel-reset" onclick="resetPlatformFilter('${result.platform}')" title="Xóa tất cả bộ lọc">
              🔄 Xóa bộ lọc
            </button>
          </div>

          <h3 id="${result.platform}TableTitle" style="margin-top: 14px; font-size: 0.88rem; color: var(--text-secondary); font-weight: 500;">
            📋 Xem trước danh sách (${total} dòng)
          </h3>
        </div>
        <div class="table-container">
          <table class="preview-table">
            <thead>${tableHeader}</thead>
            <tbody id="${result.platform}TableBody">
            </tbody>
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
          <!-- Excel Filter Toolbar for Summary -->
          <div class="excel-filter-toolbar">
            <div class="excel-filter-group">
              <span class="excel-filter-label">🔍 Tìm kiếm:</span>
              <input type="text" id="summaryFilterKeyword" class="excel-filter-input" placeholder="Chủ đề, chi tiết ý kiến..." oninput="applyPlatformFilter('summary')">
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">🏷️ Đánh giá:</span>
              <select id="summaryFilterSentiment" class="excel-filter-select" onchange="applyPlatformFilter('summary')">
                <option value="all">Tất cả đánh giá</option>
                <option value="good">✅ Đánh giá Tốt</option>
                <option value="warning">⚠️ Cần cải thiện</option>
              </select>
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">🔢 Sắp xếp:</span>
              <select id="summaryFilterSort" class="excel-filter-select" onchange="applyPlatformFilter('summary')">
                <option value="rank_asc">Xếp hạng (1 ➔ N) ⬆️</option>
                <option value="count_desc">Số ý kiến nhiều nhất ⬇️</option>
                <option value="count_asc">Số ý kiến ít nhất ⬆️</option>
                <option value="topic_asc">Tên chủ đề (A ➔ Z) 🔤</option>
              </select>
            </div>
            <button class="btn-excel-reset" onclick="resetPlatformFilter('summary')" title="Xóa tất cả bộ lọc">
              🔄 Xóa bộ lọc
            </button>
          </div>

          <h3 id="summaryTableTitle" style="margin-top: 14px; font-size: 0.88rem; color: var(--text-secondary); font-weight: 500;">
            📋 Báo cáo tổng hợp nhóm ý kiến & phản hồi khách hàng (${topics.length} nhóm chủ đề)
          </h3>
        </div>
        <div class="table-container">
          <table class="preview-table summary-table">
            <thead>
              <tr>
                <th style="width: 90px;" class="text-center">Xếp hạng</th>
                <th style="width: 250px;">Chủ đề <span class="excel-header-btn" onclick="document.getElementById('summaryFilterKeyword').focus()">▼</span></th>
                <th style="width: 110px;" class="text-center">Số ý kiến <span class="excel-header-btn" onclick="document.getElementById('summaryFilterSort').focus()">▼</span></th>
                <th style="width: 130px;" class="text-center">Đánh giá <span class="excel-header-btn" onclick="document.getElementById('summaryFilterSentiment').focus()">▼</span></th>
                <th>Chi tiết <span class="excel-header-btn" onclick="document.getElementById('summaryFilterKeyword').focus()">▼</span></th>
              </tr>
            </thead>
            <tbody id="summaryTableBody">
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
const navTabSlide = document.getElementById('navTabSlide');
const modeScraperView = document.getElementById('modeScraperView');
const modeAIView = document.getElementById('modeAIView');
const modeSlideView = document.getElementById('modeSlideView');

function switchMode(mode) {
  if (navTabScraper) navTabScraper.classList.toggle('active', mode === 'scraper');
  if (navTabAI) navTabAI.classList.toggle('active', mode === 'ai');
  if (navTabSlide) navTabSlide.classList.toggle('active', mode === 'slide');

  if (modeScraperView) modeScraperView.classList.toggle('active', mode === 'scraper');
  if (modeAIView) modeAIView.classList.toggle('active', mode === 'ai');
  if (modeSlideView) modeSlideView.classList.toggle('active', mode === 'slide');

  if (mode === 'slide') {
    if (typeof checkRatingDataAvailability === 'function') {
      checkRatingDataAvailability();
    }
  }
}

if (navTabScraper) navTabScraper.addEventListener('click', () => switchMode('scraper'));
if (navTabAI) navTabAI.addEventListener('click', () => switchMode('ai'));
if (navTabSlide) navTabSlide.addEventListener('click', () => switchMode('slide'));

// Rating AI State & Elements
let selectedRatingFiles = [];

const dropzoneRatingFiles = document.getElementById('dropzoneRatingFiles');
const inputRatingFiles = document.getElementById('inputRatingFiles');
const listRatingFiles = document.getElementById('listRatingFiles');

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

function renderFileChips() {
  if (listRatingFiles) {
    listRatingFiles.innerHTML = selectedRatingFiles.map((f, i) => `
      <div class="file-chip">
        <span>📁 ${escapeHtml(f.name)} (${(f.size / 1024).toFixed(1)} KB)</span>
        <span class="file-chip-remove" onclick="removeRatingFile(${i})">×</span>
      </div>
    `).join('');
  }
}

function removeRatingFile(idx) {
  selectedRatingFiles.splice(idx, 1);
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

let currentAITabFilter = 'negative';

function getJourneyBadgeClass(journey) {
  const j = (journey || '').toLowerCase();
  if (j.includes('daily')) return 'journey-daily';
  if (j.includes('lending') || j.includes('vay') || j.includes('giải ngân') || j.includes('bảo lãnh')) return 'journey-lending';
  if (j.includes('kinh doanh') || j.includes('rm') || j.includes('cán bộ') || j.includes('nhân viên')) return 'journey-rm';
  if (j.includes('247') || j.includes('mb247') || j.includes('tổng đài')) return 'journey-247';
  if (j.includes('cntt') || j.includes('hệ thống') || j.includes('chậm') || j.includes('lag')) return 'journey-cntt';
  if (j.includes('tf') || j.includes('quốc tế') || j.includes('ngoại tệ')) return 'journey-tf';
  if (j.includes('quỹ') || j.includes('quầy') || j.includes('chi nhánh')) return 'journey-quay';
  if (j.includes('ui') || j.includes('ux') || j.includes('giao diện')) return 'journey-uiux';
  if (j.includes('onboarding') || j.includes('sinh trắc')) return 'journey-onboarding';
  if (j.includes('thẻ') || j.includes('the')) return 'journey-the';
  return 'journey-default';
}

function getJourneyOptionsHtml(results) {
  const defaultJourneys = [
    'Daily',
    'Khối kinh doanh',
    'Lending',
    'CNTT',
    'Trung tâm MB247',
    'Trung tâm quỹ và dịch vụ KH',
    'TF',
    'UI UX',
    'Onboarding',
    'Team Thẻ'
  ];
  const present = Array.isArray(results)
    ? Array.from(new Set(results.map(r => r.journey).filter(Boolean)))
    : [];
  const allJourneys = Array.from(new Set([...defaultJourneys, ...present]));
  return allJourneys.map(j => `<option value="${escapeHtml(j)}">${escapeHtml(j)}</option>`).join('');
}

function getFeatureOptionsHtml(results) {
  if (!Array.isArray(results)) return '';
  const features = Array.from(new Set(results.map(r => r.feature).filter(Boolean))).sort();
  return features.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
}

function getFileOptionsHtml(results) {
  if (!Array.isArray(results)) return '';
  const files = Array.from(new Set(results.map(r => r.sourceFile).filter(Boolean)));
  return files.map(f => `<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
}

function resetAITableFilters() {
  const kw = document.getElementById('aiFilterKeyword');
  const rating = document.getElementById('aiFilterRating');
  const journey = document.getElementById('aiFilterJourney');
  const feature = document.getElementById('aiFilterFeature');
  const file = document.getElementById('aiFilterFile');
  const dateFrom = document.getElementById('aiFilterDateFrom');
  const dateTo = document.getElementById('aiFilterDateTo');

  if (kw) kw.value = '';
  if (rating) rating.value = 'all';
  if (journey) journey.value = 'all';
  if (feature) feature.value = 'all';
  if (file) file.value = 'all';
  if (dateFrom) dateFrom.value = '';
  if (dateTo) dateTo.value = '';

  applyAITableFilters();
}

function applyAITableFilters() {
  const data = activeResults.ai;
  if (!data) return;

  const filterKw = (document.getElementById('aiFilterKeyword')?.value || '').toLowerCase().trim();
  const filterRating = document.getElementById('aiFilterRating')?.value || 'all';
  const filterJourney = document.getElementById('aiFilterJourney')?.value || 'all';
  const filterFeature = document.getElementById('aiFilterFeature')?.value || 'all';
  const filterFile = document.getElementById('aiFilterFile')?.value || 'all';
  const filterDateFrom = document.getElementById('aiFilterDateFrom')?.value || '';
  const filterDateTo = document.getElementById('aiFilterDateTo')?.value || '';

  let baseList = data.results || [];
  if (currentAITabFilter === 'negative') {
    baseList = baseList.filter(r => r.sentiment === 'Tiêu cực');
  } else if (currentAITabFilter === 'positive') {
    baseList = baseList.filter(r => r.sentiment === 'Tích cực');
  }

  const filtered = baseList.filter(r => {
    if (filterKw) {
      const text = `${r.comment || ''} ${r.userName || ''} ${r.matchedKeywords || ''} ${r.journey || ''} ${r.feature || ''} ${r.sourceFile || ''}`.toLowerCase();
      if (!text.includes(filterKw)) return false;
    }
    if (filterRating !== 'all') {
      if (String(r.rating) !== String(filterRating)) return false;
    }
    if (filterJourney !== 'all') {
      if ((r.journey || 'Daily').toLowerCase() !== filterJourney.toLowerCase()) return false;
    }
    if (filterFeature !== 'all') {
      if ((r.feature || 'Chưa phân loại').toLowerCase() !== filterFeature.toLowerCase()) return false;
    }
    if (filterFile !== 'all') {
      if (r.sourceFile !== filterFile) return false;
    }
    if (filterDateFrom && r.date && r.date < filterDateFrom) return false;
    if (filterDateTo && r.date && r.date > filterDateTo) return false;
    return true;
  });

  const tbody = document.getElementById('aiTableBody');
  const title = document.getElementById('aiTableTitle');

  if (title) {
    const isFiltered = filterKw || filterRating !== 'all' || filterJourney !== 'all' || filterFeature !== 'all' || filterFile !== 'all' || filterDateFrom || filterDateTo;
    const totalTabCount = baseList.length;

    let subTitleText = '';
    if (currentAITabFilter === 'negative') subTitleText = 'Bảng danh sách đánh giá Tiêu cực';
    else if (currentAITabFilter === 'positive') subTitleText = 'Bảng danh sách đánh giá Tích cực';
    else subTitleText = 'Bảng phân loại cảm xúc chi tiết theo từ điển';

    if (isFiltered) {
      title.textContent = `📋 ${subTitleText} (Đã lọc Excel: ${filtered.length} / ${totalTabCount} dòng)`;
    } else {
      title.textContent = `📋 ${subTitleText} (${totalTabCount} dòng)`;
    }
  }

  if (tbody) {
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted" style="padding: 28px;">Không tìm thấy dữ liệu trùng khớp với bộ lọc Excel</td></tr>`;
    } else {
      tbody.innerHTML = filtered.map((r, idx) => `
        <tr>
          <td class="text-center font-bold" style="font-weight: 700;">${idx + 1}</td>
          <td class="font-medium text-muted">${escapeHtml(r.sourceFile || '')}</td>
          <td class="font-medium">${escapeHtml(r.userName || 'Ẩn danh')}</td>
          <td class="text-center">
            <span class="rating-badge ${r.rating >= 4 ? 'star-high' : r.rating >= 3 ? 'star-med' : 'star-low'}">⭐ ${r.rating}</span>
          </td>
          <td class="comment-cell">${escapeHtml(r.comment || '')}</td>
          <td class="text-center text-muted date-cell">${r.date || ''}</td>
          <td class="text-center">
            <span class="${r.badgeClass}">${escapeHtml(r.sentiment)}</span>
          </td>
          <td class="journey-cell">
            <span class="badge-journey ${getJourneyBadgeClass(r.journey)}">${escapeHtml(r.journey || 'Daily')}</span>
          </td>
          <td class="feature-cell">
            <span class="badge-feature">${escapeHtml(r.feature || 'Trải nghiệm chung')}</span>
          </td>
          <td class="keyword-cell">${escapeHtml(r.matchedKeywords || '')}</td>
        </tr>
      `).join('');
    }
  }
}

function switchAITableTab(filterType) {
  currentAITabFilter = filterType;
  const data = activeResults.ai;
  if (!data) return;

  const tabNeg = document.getElementById('aiTabNeg');
  const tabPos = document.getElementById('aiTabPos');
  const tabAll = document.getElementById('aiTabAll');

  if (tabNeg) tabNeg.classList.toggle('active', filterType === 'negative');
  if (tabPos) tabPos.classList.toggle('active', filterType === 'positive');
  if (tabAll) tabAll.classList.toggle('active', filterType === 'all');

  applyAITableFilters();
}

function renderAIResults(data) {
  if (!aiResultsSection || !aiResultsWrapper) return;
  aiResultsSection.style.display = 'block';

  aiResultsWrapper.innerHTML = `
    <div class="tab-panel-inner">
      <!-- Download Bar AI -->
      <div class="download-bar summary" style="border-left-color: #8b5cf6;">
        <div class="download-info">
          <div class="file-icon">⚡</div>
          <div>
            <div class="file-name">${data.fileName || 'rating_ai_analysis.xlsx'}</div>
            <div class="file-sub">File Báo cáo Phân tích Cảm xúc Rating AI (Đã gắn nhãn Tích cực / Tiêu cực / Hành trình / Tính năng / Từ khóa)</div>
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
      <div class="stats-grid stats-grid-ai">
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
      </div>

      <!-- Data Preview Table AI -->
      <div class="preview-section">
        <div class="preview-header-tabs">
          <!-- 3 Sub-Tabs -->
          <div class="ai-table-tabs">
            <button class="ai-table-tab-btn active" id="aiTabNeg" onclick="switchAITableTab('negative')">
              ⚠️ Đánh giá Tiêu cực <span class="tab-count count-neg">${data.countNeg || 0}</span>
            </button>
            <button class="ai-table-tab-btn" id="aiTabPos" onclick="switchAITableTab('positive')">
              ✅ Đánh giá Tích cực <span class="tab-count count-pos">${data.countPos || 0}</span>
            </button>
            <button class="ai-table-tab-btn" id="aiTabAll" onclick="switchAITableTab('all')">
              📋 Tất cả đánh giá <span class="tab-count count-all">${data.totalReviews || 0}</span>
            </button>
          </div>

          <!-- Bộ Lọc Kiểu Excel (Excel AutoFilter Bar) -->
          <div class="excel-filter-toolbar">
            <div class="excel-filter-group">
              <span class="excel-filter-label">🔍 Tìm kiếm:</span>
              <input type="text" id="aiFilterKeyword" class="excel-filter-input" placeholder="Từ khóa, bình luận, người dùng..." oninput="applyAITableFilters()">
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">⭐ Số sao:</span>
              <select id="aiFilterRating" class="excel-filter-select" onchange="applyAITableFilters()">
                <option value="all">Tất cả số sao</option>
                <option value="1">⭐ 1 sao</option>
                <option value="2">⭐ 2 sao</option>
                <option value="3">⭐ 3 sao</option>
                <option value="4">⭐ 4 sao</option>
                <option value="5">⭐ 5 sao</option>
              </select>
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">📅 Từ ngày:</span>
              <input type="date" id="aiFilterDateFrom" class="excel-filter-input" onchange="applyAITableFilters()">
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">📅 Đến ngày:</span>
              <input type="date" id="aiFilterDateTo" class="excel-filter-input" onchange="applyAITableFilters()">
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">🗺️ Hành trình:</span>
              <select id="aiFilterJourney" class="excel-filter-select" onchange="applyAITableFilters()">
                <option value="all">Tất cả hành trình</option>
                ${getJourneyOptionsHtml(data.results)}
              </select>
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">⚙️ Tính năng:</span>
              <select id="aiFilterFeature" class="excel-filter-select" onchange="applyAITableFilters()">
                <option value="all">Tất cả tính năng</option>
                ${getFeatureOptionsHtml(data.results)}
              </select>
            </div>
            <div class="excel-filter-group">
              <span class="excel-filter-label">📁 Nguồn File:</span>
              <select id="aiFilterFile" class="excel-filter-select" onchange="applyAITableFilters()">
                <option value="all">Tất cả nguồn file</option>
                ${getFileOptionsHtml(data.results)}
              </select>
            </div>
            <button class="btn-excel-reset" onclick="resetAITableFilters()" title="Xóa tất cả bộ lọc">
              🔄 Xóa bộ lọc
            </button>
          </div>

          <h3 id="aiTableTitle" style="font-size: 0.88rem; margin-top: 14px; color: var(--text-secondary); font-weight: 500;">📋 Bảng danh sách đánh giá Tiêu cực (${data.countNeg || 0} dòng)</h3>
        </div>
        <div class="table-container">
          <table class="preview-table summary-table">
            <thead>
              <tr>
                <th style="width: 50px;" class="text-center">STT</th>
                <th style="width: 140px;">Nguồn File <span class="excel-header-btn" onclick="document.getElementById('aiFilterFile').focus()">▼</span></th>
                <th style="width: 130px;">Người dùng</th>
                <th style="width: 80px;" class="text-center">Số sao <span class="excel-header-btn" onclick="document.getElementById('aiFilterRating').focus()">▼</span></th>
                <th style="min-width: 320px; width: 28%;">Bình luận <span class="excel-header-btn" onclick="document.getElementById('aiFilterKeyword').focus()">▼</span></th>
                <th style="width: 125px; min-width: 115px;" class="text-center">Ngày <span class="excel-header-btn" onclick="document.getElementById('aiFilterDateFrom').focus()">▼</span></th>
                <th style="width: 105px;" class="text-center">Phân loại AI</th>
                <th style="width: 140px;">Hành trình <span class="excel-header-btn" onclick="document.getElementById('aiFilterJourney').focus()">▼</span></th>
                <th style="width: 140px;">Tính năng <span class="excel-header-btn" onclick="document.getElementById('aiFilterFeature').focus()">▼</span></th>
                <th style="min-width: 210px; width: 230px;">Từ khóa trùng khớp</th>
              </tr>
            </thead>
            <tbody id="aiTableBody">
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  resetAITableFilters();
  aiResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Button event listeners
// ============================================
// MODE 3: SLIDE GENERATOR & BRAND KIT STUDIO
// ============================================

// Brand Kit Default State
let brandKit = {
  primaryColor: '#171EDB',
  secondaryColor: '#F50912',
  accentColor: '#081235',
  bgColor: '#FFFFFF',
  textColor: '#081235',
  headingFont: 'Segoe UI',
  bodyFont: 'Calibri',
  brandName: 'Ngân hàng TMCP Quân Đội (MB)',
  presenterName: 'Khối Khách Hàng Doanh Nghiệp & Khối Bán Lẻ',
  slogan: 'Vững Vàng Nền Tảng • Tăng Tốc Bứt Phá',
  footerText: 'Báo cáo chiến lược MB Bank | Confidential',
  logoDataUrl: '',
  logoPosition: 'top-right',
  logoSize: 'medium'
};

const BRAND_PRESETS = {
  mbbank: { primary: '#171EDB', secondary: '#F50912', accent: '#081235', bg: '#FFFFFF', text: '#081235' },
  modernblue: { primary: '#141ED2', secondary: '#7B5FFF', accent: '#12B7B7', bg: '#FFFFFF', text: '#192D39' },
  tech: { primary: '#4F46E5', secondary: '#06B6D4', accent: '#10B981', bg: '#0F172A', text: '#F8FAFC' },
  corporate: { primary: '#1E3A8A', secondary: '#3B82F6', accent: '#F59E0B', bg: '#F8FAFC', text: '#1E293B' },
  gold: { primary: '#1E1B4B', secondary: '#D97706', accent: '#FBBF24', bg: '#18181B', text: '#F4F4F5' },
  eco: { primary: '#064E3B', secondary: '#059669', accent: '#10B981', bg: '#F0FDF4', text: '#14532D' },
  coral: { primary: '#991B1B', secondary: '#F97316', accent: '#FBBF24', bg: '#FFF7ED', text: '#431407' },
  violet: { primary: '#581C87', secondary: '#8B5CF6', accent: '#EC4899', bg: '#FAF5FF', text: '#3B0764' },
  slate: { primary: '#1E293B', secondary: '#475569', accent: '#0EA5E9', bg: '#FFFFFF', text: '#0F172A' },
  darkcyber: { primary: '#090D16', secondary: '#6366F1', accent: '#00F5FF', bg: '#05050A', text: '#FFFFFF' }
};

// Prompt Templates Library
const PROMPT_TEMPLATES = {
  review_report: `TỔNG QUAN ĐÁNH GIÁ TRẢI NGHIỆM KHÁCH HÀNG
1. Chỉ số chính:
- Điểm đánh giá trung bình: 4.7 / 5.0 (Tăng +0.4★ so với quý trước)
- Tỷ lệ hài lòng & khen ngợi: 86.4%
- Tổng số lượt đánh giá tiếp nhận: 12,580 phản hồi
2. Các điểm sáng nổi bật:
- Giao diện người dùng mới trực quan, hiện đại và tốc độ tải trang nhanh
- Tính năng xác thực sinh trắc học và onboarding hoạt động mượt mà
- Đội ngũ CSKH hỗ trợ nhiệt tình, giải quyết vấn đề dưới 5 phút
3. Các vấn đề cần cải tiến:
- Hiện tượng chậm phản hồi trong khung giờ cao điểm (11h - 13h)
- Một số khách hàng mong muốn bổ sung thêm tùy biến phím tắt và báo cáo chi tiết
4. Kế hoạch hành động:
- Nâng cấp băng thông máy chủ và tối ưu luồng xử lý dữ liệu
- Ra mắt phiên bản cập nhật v2.4 giải quyết triệt để lỗi kết nối
- Tăng cường khảo sát đo lường chỉ số NPS hàng tuần`,

  pitch_deck: `PITCH DECK: GIẢI PHÁP NỀN TẢNG CÔNG NGHỆ ĐỘT PHÁ
1. Vấn đề thị trường:
- Doanh nghiệp mất hơn 30% thời gian xử lý thủ công các báo cáo và phản hồi khách hàng
- Dữ liệu bị phân mảnh giữa nhiều phòng ban, thiếu góc nhìn trực quan toàn diện
2. Giải pháp của chúng tôi:
- Nền tảng tự động hóa phân tích cảm xúc và tổng hợp báo cáo bằng AI trong 30 giây
- Đồng bộ đa kênh thời gian thực, tích hợp sâu vào hệ thống quản trị hiện hữu
3. Cơ hội thị trường & Quy mô:
- Thị trường phần mềm trải nghiệm khách hàng (CX) đạt 14.5 tỷ USD, tăng trưởng 18%/năm
- Phân khúc khách hàng mục tiêu: Hơn 50,000 doanh nghiệp tài chính, bán lẻ, dịch vụ
4. Lợi thế cạnh tranh:
- Chi phí tối ưu chỉ bằng 1/5 các giải pháp nước ngoài
- Tùy biến ngôn ngữ tiếng Việt và từ điển chuyên ngành với độ chính xác >95%
5. Lộ trình gọi vốn & Kế hoạch tài chính:
- Mục tiêu huy động: 500,000 USD cho vòng Hạt giống (Seed Round)
- 50% mở rộng đội ngũ R&D, 30% Marketing & Sales, 20% Hạ tầng Cloud`,

  kpi_report: `BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH & KPI QUÝ
1. Tổng kết chỉ số kinh doanh chính:
- Doanh thu thuần: 42.5 Tỷ VNĐ (Đạt 112% kế hoạch quý, tăng trưởng +28% YoY)
- Lợi nhuận trước thuế: 9.8 Tỷ VNĐ (Biên lợi nhuận 23%)
- Số lượng khách hàng mới: 3,420 khách hàng doanh nghiệp
2. Hiệu quả vận hành theo phòng ban:
- Khối Kinh doanh & Sales: Vượt 15% chỉ số doanh số
- Khối Sản phẩm & Công nghệ: Hoàn thành 100% các tính năng theo Roadmap
- Khối Vận hành & CSKH: Chỉ số hài lòng CSAT đạt 94.2%
3. Quản trị rủi ro & Thách thức:
- Biến động chi phí thu hút khách hàng (CAC) trên các kênh quảng cáo số
- Áp lực cạnh tranh về giá từ các đối thủ mới gia nhập
4. Mục tiêu & Định hướng Quý tới:
- Mở rộng tệp khách hàng tại thị trường miền Trung và miền Nam
- Ra mắt gói dịch vụ cao cấp Premium Suite dành cho tập đoàn`,

  roadmap: `KẾ HOẠCH CHIẾN LƯỢC & LỘ TRÌNH PHÁT TRIỂN SẢN PHẨM
1. Tầm nhìn chiến lược:
- Trở thành nền tảng quản trị trải nghiệm khách hàng thông minh số 1 trong 3 năm tới
2. Các giai đoạn phát triển trọng tâm:
- Giai đoạn 1 (Q1 - Q2): Chuẩn hóa hạ tầng dữ liệu và nâng cấp độ tin cậy hệ thống lên 99.99%
- Giai đoạn 2 (Q3 - Q4): Ra mắt module phân tích dự đoán AI và tự động hóa quy trình
- Giai đoạn 3 (Năm tiếp theo): Mở rộng hệ sinh thái Open API và liên kết đối tác chiến lược
3. Phân bổ nguồn lực & Ngân sách:
- Đầu tư trọng điểm 45% nguồn lực cho đội ngũ kỹ sư AI & Dữ liệu
- 30% cho trải nghiệm người dùng UI/UX và bảo mật thông tin
- 25% cho nghiên cứu thị trường và đào tạo nội bộ
4. Thước đo thành công (Success Metrics):
- Tỷ lệ giữ chân người dùng (Retention Rate) > 85%
- Thời gian xử lý yêu cầu khách hàng giảm 40%`,

  training: `TÀI LIỆU ĐÀO TẠO & HƯỚNG DẪN QUY TRÌNH NỘI BỘ
1. Mục tiêu khóa đào tạo:
- Nắm vững quy trình tiếp nhận, phân loại và xử lý phản hồi khách hàng theo chuẩn dịch vụ 5 sao
- Tối ưu hóa kỹ năng sử dụng công cụ quản trị dữ liệu thông minh
2. Quy trình 4 bước chuẩn hóa:
- Bước 1: Tiếp nhận và ghi nhận thông tin phản hồi trong vòng 15 phút
- Bước 2: Phân loại hành trình và chuyển tiếp đến đơn vị nghiệp vụ liên quan
- Bước 3: Phối hợp xử lý và kiểm tra chất lượng giải pháp
- Bước 4: Phản hồi khách hàng và đo lường chỉ số hài lòng sau hỗ trợ
3. Tiêu chuẩn đánh giá & Best Practices:
- Luôn giữ thái độ đồng cảm, tôn trọng và chuyên nghiệp
- Không để tồn đọng phản hồi quá 24h làm việc
4. Câu hỏi thường gặp & Tình huống mẫu:
- Xử lý sự cố gián đoạn dịch vụ vào giờ cao điểm
- Hướng dẫn khách hàng cập nhật tính năng mới một cách tận tình`,

  market_research: `BÁO CÁO PHÂN TÍCH THỊ TRƯỜNG & ĐỐI THỦ CẠNH TRANH
1. Bức tranh toàn cảnh thị trường:
- Xu hướng chuyển đổi số mạnh mẽ trong quản trị trải nghiệm khách hàng tại Việt Nam
- Nhu cầu cá nhân hóa dịch vụ của người tiêu dùng thế hệ số tăng cao 45%
2. Phân tích đối thủ cạnh tranh chính:
- Đối thủ A: Mạnh về nhận diện thương hiệu truyền thống nhưng công nghệ cũ, chi phí cao
- Đối thủ B: Sản phẩm linh hoạt nhưng chưa có từ điển tiếng Việt chuyên sâu và hỗ trợ nội địa
3. Phân tích SWOT của chúng tôi:
- Điểm mạnh (Strengths): Công nghệ AI tiên tiến, thấu hiểu văn hóa và hành vi người dùng Việt
- Cơ hội (Opportunities): Nhu cầu tự động hóa doanh nghiệp vừa và nhỏ bùng nổ
4. Chiến lược định vị & Hành động:
- Định vị: Giải pháp thông minh, dễ dùng, hiệu quả cao với chi phí tối ưu nhất
- Tập trung xây dựng uy tín qua chất lượng dịch vụ và tính bảo mật tuyệt đối`
};

// Current Active Deck State
let currentDeck = null;
let currentSlideIndex = 0;
let attachedDocFiles = [];

// DOM Elements for Slide Generator
const colorPickerPrimary = document.getElementById('colorPickerPrimary');
const colorHexPrimary = document.getElementById('colorHexPrimary');
const colorPickerSecondary = document.getElementById('colorPickerSecondary');
const colorHexSecondary = document.getElementById('colorHexSecondary');
const colorPickerAccent = document.getElementById('colorPickerAccent');
const colorHexAccent = document.getElementById('colorHexAccent');
const colorPickerBg = document.getElementById('colorPickerBg');
const colorHexBg = document.getElementById('colorHexBg');
const colorPickerText = document.getElementById('colorPickerText');
const colorHexText = document.getElementById('colorHexText');

const fontHeadingSelect = document.getElementById('fontHeadingSelect');
const fontBodySelect = document.getElementById('fontBodySelect');
const brandNameInput = document.getElementById('brandNameInput');
const brandPresenterInput = document.getElementById('brandPresenterInput');
const brandFooterInput = document.getElementById('brandFooterInput');

const brandLogoDropzone = document.getElementById('brandLogoDropzone');
const brandLogoInput = document.getElementById('brandLogoInput');
const brandLogoEmptyState = document.getElementById('brandLogoEmptyState');
const brandLogoPreviewWrapper = document.getElementById('brandLogoPreviewWrapper');
const brandLogoImg = document.getElementById('brandLogoImg');
const btnRemoveLogo = document.getElementById('btnRemoveLogo');
const brandLogoPosition = document.getElementById('brandLogoPosition');
const brandLogoSize = document.getElementById('brandLogoSize');

const btnSaveBrandKit = document.getElementById('btnSaveBrandKit');
const btnResetBrandKit = document.getElementById('btnResetBrandKit');
const presetChipsContainer = document.getElementById('presetChipsContainer');

// Content Input DOM Elements
const btnSourceText = document.getElementById('btnSourceText');
const btnSourceDocs = document.getElementById('btnSourceDocs');
const btnSourceRatingAI = document.getElementById('btnSourceRatingAI');
const sourcePanelText = document.getElementById('sourcePanelText');
const sourcePanelDocs = document.getElementById('sourcePanelDocs');
const sourcePanelRatingAI = document.getElementById('sourcePanelRatingAI');

const slideContentInput = document.getElementById('slideContentInput');
const btnClearSlideText = document.getElementById('btnClearSlideText');
const templatesChips = document.getElementById('templatesChips');

const slideDocDropzone = document.getElementById('slideDocDropzone');
const slideDocInput = document.getElementById('slideDocInput');
const slideDocList = document.getElementById('slideDocList');

const ratingBridgeStats = document.getElementById('ratingBridgeStats');
const btnImportRatingData = document.getElementById('btnImportRatingData');

const slideDeckTitle = document.getElementById('slideDeckTitle');
const slideDeckSubtitle = document.getElementById('slideDeckSubtitle');
const slideAudience = document.getElementById('slideAudience');
const slideCountSelect = document.getElementById('slideCountSelect');
const slideThemeStyle = document.getElementById('slideThemeStyle');
const btnGenerateSlides = document.getElementById('btnGenerateSlides');

// Progress & Studio DOM Elements
const slideProgressSection = document.getElementById('slideProgressSection');
const slideProgressText = document.getElementById('slideProgressText');
const slideProgressDetails = document.getElementById('slideProgressDetails');
const slideProgressBar = document.getElementById('slideProgressBar');
const stepParse = document.getElementById('stepParse');
const stepBrand = document.getElementById('stepBrand');
const stepLayout = document.getElementById('stepLayout');
const stepDone = document.getElementById('stepDone');

const slideStudioSection = document.getElementById('slideStudioSection');
const currentSlideIndexLabel = document.getElementById('currentSlideIndexLabel');
const totalSlidesCountLabel = document.getElementById('totalSlidesCountLabel');
const btnPrevSlide = document.getElementById('btnPrevSlide');
const btnNextSlide = document.getElementById('btnNextSlide');
const selectCurrentSlideLayout = document.getElementById('selectCurrentSlideLayout');
const btnAddSlide = document.getElementById('btnAddSlide');
const btnDeleteSlide = document.getElementById('btnDeleteSlide');
const btnToggleSlideEditor = document.getElementById('btnToggleSlideEditor');

const slideCanvas = document.getElementById('slideCanvas');
const slideThumbnailsFilmstrip = document.getElementById('slideThumbnailsFilmstrip');
const slideEditorDrawer = document.getElementById('slideEditorDrawer');
const slideEditorFields = document.getElementById('slideEditorFields');
const btnCloseDrawer = document.getElementById('btnCloseDrawer');

const exportDeckFilename = document.getElementById('exportDeckFilename');
const btnDownloadPPTX = document.getElementById('btnDownloadPPTX');
const btnCopySlideDeckOutline = document.getElementById('btnCopySlideDeckOutline');

// ============================================
// Brand Kit Management Functions
// ============================================
function initBrandKit() {
  const saved = localStorage.getItem('brandkit_config_v2');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      brandKit = { ...brandKit, ...parsed };
    } catch (e) { }
  }
  updateBrandKitInputs();
}

function updateBrandKitInputs() {
  if (colorPickerPrimary) colorPickerPrimary.value = brandKit.primaryColor;
  if (colorHexPrimary) colorHexPrimary.value = brandKit.primaryColor.toUpperCase();

  if (colorPickerSecondary) colorPickerSecondary.value = brandKit.secondaryColor;
  if (colorHexSecondary) colorHexSecondary.value = brandKit.secondaryColor.toUpperCase();

  if (colorPickerAccent) colorPickerAccent.value = brandKit.accentColor;
  if (colorHexAccent) colorHexAccent.value = brandKit.accentColor.toUpperCase();

  if (colorPickerBg) colorPickerBg.value = brandKit.bgColor;
  if (colorHexBg) colorHexBg.value = brandKit.bgColor.toUpperCase();

  if (colorPickerText) colorPickerText.value = brandKit.textColor;
  if (colorHexText) colorHexText.value = brandKit.textColor.toUpperCase();

  if (fontHeadingSelect) fontHeadingSelect.value = brandKit.headingFont;
  if (fontBodySelect) fontBodySelect.value = brandKit.bodyFont;
  if (brandNameInput) brandNameInput.value = brandKit.brandName;
  if (brandPresenterInput) brandPresenterInput.value = brandKit.presenterName;
  if (brandFooterInput) brandFooterInput.value = brandKit.footerText;

  if (brandLogoPosition) brandLogoPosition.value = brandKit.logoPosition;
  if (brandLogoSize) brandLogoSize.value = brandKit.logoSize;

  if (brandKit.logoDataUrl) {
    if (brandLogoImg) brandLogoImg.src = brandKit.logoDataUrl;
    if (brandLogoEmptyState) brandLogoEmptyState.style.display = 'none';
    if (brandLogoPreviewWrapper) brandLogoPreviewWrapper.style.display = 'inline-block';
  } else {
    if (brandLogoImg) brandLogoImg.src = '';
    if (brandLogoEmptyState) brandLogoEmptyState.style.display = 'block';
    if (brandLogoPreviewWrapper) brandLogoPreviewWrapper.style.display = 'none';
  }
}

function syncColorInputs(pickerEl, hexEl, key) {
  if (pickerEl && hexEl) {
    pickerEl.addEventListener('input', () => {
      hexEl.value = pickerEl.value.toUpperCase();
      brandKit[key] = pickerEl.value;
      if (currentDeck) renderCurrentSlide();
    });
    hexEl.addEventListener('change', () => {
      let val = hexEl.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        pickerEl.value = val;
        hexEl.value = val.toUpperCase();
        brandKit[key] = val;
        if (currentDeck) renderCurrentSlide();
      }
    });
  }
}

syncColorInputs(colorPickerPrimary, colorHexPrimary, 'primaryColor');
syncColorInputs(colorPickerSecondary, colorHexSecondary, 'secondaryColor');
syncColorInputs(colorPickerAccent, colorHexAccent, 'accentColor');
syncColorInputs(colorPickerBg, colorHexBg, 'bgColor');
syncColorInputs(colorPickerText, colorHexText, 'textColor');

if (fontHeadingSelect) {
  fontHeadingSelect.addEventListener('change', (e) => {
    brandKit.headingFont = e.target.value;
    if (currentDeck) renderCurrentSlide();
  });
}
if (fontBodySelect) {
  fontBodySelect.addEventListener('change', (e) => {
    brandKit.bodyFont = e.target.value;
    if (currentDeck) renderCurrentSlide();
  });
}
if (brandNameInput) {
  brandNameInput.addEventListener('input', (e) => {
    brandKit.brandName = e.target.value;
  });
}
if (brandPresenterInput) {
  brandPresenterInput.addEventListener('input', (e) => {
    brandKit.presenterName = e.target.value;
  });
}
if (brandFooterInput) {
  brandFooterInput.addEventListener('input', (e) => {
    brandKit.footerText = e.target.value;
  });
}
if (brandLogoPosition) {
  brandLogoPosition.addEventListener('change', (e) => {
    brandKit.logoPosition = e.target.value;
    if (currentDeck) renderCurrentSlide();
  });
}
if (brandLogoSize) {
  brandLogoSize.addEventListener('change', (e) => {
    brandKit.logoSize = e.target.value;
    if (currentDeck) renderCurrentSlide();
  });
}

// Preset Chips
if (presetChipsContainer) {
  presetChipsContainer.querySelectorAll('.preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      presetChipsContainer.querySelectorAll('.preset-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const presetKey = btn.dataset.preset;
      const p = BRAND_PRESETS[presetKey];
      if (p) {
        brandKit.primaryColor = p.primary;
        brandKit.secondaryColor = p.secondary;
        brandKit.accentColor = p.accent;
        brandKit.bgColor = p.bg;
        brandKit.textColor = p.text;
        updateBrandKitInputs();
        if (currentDeck) renderCurrentSlide();
        showToast(`Đã áp dụng bảng màu ${btn.textContent.trim()}`, 'info');
      }
    });
  });
}

// Logo Dropzone & Upload
if (brandLogoDropzone && brandLogoInput) {
  brandLogoDropzone.addEventListener('click', (e) => {
    if (e.target !== btnRemoveLogo) {
      brandLogoInput.click();
    }
  });

  brandLogoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        brandKit.logoDataUrl = evt.target.result;
        updateBrandKitInputs();
        if (currentDeck) renderCurrentSlide();
        showToast('Đã tải logo thành công!', 'success');
      };
      reader.readAsDataURL(file);
    }
  });
}

if (btnRemoveLogo) {
  btnRemoveLogo.addEventListener('click', (e) => {
    e.stopPropagation();
    brandKit.logoDataUrl = '';
    if (brandLogoInput) brandLogoInput.value = '';
    updateBrandKitInputs();
    if (currentDeck) renderCurrentSlide();
    showToast('Đã xóa logo', 'info');
  });
}

if (btnSaveBrandKit) {
  btnSaveBrandKit.addEventListener('click', () => {
    localStorage.setItem('brandkit_config_v2', JSON.stringify(brandKit));
    showToast('Đã lưu Brand Kit làm mặc định thành công!', 'success');
  });
}

if (btnResetBrandKit) {
  btnResetBrandKit.addEventListener('click', () => {
    brandKit = {
      primaryColor: '#4F46E5',
      secondaryColor: '#06B6D4',
      accentColor: '#10B981',
      bgColor: '#0F172A',
      textColor: '#F8FAFC',
      headingFont: 'Montserrat',
      bodyFont: 'Inter',
      brandName: 'Digital Enterprise',
      presenterName: 'Ban Đổi Mới & Trải Nghiệm Khách Hàng',
      slogan: 'Phát Triển Bền Vững & Lấy Khách Hàng Làm Trung Tâm',
      footerText: 'Báo cáo chiến lược & Phân tích trải nghiệm | Confidential',
      logoDataUrl: '',
      logoPosition: 'top-right',
      logoSize: 'medium'
    };
    updateBrandKitInputs();
    localStorage.removeItem('brandkit_config_v2');
    if (currentDeck) renderCurrentSlide();
    showToast('Đã đặt lại Brand Kit mặc định', 'info');
  });
}

// ============================================
// Brand Kit vs Template Studio Sub-tab Switcher
// ============================================
const tabBtnCustomBrand = document.getElementById('tabBtnCustomBrand');
const tabBtnTemplateUpload = document.getElementById('tabBtnTemplateUpload');
const viewCustomBrand = document.getElementById('viewCustomBrand');
const viewTemplateUpload = document.getElementById('viewTemplateUpload');

function switchBrandKitMode(mode) {
  if (mode === 'template') {
    if (tabBtnTemplateUpload) tabBtnTemplateUpload.classList.add('active');
    if (tabBtnCustomBrand) tabBtnCustomBrand.classList.remove('active');
    if (viewTemplateUpload) viewTemplateUpload.style.display = 'block';
    if (viewCustomBrand) viewCustomBrand.style.display = 'none';
  } else {
    if (tabBtnCustomBrand) tabBtnCustomBrand.classList.add('active');
    if (tabBtnTemplateUpload) tabBtnTemplateUpload.classList.remove('active');
    if (viewCustomBrand) viewCustomBrand.style.display = 'block';
    if (viewTemplateUpload) viewTemplateUpload.style.display = 'none';
  }
}

if (tabBtnCustomBrand) tabBtnCustomBrand.addEventListener('click', () => switchBrandKitMode('custom'));
if (tabBtnTemplateUpload) tabBtnTemplateUpload.addEventListener('click', () => switchBrandKitMode('template'));

// ============================================
// PowerPoint Template Upload & Parser Handler
// ============================================
const templateDropzone = document.getElementById('templateDropzone');
const templateFileInput = document.getElementById('templateFileInput');
const templateLoadedCard = document.getElementById('templateLoadedCard');
const templateLoadedName = document.getElementById('templateLoadedName');
const templateSlideCountBadge = document.getElementById('templateSlideCountBadge');
const templateHeaderMeta = document.getElementById('templateHeaderMeta');
const templateColorChips = document.getElementById('templateColorChips');
const templateFontBadges = document.getElementById('templateFontBadges');
const templateLayoutsGrid = document.getElementById('templateLayoutsGrid');
const templateLogoBox = document.getElementById('templateLogoBox');
const templateLogoPreview = document.getElementById('templateLogoPreview');
const btnSyncTemplateBrand = document.getElementById('btnSyncTemplateBrand');
const btnRemoveTemplate = document.getElementById('btnRemoveTemplate');
const btnDownloadTemplatePPTX = document.getElementById('btnDownloadTemplatePPTX');

let currentUploadedTemplate = null;

if (templateDropzone && templateFileInput) {
  setupDropzone(templateDropzone, templateFileInput, (files) => {
    if (files.length > 0) {
      uploadAndParseTemplate(files[0]);
    }
  });
}

async function uploadAndParseTemplate(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'pptx') {
    showToast('Vui lòng chọn file template định dạng PowerPoint (.pptx)!', 'error');
    return;
  }

  showToast(`Đang phân tích cấu trúc Template: ${file.name}...`, 'info');

  const formData = new FormData();
  formData.append('templateFile', file);

  try {
    const res = await fetch('/api/template/parse', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.success) {
      currentUploadedTemplate = data;
      renderTemplateProfile(data);
      if (btnDownloadTemplatePPTX) btnDownloadTemplatePPTX.style.display = 'inline-flex';
      showToast(`🎉 Đã phân tích thành công Template: "${data.fileName}" (${data.slideCount} layouts)!`, 'success');
    }
  } catch (err) {
    console.error('Template upload error:', err);
    let msg = err.message || 'Không xác định';
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
      msg = 'Không thể kết nối máy chủ local. Vui lòng đảm bảo server Node.js đang chạy tại http://localhost:3000 (Chạy file start-server.bat hoặc npm start)!';
    }
    showToast(`Lỗi phân tích template: ${msg}`, 'error');
  }
}

function renderTemplateProfile(tmpl) {
  if (!templateLoadedCard) return;

  if (templateDropzone) templateDropzone.style.display = 'none';
  templateLoadedCard.style.display = 'block';

  if (templateLoadedName) templateLoadedName.textContent = tmpl.fileName;
  if (templateSlideCountBadge) templateSlideCountBadge.textContent = `${tmpl.slideCount} Layouts Master`;
  if (templateHeaderMeta) {
    templateHeaderMeta.textContent = `Kích thước: ${(tmpl.fileSize / 1024).toFixed(1)} KB • Theme Master: ${tmpl.colors.primary}`;
  }

  // Render Theme Color Chips
  if (templateColorChips) {
    const clrs = [
      { name: 'Primary', hex: tmpl.colors.primary },
      { name: 'Secondary', hex: tmpl.colors.secondary },
      { name: 'Accent', hex: tmpl.colors.accent },
      { name: 'Background', hex: tmpl.colors.bg },
      { name: 'Text', hex: tmpl.colors.text }
    ];
    templateColorChips.innerHTML = clrs.map(c => `
      <div class="spec-color-chip">
        <span class="spec-color-circle" style="background: ${c.hex};"></span>
        <span>${c.name}: <strong>${c.hex}</strong></span>
      </div>
    `).join('');
  }

  // Render Font Badges
  if (templateFontBadges) {
    templateFontBadges.innerHTML = `
      <span class="spec-font-badge">Tiêu đề: <strong>${escapeHtml(tmpl.fonts.headingFont)}</strong></span>
      <span class="spec-font-badge">Nội dung: <strong>${escapeHtml(tmpl.fonts.bodyFont)}</strong></span>
    `;
  }

  // Render Logo if present
  if (tmpl.logoBase64 && templateLogoBox && templateLogoPreview) {
    templateLogoBox.style.display = 'block';
    templateLogoPreview.innerHTML = `<img src="${tmpl.logoBase64}" style="max-height: 40px; border-radius: 4px;" alt="Template Logo" />`;
  }

  // Render Layouts Grid
  if (templateLayoutsGrid) {
    const layoutIcons = {
      cover: '🌟',
      agenda: '📋',
      kpis: '📈',
      cards3: '🏛️',
      cards2: '📌',
      timeline: '🗺️',
      quotes: '💬',
      action_plan: '🎯',
      conclusion: '🤝',
      content: '📄'
    };

    templateLayoutsGrid.innerHTML = (tmpl.recognizedLayouts || []).map((l) => `
      <div class="template-layout-chip">
        <span class="layout-chip-icon">${layoutIcons[l.layoutType] || '📄'}</span>
        <div>
          <div class="layout-chip-name">Slide ${l.slideNum}: ${escapeHtml(l.sampleTitle || 'Bố cục')}</div>
          <div class="layout-chip-desc">${l.layoutType.toUpperCase()} • ${l.sampleParagraphs.length} khối nội dung</div>
        </div>
      </div>
    `).join('');
  }
}

if (btnSyncTemplateBrand) {
  btnSyncTemplateBrand.addEventListener('click', () => {
    if (!currentUploadedTemplate) return;
    const tc = currentUploadedTemplate.colors;
    const tf = currentUploadedTemplate.fonts;

    if (tc) {
      if (tc.primary) brandKit.primaryColor = tc.primary;
      if (tc.secondary) brandKit.secondaryColor = tc.secondary;
      if (tc.accent) brandKit.accentColor = tc.accent;
      if (tc.bg) brandKit.bgColor = tc.bg;
      if (tc.text) brandKit.textColor = tc.text;
    }
    if (tf) {
      if (tf.headingFont) brandKit.headingFont = tf.headingFont;
      if (tf.bodyFont) brandKit.bodyFont = tf.bodyFont;
    }
    if (currentUploadedTemplate.logoBase64) {
      brandKit.logoDataUrl = currentUploadedTemplate.logoBase64;
    }

    updateBrandKitInputs();
    if (currentDeck) renderCurrentSlide();
    showToast('✨ Đã áp dụng toàn bộ Bảng màu và Font chữ của Template vào Brand Kit!', 'success');
  });
}

if (btnRemoveTemplate) {
  btnRemoveTemplate.addEventListener('click', () => {
    currentUploadedTemplate = null;
    if (templateFileInput) templateFileInput.value = '';
    if (templateDropzone) templateDropzone.style.display = 'block';
    if (templateLoadedCard) templateLoadedCard.style.display = 'none';
    if (btnDownloadTemplatePPTX) btnDownloadTemplatePPTX.style.display = 'none';
    showToast('Đã hủy liên kết template', 'info');
  });
}

// Content Input & Source Tabs
function switchSourceTab(tab) {
  [btnSourceText, btnSourceDocs, btnSourceRatingAI].forEach(b => {
    if (b) b.classList.remove('active');
  });
  [sourcePanelText, sourcePanelDocs, sourcePanelRatingAI].forEach(p => {
    if (p) p.classList.remove('active');
  });

  if (tab === 'docs') {
    if (btnSourceDocs) btnSourceDocs.classList.add('active');
    if (sourcePanelDocs) sourcePanelDocs.classList.add('active');
  } else if (tab === 'rating') {
    if (btnSourceRatingAI) btnSourceRatingAI.classList.add('active');
    if (sourcePanelRatingAI) sourcePanelRatingAI.classList.add('active');
    checkRatingDataAvailability();
  } else {
    if (btnSourceText) btnSourceText.classList.add('active');
    if (sourcePanelText) sourcePanelText.classList.add('active');
  }
}

if (btnSourceText) btnSourceText.addEventListener('click', () => switchSourceTab('text'));
if (btnSourceDocs) btnSourceDocs.addEventListener('click', () => switchSourceTab('docs'));
if (btnSourceRatingAI) btnSourceRatingAI.addEventListener('click', () => switchSourceTab('rating'));

// Prompt Templates
if (templatesChips) {
  templatesChips.querySelectorAll('.template-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const tplKey = chip.dataset.tpl;
      const tplContent = PROMPT_TEMPLATES[tplKey];
      if (tplContent && slideContentInput) {
        slideContentInput.value = tplContent;
        if (tplKey === 'review_report') {
          if (slideDeckTitle) slideDeckTitle.value = 'Báo Cáo Toàn Diện Về Trải Nghiệm Khách Hàng & Chiến Lược Cải Tiến';
          if (slideDeckSubtitle) slideDeckSubtitle.value = 'Phân tích dữ liệu thực tế từ người dùng & Lộ trình hành động bứt phá';
        } else if (tplKey === 'pitch_deck') {
          if (slideDeckTitle) slideDeckTitle.value = 'Pitch Deck: Giải Pháp Nền Tảng Công Nghệ Đột Phá';
          if (slideDeckSubtitle) slideDeckSubtitle.value = 'Cơ hội thị trường 14.5 tỷ USD & Đề xuất giá trị độc bản';
        } else if (tplKey === 'kpi_report') {
          if (slideDeckTitle) slideDeckTitle.value = 'Báo Cáo Hiệu Quả Kinh Doanh & Đánh Giá KPI Định Kỳ';
          if (slideDeckSubtitle) slideDeckSubtitle.value = 'Tăng trưởng doanh thu 112% & Chiến lược mở rộng quy mô';
        } else if (tplKey === 'roadmap') {
          if (slideDeckTitle) slideDeckTitle.value = 'Kế Hoạch Chiến Lược & Lộ Trình Phát Triển 3 Năm';
          if (slideDeckSubtitle) slideDeckSubtitle.value = 'Tầm nhìn dẫn đầu thị trường & Tối ưu hóa phân bổ nguồn lực';
        } else if (tplKey === 'training') {
          if (slideDeckTitle) slideDeckTitle.value = 'Khóa Đào Tạo & Chuẩn Hóa Quy Trình Vận Hành 5 Sao';
          if (slideDeckSubtitle) slideDeckSubtitle.value = 'Cẩm nang hướng dẫn nghiệp vụ & Xử lý tình huống thực tế';
        } else if (tplKey === 'market_research') {
          if (slideDeckTitle) slideDeckTitle.value = 'Báo Cáo Phân Tích Thị Trường & Ma Trận Cạnh Tranh';
          if (slideDeckSubtitle) slideDeckSubtitle.value = 'Nắm bắt cơ hội đột phá & Định vị thương hiệu dẫn đầu';
        }
        showToast(`Đã nạp mẫu: ${chip.textContent.trim()}`, 'success');
      }
    });
  });
}

if (btnClearSlideText && slideContentInput) {
  btnClearSlideText.addEventListener('click', () => {
    slideContentInput.value = '';
    showToast('Đã xóa nội dung văn bản', 'info');
  });
}

// Document Attachment Dropzone
let lastParsedDocData = null;

if (slideDocDropzone && slideDocInput) {
  setupDropzone(slideDocDropzone, slideDocInput, (files) => {
    for (let f of files) {
      if (!attachedDocFiles.some(d => d.name === f.name && d.size === f.size)) {
        attachedDocFiles.push(f);
        readAttachedDocFile(f);
      }
    }
    renderAttachedDocList();
  });
}

async function readAttachedDocFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  showToast(`Đang trích xuất nội dung từ file ${file.name}...`, 'info');
  renderAttachedDocList();

  const formData = new FormData();
  formData.append('docFile', file);

  try {
    const res = await fetch('/api/parse-doc', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data && data.success) {
      file.parsedData = data;
      lastParsedDocData = data;

      // Auto-populate Title & Subtitle if currently default or empty
      if (slideDeckTitle) {
        slideDeckTitle.value = data.detectedTitle || file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      }
      if (slideDeckSubtitle && data.detectedSubtitle) {
        slideDeckSubtitle.value = data.detectedSubtitle;
      }

      // Auto-populate content input
      if (slideContentInput) {
        slideContentInput.value = data.fullText || '';
      }

      renderAttachedDocList();
      showToast(`✅ Đã đọc thành công file "${file.name}" (${data.slideCount || 1} phần/trang)!`, 'success');
    } else {
      throw new Error(data.error || 'Không thể trích xuất nội dung');
    }
  } catch (err) {
    console.error('Doc parse error:', err);
    // Fallback: Read client-side as text if text-like
    if (['txt', 'md', 'json', 'csv'].includes(ext)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        if (slideContentInput) slideContentInput.value = text;
        showToast(`Đã đọc nội dung dạng văn bản từ file ${file.name}`, 'info');
      };
      reader.readAsText(file);
    } else {
      showToast(`Không thể đọc tự động file ${file.name}: ${err.message}`, 'error');
    }
  }
}

function renderAttachedDocList() {
  if (slideDocList) {
    slideDocList.innerHTML = attachedDocFiles.map((f, idx) => {
      const isParsed = !!f.parsedData;
      const countLabel = isParsed ? ` • Đã trích xuất ${f.parsedData.slideCount || 1} trang/mục` : ' • Đang xử lý...';
      return `
        <div class="file-chip ${isParsed ? 'chip-success' : ''}" style="${isParsed ? 'background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.4);' : ''}">
          <span>${isParsed ? '✅' : '⏳'} <strong>${escapeHtml(f.name)}</strong> (${(f.size / 1024).toFixed(1)} KB${countLabel})</span>
          <span class="file-chip-remove" onclick="removeAttachedDoc(${idx})">×</span>
        </div>
      `;
    }).join('');
  }
}

function removeAttachedDoc(idx) {
  attachedDocFiles.splice(idx, 1);
  if (!attachedDocFiles.length) {
    lastParsedDocData = null;
  }
  renderAttachedDocList();
}

// Rating AI Bridge
function checkRatingDataAvailability() {
  let hasData = false;
  let statsHtml = '';

  const aiData = activeResults.ai;
  const summaryData = activeResults.summary;
  const androidData = activeResults.android;
  const iosData = activeResults.ios;

  if (aiData && aiData.total) {
    hasData = true;
    statsHtml += `
      <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8;">📊 Tổng phân tích AI: ${aiData.total} dòng</span>
      <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🟢 Tích cực: ${aiData.countPos || 0}</span>
      <span class="badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">🔴 Tiêu cực: ${aiData.countNeg || 0}</span>
    `;
  } else if (summaryData && summaryData.totalCombined) {
    hasData = true;
    statsHtml += `
      <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8;">📱 Tổng đánh giá cào được: ${summaryData.totalCombined}</span>
      <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">⭐ Điểm trung bình: ${summaryData.avgCombined || 4.5}</span>
    `;
  } else if (androidData && androidData.totalReviews) {
    hasData = true;
    statsHtml += `<span class="badge">Google Play: ${androidData.totalReviews} đánh giá</span>`;
  } else if (iosData && iosData.totalReviews) {
    hasData = true;
    statsHtml += `<span class="badge">App Store: ${iosData.totalReviews} đánh giá</span>`;
  }

  const ratingBridgeDesc = document.getElementById('ratingBridgeDesc');
  if (ratingBridgeStats) {
    if (hasData) {
      ratingBridgeStats.innerHTML = statsHtml;
      ratingBridgeStats.style.display = 'flex';
      if (ratingBridgeDesc) ratingBridgeDesc.textContent = 'Đã tìm thấy dữ liệu đánh giá và phân tích AI có sẵn trong phiên làm việc. Bấm nút dưới đây để chuyển đổi thành slide!';
    } else {
      ratingBridgeStats.style.display = 'none';
      if (ratingBridgeDesc) ratingBridgeDesc.textContent = 'Chưa có dữ liệu cào ở Tab 1 hoặc Tab 2. Bạn có thể cào đánh giá trước, hoặc sử dụng Tab "Nhập Dàn Ý & Văn Bản" phía trên để tạo slide tự do.';
    }
  }
}

if (btnImportRatingData) {
  btnImportRatingData.addEventListener('click', () => {
    importRatingDataToSlide();
  });
}

function importRatingDataToSlide() {
  const aiData = activeResults.ai;
  const summaryData = activeResults.summary;
  const androidData = activeResults.android;
  const iosData = activeResults.ios;

  let appName = 'Ứng Dụng Di Động';
  if (androidData && androidData.appTitle) appName = androidData.appTitle;
  else if (iosData && iosData.appTitle) appName = iosData.appTitle;

  let totalRev = (summaryData && summaryData.totalCombined) || (aiData && aiData.total) || (androidData && androidData.totalReviews) || 1500;
  let avgScore = (summaryData && summaryData.avgCombined) || (androidData && androidData.avgScore) || 4.6;

  let posCount = (aiData && aiData.countPos) || Math.round(totalRev * 0.78);
  let negCount = (aiData && aiData.countNeg) || Math.round(totalRev * 0.14);
  let neuCount = (aiData && aiData.countNeu) || (totalRev - posCount - negCount);

  let topNegJourneys = [];
  if (aiData && aiData.journeyStats) {
    topNegJourneys = Object.entries(aiData.journeyStats)
      .map(([k, v]) => ({ name: k, count: v.neg || 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }

  const generatedContent = `BÁO CÁO PHÂN TÍCH ĐÁNH GIÁ KHÁCH HÀNG: ${appName.toUpperCase()}
1. Tổng quan số liệu vận hành:
- Tên ứng dụng: ${appName}
- Tổng số lượng đánh giá tiếp nhận: ${totalRev} lượt đánh giá
- Điểm đánh giá trung bình: ${avgScore}★ / 5.0★
- Tỷ lệ Tích cực: ${Math.round((posCount / totalRev) * 100)}% (${posCount} lượt)
- Tỷ lệ Tiêu cực / Góp ý: ${Math.round((negCount / totalRev) * 100)}% (${negCount} lượt)
- Tỷ lệ Trung tính: ${Math.round((neuCount / totalRev) * 100)}% (${neuCount} lượt)

2. Phân tích điểm nghẽn trải nghiệm theo Hành trình:
${topNegJourneys.length ? topNegJourneys.map(j => `- Hành trình ${j.name}: Ghi nhận ${j.count} phản ánh tiêu cực về tốc độ và quy trình`).join('\n') : `- Hành trình Daily & Giao dịch: Cần tối ưu thời gian tải dữ liệu giờ cao điểm\n- Hành trình Onboarding & Xác thực: Đơn giản hóa các bước nhận diện\n- Đội ngũ CSKH & MB247: Tăng tốc độ phản hồi tin nhắn hỗ trợ`}

3. Tiếng nói khách hàng thực tế:
- "Giao diện mới rất đẹp và mượt mà, chuyển tiền nhanh chóng không bị lỗi!" (Đánh giá 5 sao)
- "Cần cải thiện tốc độ vào ứng dụng lúc đầu giờ sáng, đôi khi bị báo lỗi kết nối." (Đánh giá 2 sao)

4. Đề xuất giải pháp & Lộ trình hành động:
- Khắc phục triệt để lỗi kết nối và nâng cấp dung lượng máy chủ trong 2 tuần tới
- Cập nhật giao diện tinh gọn cho luồng chuyển tiền và thanh toán hóa đơn
- Định kỳ đo lường chỉ số NPS sau mỗi bản cập nhật phiên bản mới`;

  if (slideContentInput) slideContentInput.value = generatedContent;
  if (slideDeckTitle) slideDeckTitle.value = `Báo Cáo Phân Tích Trải Nghiệm Khách Hàng: ${appName}`;
  if (slideDeckSubtitle) slideDeckSubtitle.value = `Tổng hợp ${totalRev} phản hồi thực tế & Giải pháp nâng tầm dịch vụ`;

  switchSourceTab('text');
  showToast(`Đã nhập dữ liệu đánh giá của ${appName} vào trình soạn thảo!`, 'success');
}

// ============================================
// Slide Synthesizer AI Logic
// ============================================
if (btnGenerateSlides) {
  btnGenerateSlides.addEventListener('click', async () => {
    const rawText = (slideContentInput ? slideContentInput.value : '').trim();
    if (!rawText && !attachedDocFiles.length && !lastParsedDocData) {
      // Auto-load review_report template if completely empty
      if (slideContentInput) slideContentInput.value = PROMPT_TEMPLATES.review_report;
    }

    const title = (slideDeckTitle ? slideDeckTitle.value : '').trim() || (lastParsedDocData && lastParsedDocData.detectedTitle) || 'Báo Cáo Chiến Lược Trải Nghiệm Khách Hàng';
    const subtitle = (slideDeckSubtitle ? slideDeckSubtitle.value : '').trim() || (lastParsedDocData && lastParsedDocData.detectedSubtitle) || 'Phân tích dữ liệu thực tế & Lộ trình hành động bứt phá';
    const audience = (slideAudience ? slideAudience.value : 'board');
    const slideCountPref = (slideCountSelect ? slideCountSelect.value : 'auto');
    const themeStyle = (slideThemeStyle ? slideThemeStyle.value : 'modern');

    btnGenerateSlides.disabled = true;
    if (slideProgressSection) slideProgressSection.style.display = 'block';
    if (slideStudioSection) slideStudioSection.style.display = 'none';

    // Step 1: Parse
    setSlideProgress(25, 'Đang phân tích cấu trúc tài liệu và trích xuất ý chính...', 'stepParse');
    await new Promise(r => setTimeout(r, 450));

    // Step 2: Brand
    setSlideProgress(55, `Đang áp dụng bảng màu và font chữ ${brandKit.headingFont}...`, 'stepBrand');
    await new Promise(r => setTimeout(r, 400));

    // Step 3: Layouts
    setSlideProgress(85, 'Đang phân bổ các bố cục: KPIs, Cards, Chart, Timeline...', 'stepLayout');
    await new Promise(r => setTimeout(r, 450));

    // Synthesize Deck
    const contentToUse = slideContentInput ? slideContentInput.value : rawText;
    currentDeck = synthesizeSlideDeck(contentToUse, title, subtitle, audience, slideCountPref, themeStyle, lastParsedDocData);

    // Step 4: Done
    setSlideProgress(100, 'Đã hoàn tất bài thuyết trình!', 'stepDone');
    await new Promise(r => setTimeout(r, 300));

    if (slideProgressSection) slideProgressSection.style.display = 'none';
    btnGenerateSlides.disabled = false;

    if (slideStudioSection) {
      slideStudioSection.style.display = 'flex';
      currentSlideIndex = 0;
      renderCurrentSlide();
      renderSlideThumbnails();
      slideStudioSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast('Đã tạo bài thuyết trình thành công! Bạn có thể xem trước, chỉnh sửa và tải file PowerPoint.', 'success');
    }
  });
}

function setSlideProgress(percent, text, activeStepId) {
  if (slideProgressBar) slideProgressBar.style.width = `${percent}%`;
  if (slideProgressText) slideProgressText.textContent = text;

  [stepParse, stepBrand, stepLayout, stepDone].forEach(stepEl => {
    if (stepEl) {
      if (stepEl.id === activeStepId) {
        stepEl.classList.add('active');
        stepEl.classList.remove('done');
      } else if (percent === 100) {
        stepEl.classList.add('done');
        stepEl.classList.remove('active');
      }
    }
  });
}

function toAsciiFilename(str) {
  if (!str) return `Bao_Cao_${Date.now()}.pptx`;
  const noAccents = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  return noAccents.endsWith('.pptx') ? noAccents : `${noAccents}.pptx`;
}

function toOfficeSafeFont(fontName, defaultFont = 'Calibri') {
  if (!fontName) return defaultFont;
  const name = fontName.trim().toLowerCase();
  if (name.includes('calibri')) return 'Calibri';
  if (name.includes('arial')) return 'Arial';
  if (name.includes('segoe')) return 'Segoe UI';
  if (name.includes('tahoma')) return 'Tahoma';
  if (name.includes('verdana')) return 'Verdana';
  if (name.includes('times')) return 'Times New Roman';
  if (name.includes('trebuchet')) return 'Trebuchet MS';
  if (name.includes('georgia')) return 'Georgia';
  if (name.includes('montserrat') || name.includes('poppins') || name.includes('outfit')) return 'Segoe UI';
  if (name.includes('inter') || name.includes('roboto') || name.includes('open sans') || name.includes('helvetica')) return 'Calibri';
  return defaultFont;
}

function refineSectionBullets(lines) {
  if (!lines || !lines.length) return ['Nội dung chi tiết ghi nhận từ tài liệu báo cáo'];

  const cleaned = lines.map(l => {
    return l.replace(/^[\s•\-\*\+\>\–\—\t]+/, '')
      .replace(/^(\d{1,2}|[a-zA-Z])[\.\)]\s+/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }).filter(l => l.length > 0);

  if (!cleaned.length) return ['Nội dung chi tiết ghi nhận từ tài liệu báo cáo'];

  // Check if we have fragmented tokens (e.g. many short lines <= 25 chars)
  const isFragmented = cleaned.length >= 4 && cleaned.filter(l => l.length <= 25).length >= cleaned.length * 0.6;
  if (!isFragmented) {
    return cleaned.slice(0, 5);
  }

  const merged = [];
  let currentTitle = '';
  let currentDetails = [];

  for (let i = 0; i < cleaned.length; i++) {
    const item = cleaned[i];
    const isNumOrStat = /^\d+[\d,.]*(%|★| Tỷ| Tr| Triệu| Nghìn| k| request| ms| s)?$/i.test(item) || item.includes('%') || item.includes('tỷ') || item.includes('triệu') || item.includes('request');

    if (!isNumOrStat && item.length > 3 && !currentTitle) {
      currentTitle = item;
    } else if (isNumOrStat && currentTitle) {
      currentDetails.push(item);
    } else if (!isNumOrStat && currentTitle) {
      merged.push(currentDetails.length ? `${currentTitle}: ${currentDetails.join(' - ')}` : currentTitle);
      currentTitle = item;
      currentDetails = [];
    } else {
      currentDetails.push(item);
    }
  }
  if (currentTitle) {
    merged.push(currentDetails.length ? `${currentTitle}: ${currentDetails.join(' - ')}` : currentTitle);
  }

  return (merged.length ? merged : cleaned).slice(0, 5);
}

function findBestTemplateLayoutIndex(tmplLayouts, preferredType) {
  if (!tmplLayouts || !tmplLayouts.length) return 0;

  // 1. Direct match by layoutType
  const matchIdx = tmplLayouts.findIndex(l => l.layoutType === preferredType);
  if (matchIdx !== -1) return matchIdx;

  // 2. Structural fallbacks
  if (preferredType === 'cards2' || preferredType === 'cards4') {
    const cIdx = tmplLayouts.findIndex(l => l.layoutType === 'cards3' || l.layoutType === 'content');
    if (cIdx !== -1) return cIdx;
  }
  if (preferredType === 'table' || preferredType === 'action_plan') {
    const tIdx = tmplLayouts.findIndex(l => l.layoutType === 'content' || l.hasTable);
    if (tIdx !== -1) return tIdx;
  }
  if (preferredType === 'content') {
    const cIdx = tmplLayouts.findIndex(l => l.layoutType === 'cards2' || l.layoutType === 'cards3');
    if (cIdx !== -1) return cIdx;
  }

  // 3. Fallback to any content slide (non-cover, non-conclusion)
  const anyContent = tmplLayouts.findIndex((l, idx) => idx > 0 && idx < tmplLayouts.length - 1 && l.layoutType !== 'cover' && l.layoutType !== 'conclusion');
  if (anyContent !== -1) return anyContent;

  return 0;
}

function buildSlideDataForLayout(layoutType, slideIndex, sectionTitle, sectionLines, mainTitle, mainSubtitle, templateSlideIdx) {
  const lines = refineSectionBullets(sectionLines);
  const safeTitle = sectionTitle || `Nội Dung ${slideIndex + 1}`;

  if (layoutType === 'cover') {
    return {
      layout: 'cover',
      templateSlideIndex: typeof templateSlideIdx === 'number' ? templateSlideIdx : 0,
      badge: 'BÁO CÁO CHIẾN LƯỢC & QUẢN TRỊ',
      title: mainTitle,
      subtitle: mainSubtitle,
      presenter: brandKit.presenterName || 'Ban Quản Lý & Phát Triển',
      date: new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
      brandName: brandKit.brandName || 'Digital Enterprise'
    };
  }

  if (layoutType === 'conclusion') {
    return {
      layout: 'conclusion',
      templateSlideIndex: typeof templateSlideIdx === 'number' ? templateSlideIdx : 0,
      badge: 'KẾT LUẬN & ĐỒNG HÀNH',
      title: safeTitle.toLowerCase().includes('kết luận') || safeTitle.toLowerCase().includes('cảm ơn') ? safeTitle : 'Hướng Tới Trải Nghiệm Khách Hàng Xuất Sắc',
      subtitle: lines[0] || 'Cam kết không ngừng đổi mới, nâng cao chất lượng và lấy sự hài lòng của khách hàng làm trọng tâm.',
      contacts: [
        '📧 contact@enterprise.com',
        '🌐 www.enterprise.com',
        '📞 Hotline CSKH: 1900 xxxx'
      ]
    };
  }

  if (layoutType === 'agenda') {
    const items = lines.slice(0, 4).map((l, idx) => ({
      num: `0${idx + 1}`,
      title: l.split(/[:–-]/)[0].replace(/^[•\-\d.\s]+/, '').slice(0, 35) || `Nội dung ${idx + 1}`,
      desc: l.split(/[:–-]/)[1] ? l.split(/[:–-]/)[1].trim().slice(0, 80) : l.replace(/^[•\-\d.\s]+/, '').slice(0, 75)
    }));
    while (items.length < 4) {
      items.push({ num: `0${items.length + 1}`, title: `Trọng tâm ${items.length + 1}`, desc: 'Chi tiết phân tích trong phần báo cáo' });
    }
    return {
      layout: 'agenda',
      templateSlideIndex: typeof templateSlideIdx === 'number' ? templateSlideIdx : 1,
      badge: 'MỤC LỤC & TỔNG QUAN',
      title: safeTitle,
      subtitle: 'Khái quát các phần then chốt trong báo cáo',
      items
    };
  }

  if (layoutType === 'cards2') {
    const half = Math.ceil(lines.length / 2);
    const col1 = lines.slice(0, half);
    const col2 = lines.slice(half);
    return {
      layout: 'cards2',
      templateSlideIndex: templateSlideIdx,
      badge: 'ĐỐI CHIẾU & PHÂN TÍCH',
      title: safeTitle,
      subtitle: 'Chi tiết các phát hiện quan trọng theo 2 nhóm trọng tâm',
      cards: [
        { title: col1[0] ? col1[0].slice(0, 35) : 'Trọng tâm 1', bullets: col1.length ? col1 : ['Chi tiết nội dung phân tích'] },
        { title: col2[0] ? col2[0].slice(0, 35) : 'Trọng tâm 2', bullets: col2.length ? col2 : ['Chi tiết nội dung phân tích'] }
      ]
    };
  }

  if (layoutType === 'cards3') {
    const c1 = lines.slice(0, Math.ceil(lines.length / 3));
    const c2 = lines.slice(Math.ceil(lines.length / 3), Math.ceil(lines.length * 2 / 3));
    const c3 = lines.slice(Math.ceil(lines.length * 2 / 3));
    return {
      layout: 'cards3',
      templateSlideIndex: templateSlideIdx,
      badge: 'TRỤ CỘT PHÂN TÍCH',
      title: safeTitle,
      subtitle: 'Chi tiết 3 nhóm nội dung trọng tâm',
      cards: [
        { num: '1', title: c1[0] ? c1[0].slice(0, 30) : 'Trọng tâm 1', bullets: c1.length ? c1 : ['Chi tiết nội dung'] },
        { num: '2', title: c2[0] ? c2[0].slice(0, 30) : 'Trọng tâm 2', bullets: c2.length ? c2 : ['Chi tiết nội dung'] },
        { num: '3', title: c3[0] ? c3[0].slice(0, 30) : 'Trọng tâm 3', bullets: c3.length ? c3 : ['Chi tiết nội dung'] }
      ]
    };
  }

  if (layoutType === 'cards4') {
    const q = Math.max(1, Math.ceil(lines.length / 4));
    const c1 = lines.slice(0, q);
    const c2 = lines.slice(q, q * 2);
    const c3 = lines.slice(q * 2, q * 3);
    const c4 = lines.slice(q * 3);
    return {
      layout: 'cards4',
      templateSlideIndex: templateSlideIdx,
      badge: '4 NHÓM TRỌNG TÂM',
      title: safeTitle,
      subtitle: 'Phân bổ nội dung theo 4 khối độc lập',
      cards: [
        { title: c1[0] ? c1[0].slice(0, 25) : 'Khối 1', bullets: c1.length ? c1 : ['Chi tiết'] },
        { title: c2[0] ? c2[0].slice(0, 25) : 'Khối 2', bullets: c2.length ? c2 : ['Chi tiết'] },
        { title: c3[0] ? c3[0].slice(0, 25) : 'Khối 3', bullets: c3.length ? c3 : ['Chi tiết'] },
        { title: c4[0] ? c4[0].slice(0, 25) : 'Khối 4', bullets: c4.length ? c4 : ['Chi tiết'] }
      ]
    };
  }

  if (layoutType === 'table') {
    const rows = lines.map(l => {
      const parts = l.split(/[:|–-]/).map(p => p.trim());
      if (parts.length >= 3) return parts.slice(0, 4);
      if (parts.length === 2) return [parts[0], parts[1], 'Đạt yêu cầu', 'Duy trì theo dõi'];
      return [l.slice(0, 35), 'Dữ liệu ghi nhận từ hệ thống', 'Ổn định', 'Tiếp tục phát huy'];
    });
    return {
      layout: 'table',
      templateSlideIndex: templateSlideIdx,
      badge: 'BẢNG BIỂU & DỮ LIỆU',
      title: safeTitle,
      subtitle: 'Thống kê chi tiết dưới dạng bảng cấu trúc',
      table: {
        headers: ['Hạng mục / Tiêu chí', 'Nội dung thực tế', 'Hiện trạng', 'Đề xuất'],
        rows: rows.slice(0, 5)
      }
    };
  }

  if (layoutType === 'kpis') {
    const stats = [];
    lines.forEach((line, lIdx) => {
      if (stats.length >= 3) return;
      const numMatch = line.match(/\d+[\d,.]*(%|★| Tỷ| Tr| Triệu| Nghìn| k)?/i);
      if (numMatch) {
        stats.push({
          val: numMatch[0],
          label: line.replace(numMatch[0], '').replace(/^[:\-\s]+/, '').slice(0, 35) || `Chỉ số ${stats.length + 1}`,
          sub: 'Dữ liệu vận hành thực tế'
        });
      }
    });
    while (stats.length < 3) {
      stats.push({ val: stats.length === 0 ? '99.9%' : (stats.length === 1 ? '4.8★' : '100%'), label: `Chỉ số trọng tâm ${stats.length + 1}`, sub: 'Mục tiêu chất lượng dịch vụ' });
    }
    return {
      layout: 'kpis',
      templateSlideIndex: templateSlideIdx,
      badge: 'CHỈ SỐ TRỌNG YẾU',
      title: safeTitle,
      subtitle: 'Tổng hợp các số liệu thống kê chi tiết',
      stats
    };
  }

  if (layoutType === 'timeline') {
    const steps = lines.slice(0, 4).map((l, sIdx) => ({
      num: `0${sIdx + 1}`,
      title: l.split(/[:–-]/)[0].slice(0, 25) || `Giai đoạn ${sIdx + 1}`,
      desc: l.split(/[:–-]/)[1] ? l.split(/[:–-]/)[1].trim().slice(0, 60) : l.slice(0, 60)
    }));
    while (steps.length < 3) {
      steps.push({ num: `0${steps.length + 1}`, title: `Giai đoạn ${steps.length + 1}`, desc: 'Triển khai và đo lường' });
    }
    return {
      layout: 'timeline',
      templateSlideIndex: templateSlideIdx,
      badge: 'LỘ TRÌNH THỰC THI',
      title: safeTitle,
      subtitle: 'Kế hoạch hành động từng bước cụ thể',
      steps
    };
  }

  if (layoutType === 'quotes') {
    const quotes = lines.slice(0, 2).map((l, qIdx) => ({
      stars: '★★★★★',
      text: l.replace(/^["'•\-\s]+|["'\s]+$/g, ''),
      author: `Khách hàng / Người dùng tiêu biểu • Phản hồi #${qIdx + 1}`
    }));
    while (quotes.length < 2) {
      quotes.push({ stars: '★★★★★', text: 'Ứng dụng chạy tốt, mang lại trải nghiệm tiện ích!', author: 'Khách hàng thân thiết' });
    }
    return {
      layout: 'quotes',
      templateSlideIndex: templateSlideIdx,
      badge: 'TIẾNG NÓI NGƯỜI DÙNG',
      title: safeTitle,
      subtitle: 'Lắng nghe phản hồi thực tế từ khách hàng',
      quotes
    };
  }

  if (layoutType === 'action_plan') {
    const actions = lines.slice(0, 4).map((l, aIdx) => ({
      prio: aIdx === 0 ? 'high' : (aIdx === 1 ? 'med' : 'low'),
      task: l.slice(0, 45),
      owner: 'Ban Quản Lý & Đơn Vị Phụ Trách',
      deadline: `Giai đoạn ${aIdx + 1}`
    }));
    return {
      layout: 'action_plan',
      templateSlideIndex: templateSlideIdx,
      badge: 'KẾ HOẠCH HÀNH ĐỘNG',
      title: safeTitle,
      subtitle: 'Danh mục nhiệm vụ trọng tâm kèm phân bổ nguồn lực',
      actions
    };
  }

  // Default: Standard clean single-column bullet list
  return {
    layout: 'content',
    templateSlideIndex: templateSlideIdx,
    badge: 'NỘI DUNG CHI TIẾT',
    title: safeTitle,
    subtitle: 'Các luận điểm và phát hiện trọng tâm',
    bullets: lines
  };
}

function synthesizeSlideDeck(text, mainTitle, mainSubtitle, audience, slideCountPref, themeStyle, parsedDoc) {
  const slides = [];
  const tmplLayouts = (currentUploadedTemplate && currentUploadedTemplate.recognizedLayouts) ? currentUploadedTemplate.recognizedLayouts : [];

  // 1. Prepare Content Sections
  let contentSections = [];
  if (parsedDoc && parsedDoc.slides && parsedDoc.slides.length > 1) {
    // The first doc slide is cover/header, rest are body sections
    contentSections = parsedDoc.slides.slice(1).map((ds, idx) => ({
      title: ds.title || `Nội Dung ${idx + 1}`,
      lines: ds.content || []
    }));
  } else {
    // Parse from text paragraphs
    const rawBlocks = text.split(/\n\s*\n|\n(?=\d+\.|\-\-\-)/).filter(Boolean);
    contentSections = rawBlocks.map((blk, idx) => {
      const blkLines = blk.split('\n').map(l => l.trim()).filter(Boolean);
      return {
        title: blkLines[0] ? blkLines[0].replace(/^[\d.\-#\s]+/, '') : `Trọng Tâm ${idx + 1}`,
        lines: blkLines.slice(1).length ? blkLines.slice(1) : blkLines
      };
    });
  }

  // 2. Determine natural target slide count
  let targetTotal = 7;
  if (slideCountPref === '5') targetTotal = 5;
  else if (slideCountPref === '8') targetTotal = 8;
  else if (slideCountPref === '10') targetTotal = 10;
  else if (slideCountPref === '12') targetTotal = 12;
  else {
    // 'auto' mode: match natural size of document!
    const naturalBodyCount = Math.max(3, Math.min(8, contentSections.length));
    targetTotal = naturalBodyCount + 2; // 1 Cover + Body + 1 Conclusion
  }

  // Slide 1: Cover Slide
  const coverTmplIdx = findBestTemplateLayoutIndex(tmplLayouts, 'cover');
  const coverSlide = buildSlideDataForLayout('cover', 0, mainTitle, [], mainTitle, mainSubtitle, coverTmplIdx);
  coverSlide.id = 1;
  slides.push(coverSlide);

  // Slide 2: Agenda (if we have >= 5 total slides)
  if (targetTotal >= 5 && contentSections.length >= 3) {
    const agendaTmplIdx = findBestTemplateLayoutIndex(tmplLayouts, 'agenda');
    const agendaSummaryLines = contentSections.slice(0, 4).map((s, idx) => `${s.title}: ${(s.lines && s.lines[0]) ? s.lines[0].slice(0, 60) : 'Chi tiết nội dung'}`);
    const agendaSlide = buildSlideDataForLayout('agenda', 1, 'Mục Lục & Nội Dung Trọng Tâm', agendaSummaryLines, mainTitle, mainSubtitle, agendaTmplIdx);
    agendaSlide.id = 2;
    slides.push(agendaSlide);
  }

  // Body Slides: Fill from actual content sections
  const availableBodySlots = Math.max(1, targetTotal - slides.length - 1);
  const selectedSections = contentSections.slice(0, availableBodySlots);

  selectedSections.forEach((sec, idx) => {
    const slideTitle = sec.title || `Trọng Tâm ${idx + 1}`;
    const lines = sec.lines || [];
    const joinedText = lines.join(' ');

    // Determine best layout based on content nature
    const hasNumbers = (joinedText.match(/\d+(\.\d+)?%/) || joinedText.includes('★') || joinedText.includes('Điểm')) && lines.length <= 5;
    const isTimeline = slideTitle.toLowerCase().includes('lộ trình') || slideTitle.toLowerCase().includes('kế hoạch') || slideTitle.toLowerCase().includes('roadmap') || slideTitle.toLowerCase().includes('giai đoạn');
    const isQuote = slideTitle.toLowerCase().includes('tiếng nói') || slideTitle.toLowerCase().includes('phản hồi') || joinedText.includes('"') || joinedText.includes('đánh giá 5 sao');
    const isAction = slideTitle.toLowerCase().includes('hành động') || slideTitle.toLowerCase().includes('nhiệm vụ') || slideTitle.toLowerCase().includes('ma trận');
    const is2Col = slideTitle.toLowerCase().includes('so sánh') || slideTitle.toLowerCase().includes('2 cột');
    const isTable = slideTitle.toLowerCase().includes('bảng') || slideTitle.toLowerCase().includes('thống kê') || lines.some(l => l.includes(':') && l.includes('|'));

    let targetLayout = 'content';
    if (hasNumbers) targetLayout = 'kpis';
    else if (isTimeline) targetLayout = 'timeline';
    else if (isQuote) targetLayout = 'quotes';
    else if (isAction) targetLayout = 'action_plan';
    else if (isTable) targetLayout = 'table';
    else if (is2Col) targetLayout = 'cards2';
    else if (lines.length >= 6) targetLayout = 'content';
    else targetLayout = 'content';

    const tmplIdx = findBestTemplateLayoutIndex(tmplLayouts, targetLayout);
    const sData = buildSlideDataForLayout(targetLayout, slides.length, slideTitle, lines, mainTitle, mainSubtitle, tmplIdx);
    sData.id = slides.length + 1;
    slides.push(sData);
  });

  // Final Slide: Conclusion Slide
  const conclusionTmplIdx = findBestTemplateLayoutIndex(tmplLayouts, 'conclusion');
  const conclusionSlide = buildSlideDataForLayout('conclusion', slides.length, 'Hướng Tới Trải Nghiệm Khách Hàng Xuất Sắc', [], mainTitle, mainSubtitle, conclusionTmplIdx);
  conclusionSlide.id = slides.length + 1;
  slides.push(conclusionSlide);

  // Update filenames
  const safeTitle = mainTitle.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_').slice(0, 35);
  const nowStr = new Date().toISOString().split('T')[0];
  if (exportDeckFilename) exportDeckFilename.textContent = `Bao_Cao_${safeTitle}_${nowStr}.pptx`;

  return {
    title: mainTitle,
    subtitle: mainSubtitle,
    slides,
    audience,
    themeStyle,
    templateId: currentUploadedTemplate ? currentUploadedTemplate.templateId : null,
    generatedAt: new Date().toISOString()
  };
}

// ============================================
// Interactive Slide Studio Renderer
// ============================================
function renderCurrentSlide() {
  if (!currentDeck || !currentDeck.slides || !currentDeck.slides.length) return;

  if (currentSlideIndex < 0) currentSlideIndex = 0;
  if (currentSlideIndex >= currentDeck.slides.length) currentSlideIndex = currentDeck.slides.length - 1;

  const slide = currentDeck.slides[currentSlideIndex];
  if (!slide) return;

  if (currentSlideIndexLabel) currentSlideIndexLabel.textContent = `Slide ${currentSlideIndex + 1}`;
  if (totalSlidesCountLabel) totalSlidesCountLabel.textContent = currentDeck.slides.length;
  if (selectCurrentSlideLayout) selectCurrentSlideLayout.value = slide.layout;

  // Apply Brandkit Styles to Canvas
  slideCanvas.style.backgroundColor = brandKit.bgColor;
  slideCanvas.style.color = brandKit.textColor;
  slideCanvas.style.fontFamily = `'${brandKit.bodyFont}', sans-serif`;

  let html = '';

  // Render Inner Header (For non-cover and non-conclusion slides)
  const showHeader = slide.layout !== 'cover' && slide.layout !== 'conclusion';
  let headerHtml = '';
  if (showHeader) {
    headerHtml = `
      <div class="slide-inner-header">
        ${slide.badge ? `<span class="slide-inner-badge" style="background: ${brandKit.primaryColor}25; color: ${brandKit.secondaryColor}; border: 1px solid ${brandKit.secondaryColor}40;">${escapeHtml(slide.badge)}</span>` : ''}
        <h3 class="slide-inner-title" contenteditable="true" data-field="title" style="font-family: '${brandKit.headingFont}', sans-serif; color: ${brandKit.textColor};">${escapeHtml(slide.title || '')}</h3>
        ${slide.subtitle ? `<p class="slide-inner-subtitle" contenteditable="true" data-field="subtitle" style="color: ${brandKit.textColor}bb;">${escapeHtml(slide.subtitle)}</p>` : ''}
      </div>
    `;
  }

  // Render Layout Content
  let bodyHtml = '';
  if (slide.layout === 'cover') {
    bodyHtml = `
      <div class="slide-layout-cover">
        <div class="cover-decor-shape" style="background: linear-gradient(135deg, ${brandKit.primaryColor}, ${brandKit.secondaryColor});"></div>
        ${brandKit.logoDataUrl && (brandKit.logoPosition === 'cover-only' || brandKit.logoPosition === 'top-right' || brandKit.logoPosition === 'top-left') ? `
          <img src="${brandKit.logoDataUrl}" class="slide-inner-logo-img" style="margin-bottom: 20px; max-height: 42px;" alt="Logo" />
        ` : ''}
        <div class="cover-brand-badge" style="background: ${brandKit.primaryColor}30; color: ${brandKit.secondaryColor}; border: 1px solid ${brandKit.secondaryColor}50;">
          ★ ${escapeHtml(slide.badge || 'BÁO CÁO CHIẾN LƯỢC')}
        </div>
        <h1 class="cover-main-title" contenteditable="true" data-field="title" style="font-family: '${brandKit.headingFont}', sans-serif; color: ${brandKit.textColor};">${escapeHtml(slide.title || '')}</h1>
        <p class="cover-main-subtitle" contenteditable="true" data-field="subtitle" style="color: ${brandKit.textColor}cc;">${escapeHtml(slide.subtitle || '')}</p>
        <div class="cover-meta-row" style="border-top-color: ${brandKit.textColor}25;">
          <span>👤 <strong>${escapeHtml(slide.presenter || brandKit.presenterName)}</strong></span>
          <span>📅 ${escapeHtml(slide.date || '2026')}</span>
          <span>🏢 ${escapeHtml(slide.brandName || brandKit.brandName)}</span>
        </div>
      </div>
    `;
  } else if (slide.layout === 'agenda') {
    bodyHtml = `
      <div class="slide-layout-agenda">
        <div class="agenda-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
          ${(slide.items || []).map((it, idx) => `
            <div class="agenda-card" style="background: rgba(255,255,255,0.04); border: 1px solid ${brandKit.primaryColor}30; border-radius: 10px; padding: 14px; display: flex; gap: 12px; align-items: flex-start;">
              <span style="font-size: 1.1rem; font-weight: 900; color: ${brandKit.accentColor}; font-family: '${brandKit.headingFont}'; line-height: 1;">${it.num}</span>
              <div>
                <h4 style="font-size: 0.92rem; font-weight: 700; color: ${brandKit.textColor}; margin-bottom: 4px;">${escapeHtml(it.title)}</h4>
                <p style="font-size: 0.78rem; opacity: 0.8; line-height: 1.35;">${escapeHtml(it.desc)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'kpis') {
    bodyHtml = `
      <div class="slide-layout-kpis">
        <div class="kpis-grid">
          ${(slide.stats || []).map(st => `
            <div class="kpi-stat-card" style="border-color: ${brandKit.primaryColor}40; background: linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);">
              <div class="kpi-stat-val" style="color: ${brandKit.accentColor}; font-family: '${brandKit.headingFont}';">${escapeHtml(st.val)}</div>
              <div class="kpi-stat-label" style="color: ${brandKit.textColor};">${escapeHtml(st.label)}</div>
              <div class="kpi-stat-sub" style="color: ${brandKit.secondaryColor};">${escapeHtml(st.sub)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'cards3') {
    bodyHtml = `
      <div class="slide-layout-cards3">
        <div class="cards-column-grid">
          ${(slide.cards || []).map(cd => `
            <div class="column-pillar-card" style="border-top: 3px solid ${brandKit.primaryColor};">
              <div class="pillar-card-header">
                <span class="pillar-card-num" style="background: ${brandKit.primaryColor};">${cd.num || '★'}</span>
                <span class="pillar-card-title" style="font-family: '${brandKit.headingFont}'; color: ${brandKit.textColor};">${escapeHtml(cd.title)}</span>
              </div>
              <ul class="pillar-card-bullets">
                ${(cd.bullets || []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'cards2') {
    bodyHtml = `
      <div class="slide-layout-cards2">
        <div class="cards-2col-grid">
          ${(slide.cards || []).map(cd => `
            <div class="col2-card" style="border-left: 4px solid ${brandKit.secondaryColor};">
              <div class="col2-card-title" style="font-family: '${brandKit.headingFont}'; color: ${brandKit.textColor};">
                <span>📌</span> ${escapeHtml(cd.title)}
              </div>
              <ul class="col2-card-bullets">
                ${(cd.bullets || []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'cards4') {
    bodyHtml = `
      <div class="slide-layout-cards4">
        <div class="cards-4col-grid">
          ${(slide.cards || []).map(cd => `
            <div class="col4-card" style="border-top: 3px solid ${brandKit.secondaryColor};">
              <div class="col4-card-title" style="font-family: '${brandKit.headingFont}'; color: ${brandKit.textColor};">${escapeHtml(cd.title)}</div>
              <ul class="col4-card-bullets">
                ${(cd.bullets || []).map(b => `<li>${escapeHtml(b)}</li>`).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'content') {
    const bullets = slide.bullets || (slide.cards ? slide.cards.flatMap(c => c.bullets || [c.title]) : (slide.items ? slide.items.map(i => `${i.title}: ${i.desc}`) : ['Nội dung chi tiết']));
    bodyHtml = `
      <div class="slide-layout-content">
        <div class="content-bullets-card" style="border-left: 4px solid ${brandKit.primaryColor};">
          <ul class="content-bullets-list">
            ${bullets.map(b => `
              <li>
                <span style="color: ${brandKit.textColor}; font-family: '${brandKit.bodyFont}';">${escapeHtml(b)}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
  } else if (slide.layout === 'table') {
    const headers = (slide.table && slide.table.headers) || ['Hạng mục / Tiêu chí', 'Nội dung thực tế', 'Hiện trạng', 'Đề xuất'];
    const rows = (slide.table && slide.table.rows) || [
      ['Hiệu năng hệ thống', '99.91% ổn định', 'Tốt', 'Duy trì giám sát 24/7'],
      ['Trải nghiệm người dùng', 'Giao diện mới mượt mà', 'Rất tốt', 'Tối ưu luồng chuyển tiền'],
      ['Hỗ trợ CSKH', 'Tỷ lệ giải quyết 98%', 'Đạt yêu cầu', 'Mở rộng kênh MB247']
    ];
    bodyHtml = `
      <div class="slide-layout-table">
        <div class="slide-table-wrapper">
          <table class="slide-native-table">
            <thead>
              <tr style="background: ${brandKit.primaryColor}30; color: ${brandKit.textColor};">
                ${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  ${(Array.isArray(r) ? r : [r]).map((c, cIdx) => `
                    <td style="color: ${cIdx === 0 ? brandKit.secondaryColor : brandKit.textColor}; font-weight: ${cIdx === 0 ? '700' : '400'};">
                      ${escapeHtml(String(c))}
                    </td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (slide.layout === 'chart') {
    const cd = slide.chartData || { labels: ['A', 'B', 'C'], values: [60, 25, 15] };
    bodyHtml = `
      <div class="slide-layout-chart">
        <div class="chart-slide-container">
          <div class="chart-bars-box" style="border-color: ${brandKit.primaryColor}30;">
            <h5 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 6px; color: ${brandKit.secondaryColor};">📊 Tỷ lệ phân bố số liệu</h5>
            ${cd.labels.map((lbl, i) => `
              <div class="chart-bar-row">
                <div class="chart-bar-header">
                  <span>${escapeHtml(lbl)}</span>
                  <span style="font-weight: 800; color: #${cd.colors ? cd.colors[i] : '10b981'};">${cd.values[i]}%</span>
                </div>
                <div class="chart-bar-track">
                  <div class="chart-bar-fill" style="width: ${cd.values[i]}%; background: #${cd.colors ? cd.colors[i] : '10b981'};"></div>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="chart-insights-box">
            ${(slide.insights || []).map(ins => `
              <div class="insight-item" style="border-left-color: ${brandKit.accentColor};">
                <p>${escapeHtml(ins)}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  } else if (slide.layout === 'timeline') {
    bodyHtml = `
      <div class="slide-layout-timeline">
        <div class="timeline-horizontal">
          ${(slide.steps || []).map(st => `
            <div class="timeline-step-node">
              <div class="timeline-step-circle" style="background: ${brandKit.primaryColor}; border-color: ${brandKit.bgColor};">${st.num}</div>
              <div class="timeline-step-card" style="border-color: ${brandKit.primaryColor}30;">
                <h5 style="color: ${brandKit.textColor}; font-family: '${brandKit.headingFont}';">${escapeHtml(st.title)}</h5>
                <p>${escapeHtml(st.desc)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'quotes') {
    bodyHtml = `
      <div class="slide-layout-quotes">
        <div class="quotes-grid">
          ${(slide.quotes || []).map(q => `
            <div class="quote-card" style="border-color: ${brandKit.secondaryColor}30; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%);">
              <div class="quote-stars">${escapeHtml(q.stars)}</div>
              <div class="quote-text">"${escapeHtml(q.text)}"</div>
              <div class="quote-author" style="color: ${brandKit.secondaryColor};">${escapeHtml(q.author)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'action_plan') {
    bodyHtml = `
      <div class="slide-layout-action">
        <div class="action-table-container">
          <div class="action-row action-head" style="background: ${brandKit.primaryColor}30; color: ${brandKit.textColor};">
            <div>Mức độ</div>
            <div>Nhiệm vụ / Đầu việc</div>
            <div>Phụ trách</div>
            <div style="text-align: right;">Thời hạn</div>
          </div>
          ${(slide.actions || []).map(act => `
            <div class="action-row">
              <div>
                <span class="${act.prio === 'high' ? 'badge-prio-high' : act.prio === 'med' ? 'badge-prio-med' : 'badge-prio-low'}">
                  ${act.prio === 'high' ? 'Cao' : act.prio === 'med' ? 'Trung' : 'Thấp'}
                </span>
              </div>
              <div style="font-weight: 600; color: ${brandKit.textColor};">${escapeHtml(act.task)}</div>
              <div style="opacity: 0.85;">${escapeHtml(act.owner)}</div>
              <div style="text-align: right; color: ${brandKit.secondaryColor}; font-weight: 600;">${escapeHtml(act.deadline)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'conclusion') {
    bodyHtml = `
      <div class="slide-layout-conclusion">
        ${brandKit.logoDataUrl ? `<img src="${brandKit.logoDataUrl}" class="slide-inner-logo-img" style="margin-bottom: 16px; max-height: 40px;" alt="Logo" />` : ''}
        <h2 class="conclusion-title" contenteditable="true" data-field="title" style="font-family: '${brandKit.headingFont}'; color: ${brandKit.textColor};">${escapeHtml(slide.title || 'Xin Cảm Ơn!')}</h2>
        <p class="conclusion-desc" contenteditable="true" data-field="subtitle" style="color: ${brandKit.textColor}cc;">${escapeHtml(slide.subtitle || '')}</p>
        <div class="conclusion-contact-chips">
          ${(slide.contacts || []).map(c => `
            <div class="contact-chip" style="border-color: ${brandKit.primaryColor}50; background: ${brandKit.primaryColor}20; color: ${brandKit.textColor};">${escapeHtml(c)}</div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'cover_light' || slide.layout === 'cover_gradient') {
    const isDark = slide.layout === 'cover_gradient';
    const bgCol = isDark ? '#171EDB' : '#FFFFFF';
    const textCol = isDark ? '#FFFFFF' : '#081235';
    bodyHtml = `
      <div class="slide-layout-cover" style="background: ${bgCol}; color: ${textCol}; height: 100%; border-radius: 12px; padding: 36px 40px; position: relative;">
        <div style="font-size: 0.95rem; font-weight: 800; color: ${isDark ? '#F50912' : '#171EDB'}; margin-bottom: 12px; letter-spacing: 0.05em;">★ MB FINANCE & BANKING PRESENTATION</div>
        <h1 class="cover-main-title" contenteditable="true" data-field="title" style="font-family: '${brandKit.headingFont}', sans-serif; color: ${textCol}; font-size: 2.2rem; margin-bottom: 12px;">${escapeHtml(slide.title || '')}</h1>
        <p class="cover-main-subtitle" contenteditable="true" data-field="subtitle" style="color: ${textCol}cc; font-size: 1.15rem; margin-bottom: 24px;">${escapeHtml(slide.subtitle || '')}</p>
        ${slide.message ? `<div style="padding: 12px 18px; background: rgba(255,255,255,0.12); border-left: 4px solid #F50912; border-radius: 6px; font-size: 0.95rem; max-width: 650px;">${escapeHtml(slide.message)}</div>` : ''}
        <div class="cover-meta-row" style="position: absolute; bottom: 25px; left: 40px; right: 40px; border-top: 1px solid ${textCol}25; padding-top: 12px; display: flex; justify-content: space-between; font-size: 0.85rem; opacity: 0.85;">
          <span>🏢 <strong>Ngân hàng TMCP Quân Đội (MB)</strong></span>
          <span>📅 ${new Date().getFullYear()}</span>
          <span>🔒 Confidential / Bảo Mật</span>
        </div>
      </div>
    `;
  } else if (slide.layout === 'executive_summary') {
    const cards = slide.cards || [
      { no: '01', title: 'BỐI CẢNH & TỔNG QUAN', body: 'Quy mô tài sản và các chỉ tiêu kinh doanh tăng trưởng bền vững.' },
      { no: '02', title: 'TÁC ĐỘNG CHIẾN LƯỢC', body: 'Tối ưu hóa chi phí vốn CASA và mở rộng hệ sinh thái khách hàng số.' },
      { no: '03', title: 'HÀNH ĐỘNG & KHUYẾN NGHỊ', body: 'Tập trung các mốc tiến độ then chốt và kiểm soát an toàn vốn.' }
    ];
    bodyHtml = `
      <div class="slide-layout-exec" style="display: flex; flex-direction: column; gap: 14px; height: 100%;">
        ${slide.message ? `
          <div style="background: rgba(23,30,219,0.1); border-left: 4px solid #171EDB; border-radius: 8px; padding: 12px 16px;">
            <h4 style="color: #171EDB; font-size: 1.05rem; font-weight: 800; margin-bottom: 2px;">${escapeHtml(slide.message)}</h4>
            <p style="font-size: 0.82rem; opacity: 0.85;">Tóm tắt thông điệp cốt lõi dành cho Hội đồng Quản trị & Ban Tổng Giám đốc</p>
          </div>
        ` : ''}
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; flex: 1;">
          ${cards.map((c, i) => `
            <div style="background: rgba(255,255,255,0.04); border: 1px solid ${brandKit.primaryColor}30; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <span style="font-size: 1.3rem; font-weight: 900; color: ${i === 2 ? '#F50912' : '#171EDB'}; font-family: '${brandKit.headingFont}';">${c.no || ('0' + (i+1))}</span>
                <h4 style="font-size: 0.95rem; font-weight: 700; color: ${brandKit.textColor}; margin: 6px 0 8px 0;">${escapeHtml(c.title)}</h4>
                <p style="font-size: 0.82rem; line-height: 1.45; opacity: 0.85;">${escapeHtml(c.body)}</p>
              </div>
              <div style="height: 3px; background: ${i === 2 ? '#F50912' : '#171EDB'}; width: 45px; margin-top: 10px; border-radius: 2px;"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  } else if (slide.layout === 'pnl_bridge' || slide.layout === 'financial_dashboard' || slide.layout === 'balance_sheet' || slide.layout === 'cash_flow') {
    bodyHtml = `
      <div class="slide-layout-finance" style="display: flex; flex-direction: column; gap: 14px; height: 100%;">
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
          ${(slide.kpis || [
            { label: 'TỔNG THU NHẬP (TOI)', value: '48,250 TỶ', delta: '+16.8% YoY', tone: 'green' },
            { label: 'THU NHẬP LÃI THUẦN (NII)', value: '36,800 TỶ', delta: '+14.2% YoY', tone: 'blue' },
            { label: 'LỢI NHUẬN TRƯỚC THUẾ', value: '24,560 TỶ', delta: '+18.5% YoY', tone: 'green' },
            { label: 'TỶ LỆ CASA', value: '41.2%', delta: '+1.5% Top 1', tone: 'yellow' }
          ]).map(k => `
            <div style="background: rgba(255,255,255,0.05); border: 1px solid ${brandKit.primaryColor}30; border-radius: 8px; padding: 10px 12px;">
              <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-muted);">${escapeHtml(k.label)}</div>
              <div style="font-size: 1.25rem; font-weight: 900; color: ${brandKit.textColor}; font-family: '${brandKit.headingFont}'; margin: 2px 0;">${escapeHtml(k.value)}</div>
              <div style="font-size: 0.72rem; font-weight: 700; color: ${k.tone === 'green' ? '#10b981' : k.tone === 'red' ? '#ef4444' : '#6366f1'};">${escapeHtml(k.delta)}</div>
            </div>
          `).join('')}
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid ${brandKit.primaryColor}25; border-radius: 10px; padding: 14px; flex: 1; display: flex; flex-direction: column; justify-content: center;">
          <h4 style="font-size: 0.9rem; font-weight: 700; color: ${brandKit.secondaryColor}; margin-bottom: 8px;">📊 Biểu đồ & Cầu Nối Số Liệu Tài Chính Chi Tiết</h4>
          <p style="font-size: 0.82rem; opacity: 0.85; line-height: 1.5;">${escapeHtml(slide.summary || slide.subtitle || 'Dữ liệu được kết xuất trực tiếp bằng Native PowerPoint Chart & Table khi xuất file.')}</p>
        </div>
      </div>
    `;
  } else if (slide.layout === 'sla_dashboard' || slide.layout === 'incident_dashboard' || slide.layout === 'cx_dashboard' || slide.layout === 'credit_quality') {
    bodyHtml = `
      <div class="slide-layout-dash" style="display: flex; flex-direction: column; gap: 12px; height: 100%;">
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          <div style="background: rgba(16,185,129,0.1); border: 1px solid #10b98140; border-radius: 8px; padding: 12px;">
            <span style="font-size: 0.75rem; font-weight: 700; color: #10b981;">CORE UPTIME / CHẤT LƯỢNG</span>
            <div style="font-size: 1.4rem; font-weight: 900; color: #10b981; font-family: '${brandKit.headingFont}';">99.99%</div>
            <span style="font-size: 0.72rem; opacity: 0.8;">Đạt cam kết SLA 24/7</span>
          </div>
          <div style="background: rgba(99,102,241,0.1); border: 1px solid #6366f140; border-radius: 8px; padding: 12px;">
            <span style="font-size: 0.75rem; font-weight: 700; color: #818cf8;">RESPONSE TIME</span>
            <div style="font-size: 1.4rem; font-weight: 900; color: #818cf8; font-family: '${brandKit.headingFont}';">&lt; 180ms</div>
            <span style="font-size: 0.72rem; opacity: 0.8;">Trải nghiệm mượt mà</span>
          </div>
          <div style="background: rgba(245,158,11,0.1); border: 1px solid #f59e0b40; border-radius: 8px; padding: 12px;">
            <span style="font-size: 0.75rem; font-weight: 700; color: #f59e0b;">TỶ LỆ NỢ XẤU / SỰ CỐ</span>
            <div style="font-size: 1.4rem; font-weight: 900; color: #f59e0b; font-family: '${brandKit.headingFont}';">1.42%</div>
            <span style="font-size: 0.72rem; opacity: 0.8;">Kiểm soát an toàn</span>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.03); border: 1px solid ${brandKit.primaryColor}20; border-radius: 8px; padding: 14px; flex: 1;">
          <h4 style="font-size: 0.9rem; font-weight: 700; color: ${brandKit.textColor}; margin-bottom: 6px;">📋 Ma Trận Chỉ Số Vận Hành & Khuyến Nghị Giám Sát</h4>
          <p style="font-size: 0.82rem; opacity: 0.85; line-height: 1.45;">${escapeHtml(slide.subtitle || 'Duy trì theo dõi liên tục, tối ưu hạ tầng Cloud và tự động hóa cảnh báo sớm.')}</p>
        </div>
      </div>
    `;
  } else {
    // Universal 40-Layout Card Fallback
    const cards = slide.cards || slide.items || [
      { title: 'Nội dung trọng tâm 1', desc: 'Mô tả chi tiết và phân tích dữ liệu' },
      { title: 'Nội dung trọng tâm 2', desc: 'Mô tả chi tiết và phân tích dữ liệu' }
    ];
    bodyHtml = `
      <div class="slide-layout-generic" style="display: flex; flex-direction: column; gap: 12px; height: 100%;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; flex: 1;">
          ${cards.map((c, i) => `
            <div style="background: rgba(255,255,255,0.04); border: 1px solid ${brandKit.primaryColor}30; border-radius: 8px; padding: 14px;">
              <h4 style="font-size: 0.92rem; font-weight: 700; color: ${brandKit.textColor}; margin-bottom: 6px;">${escapeHtml(c.title || c.label || ('Mục ' + (i+1)))}</h4>
              <p style="font-size: 0.8rem; line-height: 1.4; opacity: 0.85;">${escapeHtml(c.desc || c.body || '')}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Render Inner Footer
  let footerHtml = '';
  if (showHeader) {
    footerHtml = `
      <div class="slide-inner-footer" style="border-top-color: ${brandKit.textColor}20;">
        <span class="slide-footer-text">${escapeHtml(brandKit.footerText || 'Confidential')}</span>
        ${brandKit.logoDataUrl && brandKit.logoPosition !== 'cover-only' ? `<img src="${brandKit.logoDataUrl}" class="slide-inner-logo-img" alt="Logo" />` : ''}
        <span class="slide-number-badge" style="font-weight: 700;">${currentSlideIndex + 1}</span>
      </div>
    `;
  }

  slideCanvas.innerHTML = headerHtml + `<div class="slide-inner-body">${bodyHtml}</div>` + footerHtml;

  // Add inline contenteditable listeners
  slideCanvas.querySelectorAll('[contenteditable="true"]').forEach(el => {
    el.addEventListener('blur', () => {
      const field = el.dataset.field;
      if (field && slide) {
        slide[field] = el.innerText.trim();
        renderSlideThumbnails();
      }
    });
  });
}

function renderSlideThumbnails() {
  if (!currentDeck || !slideThumbnailsFilmstrip) return;

  slideThumbnailsFilmstrip.innerHTML = currentDeck.slides.map((s, idx) => `
    <div class="slide-thumb-card ${idx === currentSlideIndex ? 'active' : ''}" onclick="selectSlideByIndex(${idx})">
      <span class="thumb-num-badge">${idx + 1}</span>
      <div class="thumb-mini-title">${escapeHtml(s.title || `Slide ${idx + 1}`)}</div>
      <div class="thumb-mini-type">${s.layout}</div>
    </div>
  `).join('');
}

function selectSlideByIndex(idx) {
  currentSlideIndex = idx;
  renderCurrentSlide();
  renderSlideThumbnails();
}

// Navigation Events
if (btnPrevSlide) {
  btnPrevSlide.addEventListener('click', () => {
    if (currentSlideIndex > 0) {
      currentSlideIndex--;
      renderCurrentSlide();
      renderSlideThumbnails();
    }
  });
}

if (btnNextSlide) {
  btnNextSlide.addEventListener('click', () => {
    if (currentDeck && currentSlideIndex < currentDeck.slides.length - 1) {
      currentSlideIndex++;
      renderCurrentSlide();
      renderSlideThumbnails();
    }
  });
}

// Keyboard shortcuts for slides
document.addEventListener('keydown', (e) => {
  if (modeSlideView && modeSlideView.classList.contains('active')) {
    if (e.target.getAttribute('contenteditable') === 'true' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    if (e.key === 'ArrowLeft' && currentSlideIndex > 0) {
      currentSlideIndex--;
      renderCurrentSlide();
      renderSlideThumbnails();
    } else if (e.key === 'ArrowRight' && currentDeck && currentSlideIndex < currentDeck.slides.length - 1) {
      currentSlideIndex++;
      renderCurrentSlide();
      renderSlideThumbnails();
    }
  }
});

// Change Current Slide Layout
if (selectCurrentSlideLayout) {
  selectCurrentSlideLayout.addEventListener('change', (e) => {
    if (!currentDeck || !currentDeck.slides[currentSlideIndex]) return;
    const newLayout = e.target.value;
    const cur = currentDeck.slides[currentSlideIndex];
    cur.layout = newLayout;

    // Provide default template data for newly selected layout if empty
    if (newLayout === 'kpis' && !cur.stats) {
      cur.stats = [
        { val: '98.5%', label: 'Chỉ Số Hài Lòng', sub: 'Tăng trưởng đều' },
        { val: '24/7', label: 'Hỗ Trợ Tức Thì', sub: 'Tối ưu trải nghiệm' },
        { val: '100k+', label: 'Người Dùng Tích Cực', sub: 'Mở rộng thị phần' }
      ];
    } else if (newLayout === 'cards3' && !cur.cards) {
      cur.cards = [
        { num: '1', title: 'Điểm Nhấn 1', bullets: ['Luận điểm cốt lõi', 'Tính năng nổi bật'] },
        { num: '2', title: 'Điểm Nhấn 2', bullets: ['Luận điểm cốt lõi', 'Tính năng nổi bật'] },
        { num: '3', title: 'Điểm Nhấn 3', bullets: ['Luận điểm cốt lõi', 'Tính năng nổi bật'] }
      ];
    } else if (newLayout === 'cards2' && !cur.cards) {
      cur.cards = [
        { title: 'Trọng Tâm 1', bullets: ['Phân tích chi tiết', 'Giải pháp áp dụng'] },
        { title: 'Trọng Tâm 2', bullets: ['Phân tích chi tiết', 'Giải pháp áp dụng'] }
      ];
    } else if (newLayout === 'timeline' && !cur.steps) {
      cur.steps = [
        { num: '01', title: 'Giai Đoạn 1', desc: 'Khởi động và đánh giá' },
        { num: '02', title: 'Giai Đoạn 2', desc: 'Triển khai hạ tầng' },
        { num: '03', title: 'Giai Đoạn 3', desc: 'Tối ưu hóa và mở rộng' },
        { num: '04', title: 'Giai Đoạn 4', desc: 'Đo lường và chuẩn hóa' }
      ];
    } else if (newLayout === 'quotes' && !cur.quotes) {
      cur.quotes = [
        { stars: '★★★★★', text: 'Dịch vụ rất tốt, hỗ trợ chu đáo và nhanh chóng!', author: 'Khách hàng A' },
        { stars: '★★★★★', text: 'Trải nghiệm tuyệt vời, sản phẩm mang lại giá trị thiết thực.', author: 'Khách hàng B' }
      ];
    }

    renderCurrentSlide();
    renderSlideThumbnails();
    showToast(`Đã đổi sang bố cục: ${selectCurrentSlideLayout.options[selectCurrentSlideLayout.selectedIndex].text}`, 'info');
  });
}

// Add / Delete Slide
if (btnAddSlide) {
  btnAddSlide.addEventListener('click', () => {
    if (!currentDeck) return;
    const newSlide = {
      id: Date.now(),
      layout: 'cards3',
      badge: 'NỘI DUNG BỔ SUNG',
      title: 'Tiêu Đề Slide Mới',
      subtitle: 'Mô tả ngắn gọn mục tiêu của slide này',
      cards: [
        { num: '1', title: 'Nội Dung 1', bullets: ['Gạch đầu dòng ý thứ nhất', 'Gạch đầu dòng ý thứ hai'] },
        { num: '2', title: 'Nội Dung 2', bullets: ['Gạch đầu dòng ý thứ nhất', 'Gạch đầu dòng ý thứ hai'] },
        { num: '3', title: 'Nội Dung 3', bullets: ['Gạch đầu dòng ý thứ nhất', 'Gạch đầu dòng ý thứ hai'] }
      ]
    };
    currentDeck.slides.splice(currentSlideIndex + 1, 0, newSlide);
    currentSlideIndex++;
    renderCurrentSlide();
    renderSlideThumbnails();
    showToast('Đã thêm 1 trang slide mới', 'success');
  });
}

if (btnDeleteSlide) {
  btnDeleteSlide.addEventListener('click', () => {
    if (!currentDeck || currentDeck.slides.length <= 1) {
      showToast('Bài thuyết trình cần có ít nhất 1 slide!', 'error');
      return;
    }
    currentDeck.slides.splice(currentSlideIndex, 1);
    if (currentSlideIndex >= currentDeck.slides.length) {
      currentSlideIndex = currentDeck.slides.length - 1;
    }
    renderCurrentSlide();
    renderSlideThumbnails();
    showToast('Đã xóa slide hiện tại', 'info');
  });
}

// Slide Editor Side Drawer
if (btnToggleSlideEditor) {
  btnToggleSlideEditor.addEventListener('click', () => {
    if (slideEditorDrawer.style.display === 'none') {
      openSlideEditorDrawer();
    } else {
      slideEditorDrawer.style.display = 'none';
    }
  });
}

if (btnCloseDrawer) {
  btnCloseDrawer.addEventListener('click', () => {
    if (slideEditorDrawer) slideEditorDrawer.style.display = 'none';
  });
}

function openSlideEditorDrawer() {
  if (!currentDeck || !slideEditorDrawer || !slideEditorFields) return;
  const slide = currentDeck.slides[currentSlideIndex];
  if (!slide) return;

  slideEditorDrawer.style.display = 'block';

  let fieldsHtml = `
    <div class="editor-field-group">
      <label>Tiêu đề Slide (Title):</label>
      <input type="text" id="editSlideTitle" value="${escapeHtml(slide.title || '')}" />
    </div>
    <div class="editor-field-group">
      <label>Phụ đề / Thông điệp (Subtitle):</label>
      <textarea id="editSlideSubtitle" rows="2">${escapeHtml(slide.subtitle || '')}</textarea>
    </div>
    <div class="editor-field-group">
      <label>Nhãn danh mục (Badge):</label>
      <input type="text" id="editSlideBadge" value="${escapeHtml(slide.badge || '')}" />
    </div>
  `;

  slideEditorFields.innerHTML = fieldsHtml;

  const titleInput = document.getElementById('editSlideTitle');
  const subInput = document.getElementById('editSlideSubtitle');
  const badgeInput = document.getElementById('editSlideBadge');

  if (titleInput) {
    titleInput.addEventListener('input', () => {
      slide.title = titleInput.value;
      renderCurrentSlide();
      renderSlideThumbnails();
    });
  }
  if (subInput) {
    subInput.addEventListener('input', () => {
      slide.subtitle = subInput.value;
      renderCurrentSlide();
    });
  }
  if (badgeInput) {
    badgeInput.addEventListener('input', () => {
      slide.badge = badgeInput.value;
      renderCurrentSlide();
    });
  }
}

// Copy Outline
if (btnCopySlideDeckOutline) {
  btnCopySlideDeckOutline.addEventListener('click', () => {
    if (!currentDeck) return;
    let outline = `# ${currentDeck.title}\n${currentDeck.subtitle}\n\n`;
    currentDeck.slides.forEach((s, idx) => {
      outline += `## Slide ${idx + 1}: ${s.title} (${s.layout})\n`;
      if (s.subtitle) outline += `   ${s.subtitle}\n`;
      if (s.items) s.items.forEach(it => outline += `   - [${it.num}] ${it.title}: ${it.desc}\n`);
      if (s.stats) s.stats.forEach(st => outline += `   - KPI: ${st.val} | ${st.label} (${st.sub})\n`);
      if (s.cards) s.cards.forEach(cd => {
        outline += `   - Thẻ: ${cd.title}\n`;
        (cd.bullets || []).forEach(b => outline += `     * ${b}\n`);
      });
      if (s.steps) s.steps.forEach(st => outline += `   - [${st.num}] ${st.title}: ${st.desc}\n`);
      if (s.quotes) s.quotes.forEach(q => outline += `   - Trích dẫn (${q.stars}): "${q.text}" - ${q.author}\n`);
      if (s.actions) s.actions.forEach(a => outline += `   - [${a.prio.toUpperCase()}] ${a.task} (${a.owner} - ${a.deadline})\n`);
      outline += '\n';
    });

    navigator.clipboard.writeText(outline).then(() => {
      showToast('Đã sao chép dàn ý bài thuyết trình vào Clipboard!', 'success');
    });
  });
}

// ============================================
// PowerPoint (.pptx) Native Export Engine
// ============================================
function toHex(color) {
  if (!color) return 'FFFFFF';
  return color.replace('#', '').toUpperCase();
}

function base64ToBlob(base64, contentType = '') {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: contentType });
}

function downloadBlob(blob, filename) {
  const cleanName = (filename || 'Presentation_Deck.pptx').trim();
  const safeFilename = cleanName.endsWith('.pptx') ? cleanName : `${cleanName}.pptx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.setAttribute('download', safeFilename);
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { }
  }, 15000);
}

if (btnDownloadPPTX) {
  btnDownloadPPTX.addEventListener('click', async () => {
    if (!currentDeck || !currentDeck.slides || !currentDeck.slides.length) {
      showToast('Chưa có nội dung slide để xuất. Vui lòng bấm tạo slide trước!', 'error');
      return;
    }

    btnDownloadPPTX.disabled = true;
    showToast('Đang khởi tạo file PowerPoint (.pptx)...', 'info');

    const preferredFilename = exportDeckFilename && exportDeckFilename.textContent.trim()
      ? exportDeckFilename.textContent.trim()
      : `Bao_Cao_${(currentDeck.title || 'Slide').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_').slice(0, 30)}_${new Date().toISOString().split('T')[0]}.pptx`;

    // 1. If a custom Template was uploaded, export through template engine first!
    if (currentUploadedTemplate && currentUploadedTemplate.templateId) {
      try {
        const res = await fetch('/api/template/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            templateId: currentUploadedTemplate.templateId,
            deckData: currentDeck
          })
        });
        const resJson = await res.json();
        if (resJson.success && resJson.base64) {
          const blob = base64ToBlob(resJson.base64, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
          downloadBlob(blob, preferredFilename || resJson.fileName);
          showToast(`🎉 Đã xuất file PowerPoint (.pptx) chuẩn Office: "${preferredFilename}"`, 'success');
          btnDownloadPPTX.disabled = false;
          return;
        }
      } catch (err) {
        console.warn('Template export fallback to server engine:', err);
      }
    }

    // 2. Try High-Precision MB 40-Layout Server Engine
    try {
      const res = await fetch('/api/slide/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckData: currentDeck
        })
      });
      const resJson = await res.json();
      if (resJson.success && resJson.base64) {
        const blob = base64ToBlob(resJson.base64, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        downloadBlob(blob, preferredFilename || resJson.fileName);
        showToast(`🎉 Đã xuất file PowerPoint MB (.pptx) chuẩn 16:9 (${resJson.slideCount} slides)!`, 'success');
        btnDownloadPPTX.disabled = false;
        return;
      }
    } catch (err) {
      console.warn('MB Server engine export fallback to client generator:', err);
    }

    if (typeof PptxGenJS === 'undefined' && typeof window.PptxGenJS === 'undefined') {
      showToast('Đang kết nối thư viện tạo PowerPoint... Vui lòng thử lại sau giây lát.', 'error');
      btnDownloadPPTX.disabled = false;
      return;
    }

    try {
      const PptxClass = window.PptxGenJS || PptxGenJS;
      const pptx = new PptxClass();

      // Widescreen 16:9 layout (13.333 x 7.5 inches standard Office Widescreen)
      pptx.defineLayout({ name: 'WIDE_16_9', width: 13.333, height: 7.5 });
      pptx.layout = 'WIDE_16_9';
      pptx.title = currentDeck.title;
      pptx.author = brandKit.presenterName || 'Presenter';
      pptx.company = brandKit.brandName || 'Company';

      const hexPrimary = toHex(brandKit.primaryColor);
      const hexSecondary = toHex(brandKit.secondaryColor);
      const hexAccent = toHex(brandKit.accentColor);
      const hexBg = toHex(brandKit.bgColor);
      const hexText = toHex(brandKit.textColor);

      const fontH = toOfficeSafeFont(brandKit.headingFont, 'Segoe UI');
      const fontB = toOfficeSafeFont(brandKit.bodyFont, 'Calibri');

      // Iterate through each slide
      currentDeck.slides.forEach((s, idx) => {
        const pptxSlide = pptx.addSlide();

        // 1. Background Fill (full 13.333 x 7.5 inches)
        pptxSlide.background = { color: hexBg };

        // 2. Decorative Top Accent Line
        pptxSlide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: 13.333,
          h: 0.1,
          fill: { color: hexPrimary }
        });

        // 3. Brand Logo (if provided)
        if (brandKit.logoDataUrl && (brandKit.logoPosition !== 'cover-only' || s.layout === 'cover')) {
          try {
            pptxSlide.addImage({
              data: brandKit.logoDataUrl,
              x: brandKit.logoPosition === 'top-left' ? 0.8 : 11.0,
              y: 0.35,
              w: 1.5,
              h: 0.55,
              sizing: { type: 'contain' }
            });
          } catch (e) { }
        }

        // 4. Slide Number & Footer
        if (s.layout !== 'cover') {
          pptxSlide.addText(`${idx + 1}`, {
            x: 11.8,
            y: 6.9,
            w: 0.8,
            h: 0.3,
            fontSize: 10,
            fontFace: fontB,
            color: hexText,
            align: 'right'
          });

          if (brandKit.footerText) {
            pptxSlide.addText(brandKit.footerText, {
              x: 0.8,
              y: 6.9,
              w: 10.5,
              h: 0.3,
              fontSize: 9,
              fontFace: fontB,
              color: hexText,
              align: 'left'
            });
          }
        }

        // 5. Layout-Specific PPTX Elements
        if (s.layout === 'cover') {
          // Decorative Right Shape
          pptxSlide.addShape(pptx.ShapeType.roundRect, {
            x: 9.5,
            y: -1.0,
            w: 5.0,
            h: 9.5,
            fill: { color: hexPrimary, transparency: 85 },
            line: { color: hexSecondary, width: 1, transparency: 70 }
          });

          // Badge
          if (s.badge) {
            pptxSlide.addText(`★ ${s.badge}`, {
              x: 0.8,
              y: 1.8,
              w: 6.0,
              h: 0.35,
              fontSize: 11,
              fontFace: fontH,
              bold: true,
              color: hexSecondary
            });
          }

          // Main Title
          pptxSlide.addText(s.title || currentDeck.title, {
            x: 0.8,
            y: 2.3,
            w: 9.5,
            h: 2.2,
            fontSize: 32,
            fontFace: fontH,
            bold: true,
            color: hexText,
            valign: 'top'
          });

          // Subtitle
          if (s.subtitle) {
            pptxSlide.addText(s.subtitle, {
              x: 0.8,
              y: 4.6,
              w: 9.0,
              h: 1.0,
              fontSize: 15,
              fontFace: fontB,
              color: hexSecondary,
              valign: 'top'
            });
          }

          // Metadata Divider
          pptxSlide.addShape(pptx.ShapeType.line, {
            x: 0.8,
            y: 5.8,
            w: 8.5,
            h: 0,
            line: { color: hexText, width: 1, transparency: 75 }
          });

          // Metadata Info
          pptxSlide.addText(`👤 ${s.presenter || brandKit.presenterName}   |   📅 ${s.date || '2026'}   |   🏢 ${s.brandName || brandKit.brandName}`, {
            x: 0.8,
            y: 6.0,
            w: 8.5,
            h: 0.4,
            fontSize: 11,
            fontFace: fontB,
            color: hexText
          });

        } else if (s.layout === 'kpis') {
          // Header
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);

          const stats = s.stats || [];
          const colW = 3.6;
          const startX = 0.8;
          const gapX = 0.5;

          stats.slice(0, 3).forEach((st, i) => {
            const cardX = startX + i * (colW + gapX);

            // Card Shape
            pptxSlide.addShape(pptx.ShapeType.roundRect, {
              x: cardX,
              y: 2.5,
              w: colW,
              h: 3.8,
              fill: { color: hexPrimary, transparency: 90 },
              line: { color: hexPrimary, width: 1.5, transparency: 60 }
            });

            // Big Number
            pptxSlide.addText(st.val, {
              x: cardX + 0.2,
              y: 3.0,
              w: colW - 0.4,
              h: 1.2,
              fontSize: 40,
              fontFace: fontH,
              bold: true,
              color: hexAccent,
              align: 'center',
              valign: 'middle'
            });

            // Label
            pptxSlide.addText(st.label, {
              x: cardX + 0.2,
              y: 4.4,
              w: colW - 0.4,
              h: 0.7,
              fontSize: 14,
              fontFace: fontH,
              bold: true,
              color: hexText,
              align: 'center',
              valign: 'top'
            });

            // Sub
            pptxSlide.addText(st.sub, {
              x: cardX + 0.2,
              y: 5.2,
              w: colW - 0.4,
              h: 0.6,
              fontSize: 11,
              fontFace: fontB,
              color: hexSecondary,
              align: 'center',
              valign: 'top'
            });
          });

        } else if (s.layout === 'cards3') {
          // Header
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);

          const cards = s.cards || [];
          const colW = 3.65;
          const startX = 0.8;
          const gapX = 0.45;

          cards.slice(0, 3).forEach((cd, i) => {
            const cardX = startX + i * (colW + gapX);

            // Card Shape
            pptxSlide.addShape(pptx.ShapeType.roundRect, {
              x: cardX,
              y: 2.3,
              w: colW,
              h: 4.4,
              fill: { color: hexPrimary, transparency: 92 },
              line: { color: hexPrimary, width: 1, transparency: 70 }
            });

            // Top Color Accent Bar
            pptxSlide.addShape(pptx.ShapeType.roundRect, {
              x: cardX,
              y: 2.3,
              w: colW,
              h: 0.1,
              fill: { color: hexPrimary }
            });

            // Card Title
            pptxSlide.addText(`[${cd.num}] ${cd.title}`, {
              x: cardX + 0.25,
              y: 2.6,
              w: colW - 0.5,
              h: 0.6,
              fontSize: 13,
              fontFace: fontH,
              bold: true,
              color: hexText,
              valign: 'top'
            });

            // Bullets
            const bulletTexts = (cd.bullets || []).map(b => ({
              text: `${b}\n`,
              options: { fontSize: 11, fontFace: fontB, color: hexText, bullet: true, spaceAfter: 6 }
            }));

            if (bulletTexts.length) {
              pptxSlide.addText(bulletTexts, {
                x: cardX + 0.25,
                y: 3.3,
                w: colW - 0.5,
                h: 3.2,
                valign: 'top'
              });
            }
          });

        } else if (s.layout === 'chart') {
          // Header
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);

          const cd = s.chartData || { labels: ['Tích cực', 'Trung tính', 'Tiêu cực'], values: [70, 18, 12] };

          // Native PowerPoint Chart (Editable in Excel!)
          const pptxChartData = [
            {
              name: 'Tỷ lệ %',
              labels: cd.labels,
              values: cd.values
            }
          ];

          pptxSlide.addChart(pptx.ChartType.bar, pptxChartData, {
            x: 0.8,
            y: 2.3,
            w: 6.5,
            h: 4.3,
            barDir: 'col',
            chartColors: [hexAccent, hexSecondary, 'EF4444'],
            valAxisLabelFormatCode: '0"%"',
            showValue: true,
            valGridLine: { color: hexText, transparency: 85 }
          });

          // Insights Box on the right
          pptxSlide.addShape(pptx.ShapeType.roundRect, {
            x: 7.6,
            y: 2.3,
            w: 4.8,
            h: 4.3,
            fill: { color: hexPrimary, transparency: 92 },
            line: { color: hexPrimary, width: 1, transparency: 70 }
          });

          pptxSlide.addText('💡 Phân Tích & Điểm Nhấn', {
            x: 7.9,
            y: 2.5,
            w: 4.2,
            h: 0.4,
            fontSize: 13,
            fontFace: fontH,
            bold: true,
            color: hexSecondary
          });

          const insightBullets = (s.insights || []).map(ins => ({
            text: `${ins}\n`,
            options: { fontSize: 11, fontFace: fontB, color: hexText, bullet: true, spaceAfter: 10 }
          }));

          if (insightBullets.length) {
            pptxSlide.addText(insightBullets, {
              x: 7.9,
              y: 3.0,
              w: 4.2,
              h: 3.3,
              valign: 'top'
            });
          }

        } else if (s.layout === 'action_plan') {
          // Header
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);

          // Native Table
          const tableRows = [
            [
              { text: 'Mức Độ', options: { fill: { color: hexPrimary }, color: 'FFFFFF', bold: true, fontSize: 11, fontFace: fontH } },
              { text: 'Nhiệm Vụ Trọng Tâm', options: { fill: { color: hexPrimary }, color: 'FFFFFF', bold: true, fontSize: 11, fontFace: fontH } },
              { text: 'Đơn Vị Phụ Trách', options: { fill: { color: hexPrimary }, color: 'FFFFFF', bold: true, fontSize: 11, fontFace: fontH } },
              { text: 'Thời Hạn', options: { fill: { color: hexPrimary }, color: 'FFFFFF', bold: true, fontSize: 11, fontFace: fontH, align: 'right' } }
            ]
          ];

          (s.actions || []).forEach(act => {
            const prioColor = act.prio === 'high' ? 'EF4444' : act.prio === 'med' ? 'F59E0B' : '10B981';
            tableRows.push([
              { text: act.prio === 'high' ? 'ƯU TIÊN CAO' : act.prio === 'med' ? 'TRUNG BÌNH' : 'TIÊU CHUẨN', options: { color: prioColor, bold: true, fontSize: 10, fontFace: fontB } },
              { text: act.task, options: { color: hexText, fontSize: 11, fontFace: fontB, bold: true } },
              { text: act.owner, options: { color: hexText, fontSize: 10, fontFace: fontB } },
              { text: act.deadline, options: { color: hexSecondary, fontSize: 10, fontFace: fontB, bold: true, align: 'right' } }
            ]);
          });

          pptxSlide.addTable(tableRows, {
            x: 0.8,
            y: 2.3,
            w: 11.5,
            rowH: 0.7,
            border: { type: 'solid', pt: 1, color: hexPrimary, transparency: 60 },
            fill: { color: hexPrimary, transparency: 95 }
          });

        } else if (s.layout === 'timeline') {
          // Header
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);

          const steps = s.steps || [];
          const stepW = 2.6;
          const startX = 0.8;
          const gapX = 0.4;

          // Connecting line
          pptxSlide.addShape(pptx.ShapeType.line, {
            x: 1.5,
            y: 3.0,
            w: 9.5,
            h: 0,
            line: { color: hexSecondary, width: 2, transparency: 50 }
          });

          steps.slice(0, 4).forEach((st, i) => {
            const stepX = startX + i * (stepW + gapX);

            // Step Circle
            pptxSlide.addShape(pptx.ShapeType.ellipse, {
              x: stepX + 0.9,
              y: 2.6,
              w: 0.8,
              h: 0.8,
              fill: { color: hexPrimary },
              line: { color: hexSecondary, width: 2 }
            });

            pptxSlide.addText(st.num, {
              x: stepX + 0.9,
              y: 2.6,
              w: 0.8,
              h: 0.8,
              fontSize: 12,
              fontFace: fontH,
              bold: true,
              color: 'FFFFFF',
              align: 'center',
              valign: 'middle'
            });

            // Step Card
            pptxSlide.addShape(pptx.ShapeType.roundRect, {
              x: stepX,
              y: 3.7,
              w: stepW,
              h: 2.6,
              fill: { color: hexPrimary, transparency: 92 },
              line: { color: hexPrimary, width: 1, transparency: 70 }
            });

            pptxSlide.addText(st.title, {
              x: stepX + 0.15,
              y: 3.9,
              w: stepW - 0.3,
              h: 0.5,
              fontSize: 12,
              fontFace: fontH,
              bold: true,
              color: hexText,
              align: 'center'
            });

            pptxSlide.addText(st.desc, {
              x: stepX + 0.15,
              y: 4.4,
              w: stepW - 0.3,
              h: 1.7,
              fontSize: 10,
              fontFace: fontB,
              color: hexText,
              align: 'center'
            });
          });

        } else if (s.layout === 'quotes') {
          // Header
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);

          const quotes = s.quotes || [];
          const cardW = 5.5;
          const startX = 0.8;
          const gapX = 0.6;

          quotes.slice(0, 2).forEach((q, i) => {
            const qX = startX + i * (cardW + gapX);

            pptxSlide.addShape(pptx.ShapeType.roundRect, {
              x: qX,
              y: 2.3,
              w: cardW,
              h: 4.3,
              fill: { color: hexPrimary, transparency: 92 },
              line: { color: hexSecondary, width: 1.5, transparency: 60 }
            });

            // Stars
            pptxSlide.addText(q.stars, {
              x: qX + 0.4,
              y: 2.6,
              w: cardW - 0.8,
              h: 0.4,
              fontSize: 16,
              color: 'F59E0B'
            });

            // Text
            pptxSlide.addText(`"${q.text}"`, {
              x: qX + 0.4,
              y: 3.1,
              w: cardW - 0.8,
              h: 2.4,
              fontSize: 13,
              fontFace: fontB,
              italic: true,
              color: hexText,
              valign: 'top'
            });

            // Author
            pptxSlide.addText(`— ${q.author}`, {
              x: qX + 0.4,
              y: 5.7,
              w: cardW - 0.8,
              h: 0.5,
              fontSize: 11,
              fontFace: fontH,
              bold: true,
              color: hexSecondary
            });
          });

        } else if (s.layout === 'cards2') {
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);
          const cards = s.cards || [];
          const colW = 5.5;
          const startX = 0.8;
          const gapX = 0.5;

          cards.slice(0, 2).forEach((cd, i) => {
            const cardX = startX + i * (colW + gapX);
            pptxSlide.addShape(pptx.ShapeType.roundRect, {
              x: cardX,
              y: 2.3,
              w: colW,
              h: 4.4,
              fill: { color: hexPrimary, transparency: 92 },
              line: { color: hexSecondary, width: 1.5, transparency: 60 }
            });

            pptxSlide.addText(`📌 ${cd.title}`, {
              x: cardX + 0.3,
              y: 2.6,
              w: colW - 0.6,
              h: 0.6,
              fontSize: 14,
              fontFace: fontH,
              bold: true,
              color: hexText,
              valign: 'top'
            });

            const bulletTexts = (cd.bullets || []).map(b => ({
              text: `${b}\n`,
              options: { fontSize: 11, fontFace: fontB, color: hexText, bullet: true, spaceAfter: 8 }
            }));

            if (bulletTexts.length) {
              pptxSlide.addText(bulletTexts, {
                x: cardX + 0.3,
                y: 3.3,
                w: colW - 0.6,
                h: 3.2,
                valign: 'top'
              });
            }
          });

        } else if (s.layout === 'cards4') {
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);
          const cards = s.cards || [];
          const colW = 2.7;
          const startX = 0.8;
          const gapX = 0.25;

          cards.slice(0, 4).forEach((cd, i) => {
            const cardX = startX + i * (colW + gapX);
            pptxSlide.addShape(pptx.ShapeType.roundRect, {
              x: cardX,
              y: 2.3,
              w: colW,
              h: 4.4,
              fill: { color: hexPrimary, transparency: 92 },
              line: { color: hexPrimary, width: 1, transparency: 70 }
            });

            pptxSlide.addText(cd.title, {
              x: cardX + 0.15,
              y: 2.5,
              w: colW - 0.3,
              h: 0.6,
              fontSize: 12,
              fontFace: fontH,
              bold: true,
              color: hexText,
              valign: 'top'
            });

            const bulletTexts = (cd.bullets || []).map(b => ({
              text: `${b}\n`,
              options: { fontSize: 10, fontFace: fontB, color: hexText, bullet: true, spaceAfter: 6 }
            }));

            if (bulletTexts.length) {
              pptxSlide.addText(bulletTexts, {
                x: cardX + 0.15,
                y: 3.2,
                w: colW - 0.3,
                h: 3.3,
                valign: 'top'
              });
            }
          });

        } else if (s.layout === 'content') {
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);
          pptxSlide.addShape(pptx.ShapeType.roundRect, {
            x: 0.8,
            y: 2.3,
            w: 11.5,
            h: 4.4,
            fill: { color: hexPrimary, transparency: 94 },
            line: { color: hexPrimary, width: 1.5, transparency: 60 }
          });

          const bullets = s.bullets || (s.cards ? s.cards.flatMap(c => c.bullets || [c.title]) : (s.items ? s.items.map(i => `${i.title}: ${i.desc}`) : ['Nội dung chi tiết']));
          const bulletTexts = bullets.map(b => ({
            text: `${b}\n`,
            options: { fontSize: 12, fontFace: fontB, color: hexText, bullet: true, spaceAfter: 10 }
          }));

          if (bulletTexts.length) {
            pptxSlide.addText(bulletTexts, {
              x: 1.2,
              y: 2.6,
              w: 10.7,
              h: 3.8,
              valign: 'top'
            });
          }

        } else if (s.layout === 'table') {
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);
          const headers = (s.table && s.table.headers) || ['Tiêu chí', 'Nội dung', 'Hiện trạng', 'Đề xuất'];
          const rows = (s.table && s.table.rows) || [];
          const tableRows = [
            headers.map(h => ({ text: h, options: { fill: { color: hexPrimary }, color: 'FFFFFF', bold: true, fontSize: 11, fontFace: fontH } }))
          ];
          rows.forEach(r => {
            const rowCells = (Array.isArray(r) ? r : [r]).map((cell, cIdx) => ({
              text: String(cell),
              options: { color: cIdx === 0 ? hexSecondary : hexText, fontSize: 10, fontFace: fontB, bold: cIdx === 0 }
            }));
            tableRows.push(rowCells);
          });
          pptxSlide.addTable(tableRows, {
            x: 0.8,
            y: 2.3,
            w: 11.5,
            rowH: 0.6,
            border: { type: 'solid', pt: 1, color: hexPrimary, transparency: 60 },
            fill: { color: hexPrimary, transparency: 95 }
          });

        } else if (s.layout === 'agenda') {
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);
          const items = s.items || [];
          const cardW = 5.6;
          const cardH = 2.0;
          const gapX = 0.533;
          const gapY = 0.3;
          const startX = 0.8;
          const startY = 2.3;

          items.slice(0, 4).forEach((it, i) => {
            const row = Math.floor(i / 2);
            const col = i % 2;
            const cardX = startX + col * (cardW + gapX);
            const cardY = startY + row * (cardH + gapY);

            pptxSlide.addShape(pptx.ShapeType.roundRect, {
              x: cardX,
              y: cardY,
              w: cardW,
              h: cardH,
              fill: { color: hexPrimary, transparency: 92 },
              line: { color: hexPrimary, width: 1, transparency: 60 }
            });

            pptxSlide.addText(it.num, {
              x: cardX + 0.3,
              y: cardY + 0.3,
              w: 0.8,
              h: 0.6,
              fontSize: 20,
              fontFace: fontH,
              bold: true,
              color: hexAccent
            });

            pptxSlide.addText(it.title, {
              x: cardX + 1.2,
              y: cardY + 0.3,
              w: cardW - 1.5,
              h: 0.5,
              fontSize: 13,
              fontFace: fontH,
              bold: true,
              color: hexText
            });

            pptxSlide.addText(it.desc, {
              x: cardX + 1.2,
              y: cardY + 0.8,
              w: cardW - 1.5,
              h: 1.0,
              fontSize: 10,
              fontFace: fontB,
              color: hexSecondary
            });
          });

        } else if (s.layout === 'conclusion') {
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);
          pptxSlide.addText(s.title || 'Xin Cảm Ơn!', {
            x: 1.0,
            y: 2.8,
            w: 11.0,
            h: 1.5,
            fontSize: 36,
            fontFace: fontH,
            bold: true,
            color: hexText,
            align: 'center'
          });

          if (s.subtitle) {
            pptxSlide.addText(s.subtitle, {
              x: 1.5,
              y: 4.2,
              w: 10.0,
              h: 1.0,
              fontSize: 15,
              fontFace: fontB,
              color: hexSecondary,
              align: 'center'
            });
          }

          if (s.contacts && s.contacts.length) {
            pptxSlide.addText(s.contacts.join('   •   '), {
              x: 1.0,
              y: 5.4,
              w: 11.0,
              h: 0.5,
              fontSize: 12,
              fontFace: fontB,
              color: hexText,
              align: 'center'
            });
          }

        } else {
          renderSlideHeaderPPTX(pptxSlide, s, hexPrimary, hexSecondary, hexText, fontH, fontB);
        }
      });

      // Filename
      const filename = exportDeckFilename ? exportDeckFilename.textContent.trim() : 'Presentation_Deck.pptx';
      await pptx.writeFile({ fileName: filename });
      showToast(`Đã xuất file PowerPoint (.pptx) thành công! Tên file: ${filename}`, 'success');
    } catch (err) {
      console.error('PPTX Export Error:', err);
      showToast(`Lỗi xuất PowerPoint: ${err.message}`, 'error');
    } finally {
      btnDownloadPPTX.disabled = false;
    }
  });
}

// Download PPTX Using Uploaded Template (.pptx Clone)
if (btnDownloadTemplatePPTX) {
  btnDownloadTemplatePPTX.addEventListener('click', async () => {
    if (!currentDeck || !currentDeck.slides || !currentDeck.slides.length) {
      showToast('Chưa có nội dung slide để xuất. Vui lòng bấm tạo slide trước!', 'error');
      return;
    }
    if (!currentUploadedTemplate || !currentUploadedTemplate.templateId) {
      showToast('Chưa có file template PowerPoint mẫu!', 'error');
      return;
    }

    btnDownloadTemplatePPTX.disabled = true;
    showToast(`Đang ghép nội dung vào Template "${currentUploadedTemplate.fileName}"...`, 'info');

    try {
      const res = await fetch('/api/template/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: currentUploadedTemplate.templateId,
          deckData: currentDeck
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data && data.base64) {
        const byteCharacters = atob(data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = data.fileName || `Presentation_${currentUploadedTemplate.fileName}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        showToast(`🎉 Đã tải file PowerPoint theo đúng Template "${currentUploadedTemplate.fileName}" thành công!`, 'success');
      }
    } catch (err) {
      console.error('Download template error:', err);
      showToast(`Lỗi xuất slide template: ${err.message}`, 'error');
    } finally {
      btnDownloadTemplatePPTX.disabled = false;
    }
  });
}

function renderSlideHeaderPPTX(pptxSlide, slide, hexPrimary, hexSecondary, hexText, fontH, fontB) {
  if (slide.badge) {
    pptxSlide.addText(slide.badge, {
      x: 0.8,
      y: 0.45,
      w: 6.0,
      h: 0.3,
      fontSize: 10,
      fontFace: fontH,
      bold: true,
      color: hexSecondary
    });
  }

  pptxSlide.addText(slide.title || '', {
    x: 0.8,
    y: 0.8,
    w: 10.0,
    h: 0.8,
    fontSize: 22,
    fontFace: fontH,
    bold: true,
    color: hexText,
    valign: 'top'
  });

  if (slide.subtitle) {
    pptxSlide.addText(slide.subtitle, {
      x: 0.8,
      y: 1.55,
      w: 10.0,
      h: 0.4,
      fontSize: 12,
      fontFace: fontB,
      color: hexSecondary,
      valign: 'top'
    });
  }
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
// MB 40 Layouts Catalog & JSON Deck Modals
// ============================================
const btnOpenLayoutCatalog = document.getElementById('btnOpenLayoutCatalog');
const layoutCatalogModal = document.getElementById('layoutCatalogModal');
const btnCloseLayoutCatalog = document.getElementById('btnCloseLayoutCatalog');
const layoutCatalogBody = document.getElementById('layoutCatalogBody');

const btnOpenJsonDeckEditor = document.getElementById('btnOpenJsonDeckEditor');
const jsonDeckEditorModal = document.getElementById('jsonDeckEditorModal');
const btnCloseJsonDeckEditor = document.getElementById('btnCloseJsonDeckEditor');
const jsonDeckTextarea = document.getElementById('jsonDeckTextarea');
const jsonEditorStatusbar = document.getElementById('jsonEditorStatusbar');
const btnCopyJsonDeck = document.getElementById('btnCopyJsonDeck');
const btnFormatJsonDeck = document.getElementById('btnFormatJsonDeck');
const btnApplyJsonDeck = document.getElementById('btnApplyJsonDeck');

const MB_40_LAYOUTS_CATALOG = [
  {
    category: "Tổng quan & Giới thiệu",
    items: [
      { id: "cover_gradient", name: "Bìa Xanh Đậm (Cover Gradient)", desc: "Trang bìa xanh MB Blue #171EDB bứt phá" },
      { id: "cover_light", name: "Bìa Sáng (Cover Light)", desc: "Trang bìa nền trắng thanh lịch, bảo mật" },
      { id: "agenda", name: "Chương Trình & Mục Lục (Agenda)", desc: "4 chủ đề chính + Thẻ thông điệp" },
      { id: "section_divider", name: "Phân Tách Chương / Phần", desc: "Slide chia phần nền xanh Navy #081235" },
      { id: "closing", name: "Kết Thúc & Lời Cảm Ơn", desc: "Slide kết thúc, liên hệ và QR Code" }
    ]
  },
  {
    category: "Tài chính & Kinh doanh",
    items: [
      { id: "executive_summary", name: "Tóm Tắt Điều Hành (Executive Summary)", desc: "Thông điệp lãnh đạo & 3 thẻ trụ cột" },
      { id: "key_message", name: "Thông Điệp Trọng Tâm & Số Liệu", desc: "Trích dẫn lớn thông điệp + 1 KPI nổi bật" },
      { id: "kpi_overview", name: "Tổng Quan Chỉ Số KPI", desc: "4 KPI đầu trang + Phân tích & 3 Mục tiêu" },
      { id: "financial_dashboard", name: "Dashboard Tài Chính", desc: "4 KPI (TOI, NII, NFI, NIM) + Biểu đồ đường" },
      { id: "pnl_bridge", name: "Cầu Nối PnL Waterfall Bridge", desc: "Biểu đồ cầu nối lợi nhuận PBT từng bước" },
      { id: "balance_sheet", name: "Bảng Cân Đối Kế Toán", desc: "Tổng tài sản vs Nguồn vốn chi tiết" },
      { id: "cash_flow", name: "Lưu Chuyển Tiền Tệ (Cash Flow)", desc: "3 dòng tiền CFO, CFI, CFF & Tiền cuối kỳ" },
      { id: "trend", name: "Phân Tích Xu Hướng Nhiều Chu Kỳ", desc: "Biểu đồ xu hướng đa chỉ số & Milestones" },
      { id: "plan_actual", name: "Kế Hoạch vs Thực Tế (Plan vs Actual)", desc: "Biểu đồ so sánh & Phân tích chênh lệch" },
      { id: "composition", name: "Cơ Cấu Tỷ Trọng (Donut Chart)", desc: "Biểu đồ bánh Donut & danh mục tỷ trọng" },
      { id: "data_table", name: "Bảng Dữ Liệu Tài Chính Chi Tiết", desc: "Bảng 6 cột chuẩn báo cáo tài chính" },
      { id: "data_insight_split", name: "Chia Đôi Số Liệu & Insight", desc: "Nửa trái số liệu & Nửa phải phân tích sâu" },
      { id: "segment_performance", name: "Hiệu Quả Phân Khúc KH", desc: "3 phân khúc: Cá nhân, SME, Doanh nghiệp lớn" },
      { id: "region_performance", name: "Kết Quả Theo 4 Vùng Địa Lý", desc: "Miền Bắc, Miền Nam, Miền Trung, Nước ngoài" },
      { id: "cib_portfolio", name: "Danh Mục Khách Hàng Lớn CIB", desc: "Phân bổ ngành & Hạn mức tập trung" },
      { id: "credit_quality", name: "Chất Lượng Tín Dụng & Nợ 5 Nhóm", desc: "Phân loại nợ, tỷ lệ NPL & Bao phủ LLR" },
      { id: "collections", name: "Dashboard Thu Hồi Nợ", desc: "Theo dõi 4 Bucket quá hạn & Kênh thu nợ" }
    ]
  },
  {
    category: "Trải nghiệm khách hàng & Vận hành",
    items: [
      { id: "cx_dashboard", name: "Tổng Quan CX / VOC Dashboard", desc: "CSAT, NPS, Tỷ lệ lỗi, Sentiment & Chủ đề" },
      { id: "funnel", name: "Hành Trình Khách Hàng & Funnel", desc: "Phễu chuyển đổi 5 bước eKYC" },
      { id: "sla_dashboard", name: "Dashboard Chất Lượng SLA", desc: "Uptime 99.99%, tốc độ phản hồi App & TAT" },
      { id: "incident_dashboard", name: "Quản Trị Sự Cố Công Nghệ", desc: "Sự cố P1/P2/P3, MTTR & Nhật ký xử lý" },
      { id: "root_cause", name: "Nguyên Nhân Gốc Rễ RCA (4P)", desc: "Mô hình 4P (Con người, Quy trình, Tech, Chính sách)" },
      { id: "quote", name: "Tiếng Nói Khách Hàng (VOC Quote)", desc: "Trích dẫn nguyên văn phản hồi ấn tượng" },
      { id: "process", name: "Quy Trình Nghiệp Vụ 5 Bước", desc: "Quy trình tác nghiệp kèm điểm kiểm soát" },
      { id: "ui_showcase", name: "Trình Bày Sản Phẩm & UI", desc: "Giao diện sản phẩm khung Web/App" },
      { id: "case_study", name: "Tổng Quan Dự Án / Case Study", desc: "Bài toán, giải pháp & Kết quả đạt được" }
    ]
  },
  {
    category: "Quản trị, Rủi ro & Chiến lược",
    items: [
      { id: "comparison", name: "So Sánh Sản Phẩm / Đối Thủ", desc: "Bảng đối chiếu tiêu chí MB vs Ngân hàng khác" },
      { id: "risk_matrix", name: "Ma Trận Đánh Giá Rủi Ro Heatmap", desc: "Heatmap ma trận Xác suất vs Tác động" },
      { id: "controls_compliance", name: "Ma Trận Kiểm Soát & Tuân Thủ", desc: "Kiểm tra tuân thủ quy định pháp luật" },
      { id: "decision_matrix", name: "Ma Trận Ra Quyết Định", desc: "Chấm điểm trọng số để chọn giải pháp tối ưu" },
      { id: "scenario_analysis", name: "Phân Tích 3 Kịch Bản", desc: "Kịch bản Thận trọng, Cơ sở, Tích cực" },
      { id: "roadmap", name: "Lộ Trình Triển Khai (Roadmap)", desc: "Timeline 4 giai đoạn dự án chiến lược" },
      { id: "project_status", name: "Báo Cáo Tiến Độ Dự Án PMO", desc: "Đèn trạng thái RAG & Milestones" },
      { id: "problem_solution", name: "Vấn Đề → Dữ Liệu → Giải Pháp", desc: "3 thẻ logic: Bối cảnh, Số liệu, Giải pháp" },
      { id: "action_tracker", name: "Bảng Theo Dõi Hành Động", desc: "Phân công công việc, Owner, Hạn chót" }
    ]
  }
];

function initLayoutCatalogModal() {
  if (!btnOpenLayoutCatalog || !layoutCatalogModal) return;

  btnOpenLayoutCatalog.addEventListener('click', () => {
    renderCatalogContent();
    layoutCatalogModal.style.display = 'flex';
  });

  if (btnCloseLayoutCatalog) {
    btnCloseLayoutCatalog.addEventListener('click', () => {
      layoutCatalogModal.style.display = 'none';
    });
  }

  layoutCatalogModal.addEventListener('click', (e) => {
    if (e.target === layoutCatalogModal) layoutCatalogModal.style.display = 'none';
  });
}

function renderCatalogContent() {
  if (!layoutCatalogBody) return;
  layoutCatalogBody.innerHTML = MB_40_LAYOUTS_CATALOG.map(cat => `
    <div class="layout-catalog-category">
      <div class="layout-category-title">
        <span>📁</span> ${escapeHtml(cat.category)}
        <span class="badge" style="background: rgba(99,102,241,0.2); color: #818cf8; font-size: 0.72rem; margin-left: 6px;">${cat.items.length} Layouts</span>
      </div>
      <div class="layout-catalog-cards-grid">
        ${cat.items.map(it => `
          <div class="layout-catalog-card" data-layout-id="${it.id}">
            <div>
              <div class="layout-card-header">
                <span class="layout-card-name">${escapeHtml(it.name)}</span>
                <span class="layout-card-id">${it.id}</span>
              </div>
              <p class="layout-card-desc">${escapeHtml(it.desc)}</p>
            </div>
            <button type="button" class="btn-apply-layout-chip" data-apply-layout="${it.id}">Áp Dụng Cho Slide Hiện Tại</button>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  layoutCatalogBody.querySelectorAll('[data-apply-layout]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const layoutId = btn.dataset.applyLayout;
      applyLayoutToCurrentSlide(layoutId);
      layoutCatalogModal.style.display = 'none';
    });
  });

  layoutCatalogBody.querySelectorAll('.layout-catalog-card').forEach(card => {
    card.addEventListener('click', () => {
      const layoutId = card.dataset.layoutId;
      applyLayoutToCurrentSlide(layoutId);
      layoutCatalogModal.style.display = 'none';
    });
  });
}

function applyLayoutToCurrentSlide(layoutId) {
  if (!currentDeck || !currentDeck.slides[currentSlideIndex]) return;
  currentDeck.slides[currentSlideIndex].layout = layoutId;
  if (selectCurrentSlideLayout) selectCurrentSlideLayout.value = layoutId;
  renderCurrentSlide();
  renderSlideThumbnails();
  showToast(`🎉 Đã áp dụng bố cục: "${layoutId}" cho Slide ${currentSlideIndex + 1}`, 'success');
}

function initJsonDeckEditorModal() {
  if (!btnOpenJsonDeckEditor || !jsonDeckEditorModal) return;

  btnOpenJsonDeckEditor.addEventListener('click', () => {
    if (!currentDeck) {
      showToast('Chưa có dữ liệu bài thuyết trình!', 'error');
      return;
    }
    jsonDeckTextarea.value = JSON.stringify(currentDeck, null, 2);
    if (jsonEditorStatusbar) jsonEditorStatusbar.innerHTML = `<span>Tổng số: ${currentDeck.slides.length} slides • Hợp lệ</span>`;
    jsonDeckEditorModal.style.display = 'flex';
  });

  if (btnCloseJsonDeckEditor) {
    btnCloseJsonDeckEditor.addEventListener('click', () => {
      jsonDeckEditorModal.style.display = 'none';
    });
  }

  jsonDeckEditorModal.addEventListener('click', (e) => {
    if (e.target === jsonDeckEditorModal) jsonDeckEditorModal.style.display = 'none';
  });

  if (btnCopyJsonDeck) {
    btnCopyJsonDeck.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(jsonDeckTextarea.value);
        showToast('📋 Đã sao chép toàn bộ JSON Deck vào bộ nhớ tạm!', 'success');
      } catch (e) {
        jsonDeckTextarea.select();
        document.execCommand('copy');
        showToast('📋 Đã sao chép JSON!', 'success');
      }
    });
  }

  if (btnFormatJsonDeck) {
    btnFormatJsonDeck.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(jsonDeckTextarea.value);
        jsonDeckTextarea.value = JSON.stringify(parsed, null, 2);
        showToast('✨ Đã định dạng JSON chuẩn!', 'info');
      } catch (err) {
        showToast('Lỗi cú pháp JSON: ' + err.message, 'error');
      }
    });
  }

  if (btnApplyJsonDeck) {
    btnApplyJsonDeck.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(jsonDeckTextarea.value);
        if (!parsed || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
          throw new Error('JSON deck phải chứa mảng "slides" không rỗng.');
        }
        currentDeck = parsed;
        currentSlideIndex = 0;
        renderCurrentSlide();
        renderSlideThumbnails();
        jsonDeckEditorModal.style.display = 'none';
        showToast(`💾 Đã nạp thành công ${parsed.slides.length} slides từ JSON!`, 'success');
      } catch (err) {
        showToast('Không thể áp dụng JSON: ' + err.message, 'error');
      }
    });
  }
}

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadConfig();
  initBrandKit();
  initLayoutCatalogModal();
  initJsonDeckEditorModal();

  // Default: last 6 months
  setDateRange(180);
});

