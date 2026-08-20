const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const ExcelJS = require('exceljs');

// Dynamic getter for google-play-scraper to avoid ERR_REQUIRE_ESM on Vercel
let gplayInstance = null;
async function getGplay() {
  if (gplayInstance) return gplayInstance;
  try {
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    const mod = await dynamicImport('google-play-scraper');
    gplayInstance = mod.default || mod;
    if (gplayInstance && gplayInstance.default && gplayInstance.default.app) {
      gplayInstance = gplayInstance.default;
    }
  } catch (e) {
    console.error('Dynamic import via Function failed, trying require fallback:', e);
    try {
      const mod = require('google-play-scraper');
      gplayInstance = (mod && mod.default && mod.default.app) ? mod.default : mod;
    } catch (err) {
      console.error('Failed to load google-play-scraper:', err);
      throw new Error(`Không thể load module google-play-scraper: ${err.message}`);
    }
  }
  return gplayInstance;
}

// Prevent unhandled errors from crashing serverless function
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

// Helper: fetch JSON from URL
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchJSON(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Không thể parse JSON response')); }
      });
    }).on('error', reject);
  });
}

const app = express();
const CONFIG_PATH = process.env.VERCEL ? path.join('/tmp', 'config.json') : path.join(__dirname, '..', 'config.json');
const OUTPUT_DIR = process.env.VERCEL ? path.join('/tmp', 'output') : path.join(__dirname, '..', 'output');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    try {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    } catch (e) {}
  }
}
ensureOutputDir();

// Load saved config
app.get(['/api/config', '/config'], (req, res) => {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return res.json(config);
    }
    res.json({});
  } catch (err) {
    res.json({});
  }
});

