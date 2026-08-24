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
