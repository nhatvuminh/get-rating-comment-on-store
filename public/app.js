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

// Quick date buttons
document.querySelectorAll('.btn-chip[data-days]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setDateRange(parseInt(btn.dataset.days));
  });
});

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

async function scrape(platform) {
  if (!validateInputs(platform)) return;

  setButtonsDisabled(true);
  resultsGrid.innerHTML = '';
  resultsSection.style.display = 'none';

  const results = [];

  try {
    if (platform === 'android' || platform === 'both') {
      showProgress('Đang lấy đánh giá từ Google Play...', 30, 'Quá trình này có thể mất 1-2 phút');

      try {
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

        if (!response.ok) {
          results.push({ platform: 'android', error: data.error });
        } else {
          results.push({ platform: 'android', ...data });
        }
      } catch (err) {
        results.push({ platform: 'android', error: err.message });
      }
    }

    if (platform === 'ios' || platform === 'both') {
      showProgress('Đang lấy đánh giá từ App Store...', 70, 'Quá trình này có thể mất 1-2 phút');

      try {
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

        if (!response.ok) {
          results.push({ platform: 'ios', error: data.error });
        } else {
          results.push({ platform: 'ios', ...data });
        }
      } catch (err) {
        results.push({ platform: 'ios', error: err.message });
      }
    }

    showProgress('Hoàn tất!', 100);
    await new Promise(r => setTimeout(r, 500));
    hideProgress();

    // Show results
    displayResults(results);

    // Auto-download files for successful results
    const successResults = results.filter(r => !r.error && r.filePath);
    if (successResults.length > 0) {
      showToast(`Đang tự động tải ${successResults.length} file...`, 'success');
      for (let i = 0; i < successResults.length; i++) {
        // Stagger downloads to avoid browser blocking
        await new Promise(r => setTimeout(r, i * 500));
        downloadFile(successResults[i].filePath);
      }
    }
  } finally {
    setButtonsDisabled(false);
  }
}

function displayResults(results) {
  resultsGrid.innerHTML = '';
  resultsSection.style.display = 'block';

  results.forEach(result => {
    const card = document.createElement('div');
    
    if (result.error) {
      card.className = `result-card error`;
      card.innerHTML = `
        <div class="result-header">
          <span class="result-store">
            ${result.platform === 'android' ? '🤖' : '🍎'} 
            ${result.platform === 'android' ? 'Google Play' : 'App Store'}
          </span>
        </div>
        <p class="result-error">❌ ${result.error}</p>
      `;
    } else {
      card.className = `result-card ${result.platform}`;
      card.innerHTML = `
        <div class="result-header">
          <span class="result-store">
            ${result.platform === 'android' ? '🤖' : '🍎'} 
            ${result.platform === 'android' ? 'Google Play' : 'App Store'}
          </span>
        </div>
        <div class="result-count">${result.totalReviews.toLocaleString()}</div>
        <div class="result-label">đánh giá được tìm thấy</div>
        <button class="btn-download" onclick="downloadFile('${result.filePath}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Tải file ${result.platform === 'android' ? 'android_rating_comment.xlsx' : 'ios_rating_comment.xlsx'}
        </button>
      `;
    }

    resultsGrid.appendChild(card);
  });

  // Scroll to results
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function downloadFile(path) {
  const a = document.createElement('a');
  a.href = `${API_BASE}${path}`;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Đang tải file...', 'success');
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