// Save config
app.post(['/api/config', '/config'], (req, res) => {
  try {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: extract Google Play app ID from URL
function extractGooglePlayId(url) {
  if (!url) return null;
  const match = url.match(/id=([a-zA-Z0-9._]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9._]+$/.test(url.trim())) return url.trim();
  return null;
}

// Helper: extract App Store app ID from URL
function extractAppStoreId(url) {
  if (!url) return null;
  const match = url.match(/\/id(\d+)/);
  if (match) return parseInt(match[1]);
  if (/^\d+$/.test(url.trim())) return parseInt(url.trim());
  return null;
}

// Helper: get country code from App Store URL
function extractAppStoreCountry(url) {
  if (!url) return 'vn';
  const match = url.match(/\/([a-z]{2})\/app\//);
  return match ? match[1] : 'vn';
}

// Scrape Google Play reviews
app.post(['/api/scrape/android', '/scrape/android'], async (req, res) => {
  try {
    const { url, dateFrom, dateTo } = req.body || {};
    const appId = extractGooglePlayId(url);

    if (!appId) {
      return res.status(400).json({ error: 'Không thể lấy App ID từ URL. Vui lòng kiểm tra lại đường dẫn Google Play.' });
    }

    const gplay = await getGplay();
    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    let allReviews = [];
    let nextToken = undefined;
    const MAX_PAGES = 30;
    let pageCount = 0;
    const startTime = Date.now();
    const TIMEOUT_LIMIT = 45000;

    console.log(`[Android] Bắt đầu scraping app: ${appId}`);
    console.log(`[Android] Khoảng thời gian: ${dateFrom} đến ${dateTo}`);

    const sortOption = (gplay.sort && gplay.sort.NEWEST !== undefined) ? gplay.sort.NEWEST : 2;

    while (pageCount < MAX_PAGES) {
      if (Date.now() - startTime > TIMEOUT_LIMIT) {
        console.log(`[Android] Đạt giới hạn thời gian serverless (45s), dừng và trả về ${allReviews.length} kết quả`);
        break;
      }

      pageCount++;
      const options = {
        appId: appId,
        sort: sortOption,
        num: 150,
        lang: 'vi',
        country: 'vn',
      };

      if (nextToken) {
        options.nextPaginationToken = nextToken;
      }

      const result = await gplay.reviews(options);
      const reviews = result.data || [];
      nextToken = result.nextPaginationToken;

      if (reviews.length === 0) break;

      let hasOlderReview = false;

      for (const review of reviews) {
        const reviewDate = new Date(review.date);
        if (reviewDate >= startDate && reviewDate <= endDate) {
          allReviews.push({
            userName: review.userName || 'Ẩn danh',
            rating: review.score,
            comment: review.text || '',
            date: reviewDate.toISOString().split('T')[0],
            thumbsUp: review.thumbsUp || 0,
            replyText: review.replyText || '',
            replyDate: review.replyDate ? new Date(review.replyDate).toISOString().split('T')[0] : '',
          });
        }
        if (reviewDate < startDate) {
          hasOlderReview = true;
        }
      }

      console.log(`[Android] Trang ${pageCount}: ${reviews.length} reviews, tổng cộng: ${allReviews.length}`);

      if (hasOlderReview || !nextToken) break;

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[Android] Hoàn tất: ${allReviews.length} reviews trong khoảng thời gian`);

    // Generate Excel
    const fileName = 'android_rating_comment.xlsx';
    const { filePath, base64 } = await generateExcel(allReviews, fileName, appId, 'Google Play');
    
    res.json({
      success: true,
      totalReviews: allReviews.length,
      filePath: `/api/download/${fileName}`,
      fileName,
      base64,
      appId,
    });
  } catch (err) {
    console.error('[Android] Lỗi:', err);
    res.status(500).json({ error: `Lỗi khi scrape Google Play: ${err.message}` });
  }
});

// ─── iOS: HTML scraping helpers ───────────────────────────────────────────────

/**
 * Fetch a URL with redirect following and a browser-like User-Agent.
 */
function fetchAppStorePage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    };
    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchAppStorePage(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ html: data, status: res.statusCode }));
    }).on('error', reject);
  });
}

/**
 * Extract reviews from App Store HTML page's embedded serialized-server-data JSON.
 * Returns an array of review objects with fields: id, userName, rating, title, comment, date, updated, version.
 */
function extractReviewsFromAppStoreHtml(html) {
  const scriptMatch = html.match(/<script[^>]+id="serialized-server-data"[^>]*>([\s\S]+?)<\/script>/);
  if (!scriptMatch) {
    console.log('[iOS HTML] Không tìm thấy serialized-server-data trong HTML');
    return [];
  }

  let parsed;
  try {
    parsed = JSON.parse(scriptMatch[1]);
  } catch (e) {
    console.log('[iOS HTML] Không thể parse serialized-server-data JSON:', e.message);
    return [];
  }

  const reviews = [];
  function walk(obj) {
    if (!obj || typeof obj !== 'object') return;
    if (obj['$kind'] === 'Review' && obj.id) {
      reviews.push({
        id: String(obj.id),
        userName: obj.reviewerName || 'Ẩn danh',
        rating: typeof obj.rating === 'number' ? obj.rating : parseInt(obj.rating) || 0,
        title: obj.title || '',
        comment: obj.contents || '',
        updated: obj.date || null,
        date: obj.date ? new Date(obj.date).toISOString().split('T')[0] : '',
        version: obj.version || '',
      });
      return;
    }
    if (Array.isArray(obj)) {
      obj.forEach(walk);
      return;
    }
    Object.values(obj).forEach(walk);
  }
  walk(parsed);

  // Deduplicate by review ID
  const seen = new Set();
  return reviews.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

/**
 * Scrape App Store reviews by fetching the HTML page directly.
 * Returns an array of reviews.
 */
async function scrapeAppStoreHtml(appId, country, slug) {
  // Construct the reviews URL: ?see-all=reviews forces the reviews section to be server-rendered
  const reviewsUrl = slug
    ? `https://apps.apple.com/${country}/app/${slug}/id${appId}?see-all=reviews`
    : `https://apps.apple.com/${country}/app/id${appId}?see-all=reviews`;

  console.log(`[iOS HTML] Fetching: ${reviewsUrl}`);
  const { html, status } = await fetchAppStorePage(reviewsUrl);
  console.log(`[iOS HTML] HTTP status: ${status}, HTML size: ${html.length} bytes`);

  if (status !== 200) {
    console.log(`[iOS HTML] Không thể lấy trang App Store (status ${status})`);
    return [];
  }

  const reviews = extractReviewsFromAppStoreHtml(html);
  console.log(`[iOS HTML] Tìm thấy ${reviews.length} reviews từ HTML`);
  return reviews;
}

/**
 * Extract slug from App Store URL (the part between /app/ and /id).
 * e.g. "https://apps.apple.com/vn/app/pgbank-biz/id6755713686" → "pgbank-biz"
 */
function extractAppStoreSlug(url) {
  if (!url) return null;
  const match = url.match(/\/app\/([^/]+)\/id\d+/);
  return match ? match[1] : null;
}

/**
 * Fallback: fetch iTunes RSS reviews. Unreliable but can return more results when it works.
 */
async function fetchITunesReviews(country, appId, page) {
  const urlPatterns = [
    `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json`,
    `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/page=${page}/json`,
    `https://itunes.apple.com/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json?cc=${country}`,
  ];

  for (const urlPattern of urlPatterns) {
    try {
      const data = await fetchJSON(urlPattern);
      if (!data || !data.feed) continue;
      let entries = data.feed.entry;
      if (!entries) continue;
      if (!Array.isArray(entries)) entries = [entries];
      const reviews = entries.filter(e => e['im:rating']);
      if (reviews.length > 0) return reviews;
    } catch (err) {
      // try next pattern
    }
  }
  return [];
}

// ─── iOS: Scrape route ─────────────────────────────────────────────────────────

app.post(['/api/scrape/ios', '/scrape/ios'], async (req, res) => {
  try {
    const { url, dateFrom, dateTo } = req.body || {};
    const appId = extractAppStoreId(url);
    const country = extractAppStoreCountry(url);
    const slug = extractAppStoreSlug(url);

    if (!appId) {
      return res.status(400).json({ error: 'Không thể lấy App ID từ URL. Vui lòng kiểm tra lại đường dẫn App Store.' });
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    const startTime = Date.now();
    const TIMEOUT_LIMIT = 40000;

    console.log(`[iOS] Bắt đầu scraping app ID: ${appId}, country: ${country}, slug: ${slug}`);
    console.log(`[iOS] Khoảng thời gian: ${dateFrom} đến ${dateTo}`);

    // ── Strategy 1: Scrape App Store HTML (always works, gives ~10 reviews) ──
    const htmlReviews = await scrapeAppStoreHtml(appId, country, slug);

    // ── Strategy 2: iTunes RSS fallback (intermittent, gives up to 500 reviews) ──
    const rssReviewsRaw = [];
    const MAX_RSS_PAGES = 10;
    for (let page = 1; page <= MAX_RSS_PAGES; page++) {
      if (Date.now() - startTime > TIMEOUT_LIMIT) {
        console.log(`[iOS RSS] Đạt giới hạn thời gian, dừng RSS ở trang ${page}`);
        break;
      }
      const entries = await fetchITunesReviews(country, appId, page);
      if (!entries || entries.length === 0) {
        console.log(`[iOS RSS] Trang ${page}: 0 reviews, dừng RSS`);
        break;
      }
      rssReviewsRaw.push(...entries);
      console.log(`[iOS RSS] Trang ${page}: ${entries.length} entries, tổng: ${rssReviewsRaw.length}`);

      // Check if all entries on this page are older than startDate — stop early
      const allOld = entries.every(e => {
        const d = e.updated && e.updated.label ? new Date(e.updated.label) : null;
        return d && d < startDate;
      });
      if (allOld) break;

      await new Promise(r => setTimeout(r, 300));
    }

    // Map RSS entries to internal format
    const rssReviews = rssReviewsRaw.map(e => {
      const updatedLabel = e.updated && e.updated.label ? e.updated.label : null;
      const reviewDate = updatedLabel ? new Date(updatedLabel) : null;
      return {
        id: e.id ? String(e.id.label || e.id) : null,
        userName: (e.author && e.author.name && e.author.name.label) || 'Ẩn danh',
        rating: parseInt((e['im:rating'] && e['im:rating'].label) || '0'),
        title: (e.title && e.title.label) || '',
        comment: (e.content && e.content.label) || '',
        updated: updatedLabel,
        date: reviewDate ? reviewDate.toISOString().split('T')[0] : '',
        version: (e['im:version'] && e['im:version'].label) || '',
      };
    }).filter(r => r.id);

    // ── Merge: combine HTML + RSS, deduplicate by id ──
    const allRaw = [...htmlReviews, ...rssReviews];
    const seenIds = new Set();
    const dedupedAll = allRaw.filter(r => {
      if (!r.id || seenIds.has(r.id)) return false;
      seenIds.add(r.id);
      return true;
    });

    console.log(`[iOS] Merged: ${htmlReviews.length} HTML + ${rssReviews.length} RSS = ${dedupedAll.length} unique reviews`);

    // ── Filter by date range ──
    const allReviews = dedupedAll.filter(r => {
      if (!r.updated) return false;
      const reviewDate = new Date(r.updated);
      return reviewDate >= startDate && reviewDate <= endDate;
    });

    // Strip internal id field before returning
    const finalReviews = allReviews.map(({ id, updated, ...rest }) => rest);

    console.log(`[iOS] Hoàn tất: ${finalReviews.length} reviews trong khoảng thời gian`);

    // Generate Excel
    const fileName = 'ios_rating_comment.xlsx';
    const { filePath, base64 } = await generateExcel(finalReviews, fileName, appId, 'App Store');

    res.json({
      success: true,
      totalReviews: finalReviews.length,
      filePath: `/api/download/${fileName}`,
      fileName,
      base64,
      appId: appId.toString(),
    });
  } catch (err) {
    console.error('[iOS] Lỗi:', err);
    res.status(500).json({ error: `Lỗi khi scrape App Store: ${err.message}` });
  }
});


// Generate Excel file
async function generateExcel(reviews, fileName, appId, storeName) {
  ensureOutputDir();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rating & Comment Scraper Tool';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Reviews', {
    properties: { defaultRowHeight: 22 },
  });

  const isAndroid = storeName === 'Google Play';

  if (isAndroid) {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Tên người dùng', key: 'userName', width: 25 },
      { header: 'Rating (Số sao)', key: 'rating', width: 16 },
      { header: 'Bình luận', key: 'comment', width: 60 },
      { header: 'Ngày đánh giá', key: 'date', width: 16 },
      { header: 'Lượt thích', key: 'thumbsUp', width: 12 },
      { header: 'Phản hồi từ nhà phát triển', key: 'replyText', width: 50 },
      { header: 'Ngày phản hồi', key: 'replyDate', width: 16 },
    ];
  } else {
    sheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Tên người dùng', key: 'userName', width: 25 },
      { header: 'Rating (Số sao)', key: 'rating', width: 16 },
      { header: 'Tiêu đề', key: 'title', width: 35 },
      { header: 'Bình luận', key: 'comment', width: 60 },
      { header: 'Ngày đánh giá', key: 'date', width: 16 },
      { header: 'Phiên bản ứng dụng', key: 'version', width: 18 },
    ];
  }

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: isAndroid ? 'FF1A73E8' : 'FF007AFF' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 30;

  // Add data rows
  reviews.forEach((review, index) => {
    const row = sheet.addRow({
      stt: index + 1,
      userName: review.userName,
      rating: parseFloat(review.rating.toFixed(1)),
      comment: review.comment,
      title: review.title || '',
      date: review.date,
      thumbsUp: review.thumbsUp,
      replyText: review.replyText || '',
      replyDate: review.replyDate || '',
      version: review.version || '',
    });

    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8F9FA' },
      };
    }

    const ratingCell = row.getCell('rating');
    ratingCell.alignment = { horizontal: 'center' };
    ratingCell.numFmt = '0.0';
    
    if (review.rating >= 4) {
      ratingCell.font = { bold: true, color: { argb: 'FF0D904F' } };
    } else if (review.rating >= 3) {
      ratingCell.font = { bold: true, color: { argb: 'FFE37400' } };
    } else {
      ratingCell.font = { bold: true, color: { argb: 'FFD93025' } };
    }

    row.getCell('comment').alignment = { wrapText: true, vertical: 'top' };
  });

  // Add summary sheet
  const summarySheet = workbook.addWorksheet('Tổng hợp', {
    properties: { defaultRowHeight: 25 },
  });

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews)
    : 0;
  const ratingCounts = [0, 0, 0, 0, 0];
  reviews.forEach(r => {
    if (r.rating >= 1 && r.rating <= 5) {
      ratingCounts[r.rating - 1]++;
    }
  });

  summarySheet.columns = [
    { header: 'Thông tin', key: 'label', width: 30 },
    { header: 'Giá trị', key: 'value', width: 25 },
  ];

  const summaryHeader = summarySheet.getRow(1);
  summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  summaryHeader.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: isAndroid ? 'FF34A853' : 'FF34C759' },
  };
  summaryHeader.height = 30;

  const summaryData = [
    { label: 'Nguồn', value: storeName },
    { label: 'App ID', value: appId.toString() },
    { label: 'Tổng số đánh giá', value: totalReviews },
    { label: 'Rating trung bình', value: parseFloat(avgRating.toFixed(2)) },
    { label: '', value: '' },
    { label: '⭐ 5 sao', value: ratingCounts[4] },
    { label: '⭐ 4 sao', value: ratingCounts[3] },
    { label: '⭐ 3 sao', value: ratingCounts[2] },
    { label: '⭐ 2 sao', value: ratingCounts[1] },
    { label: '⭐ 1 sao', value: ratingCounts[0] },
  ];

  summaryData.forEach((data, i) => {
    const row = summarySheet.addRow(data);
    row.font = { size: 11 };
    if (i === 3) {
      row.getCell('value').numFmt = '0.00';
      row.getCell('value').font = { bold: true, size: 14, color: { argb: 'FF1A73E8' } };
    }
  });

  sheet.autoFilter = {
    from: 'A1',
    to: `${String.fromCharCode(64 + sheet.columns.length)}1`,
  };

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const filePath = path.join(OUTPUT_DIR, fileName);
  try {
    await workbook.xlsx.writeFile(filePath);
  } catch (err) {
    console.error('Error writing excel to file:', err.message);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = buffer.toString('base64');

  return { filePath, base64 };
}

// Download files
app.get(['/api/download/:filename', '/download/:filename'], (req, res) => {
  ensureOutputDir();
  const filePath = path.join(OUTPUT_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File không tồn tại hoặc đã hết hạn trên serverless. Vui lòng thực hiện scrape lại để tải.' });
  }
});

// Get app info for preview
app.post(['/api/app-info/android', '/app-info/android'], async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'URL không được để trống' });
    }
    const appId = extractGooglePlayId(url);
    if (!appId) {
      return res.status(400).json({ error: 'URL không hợp lệ. Không tìm thấy Google Play App ID' });
    }
    const gplay = await getGplay();
    const appInfo = await gplay.app({ appId, lang: 'vi', country: 'vn' });
    res.json({
      title: appInfo.title,
      developer: appInfo.developer,
      score: appInfo.score,
      ratings: appInfo.ratings,
      reviews: appInfo.reviews,
      icon: appInfo.icon,
      appId,
    });
  } catch (err) {
    console.error('[Android App Info Error]:', err);
    res.status(500).json({ error: `Không thể lấy thông tin ứng dụng Google Play: ${err.message}` });
  }
});

app.post(['/api/app-info/ios', '/app-info/ios'], async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url) {
      return res.status(400).json({ error: 'URL không được để trống' });
    }
    const appId = extractAppStoreId(url);
    const country = extractAppStoreCountry(url);
    if (!appId) {
      return res.status(400).json({ error: 'URL không hợp lệ. Không tìm thấy App Store ID' });
    }
    const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
    const data = await fetchJSON(lookupUrl);
    if (!data || !data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy ứng dụng trên App Store' });
    }
    const appInfo = data.results[0];
    res.json({
      title: appInfo.trackName,
      developer: appInfo.artistName,
      score: appInfo.averageUserRating,
      ratings: appInfo.userRatingCount,
      reviews: appInfo.userRatingCount,
      icon: appInfo.artworkUrl512 || appInfo.artworkUrl100,
      appId: appId.toString(),
    });
  } catch (err) {
    console.error('[iOS App Info Error]:', err);
    res.status(500).json({ error: `Không thể lấy thông tin ứng dụng App Store: ${err.message}` });
  }
});

module.exports = app;

