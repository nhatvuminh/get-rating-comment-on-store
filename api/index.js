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
    const startDate = parseFlexibleDate(dateFrom);
    const endDate = parseFlexibleDate(dateTo);
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    let allReviews = [];
    let rawReviewsBuffer = [];
    const seenIds = new Set();
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
        paginate: true,
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

      let addedInThisPage = 0;
      let hasOlderInPage = false;

      for (const review of reviews) {
        const reviewId = review.id || `${review.userName}_${review.date}_${review.text}`;
        if (seenIds.has(reviewId)) continue;
        seenIds.add(reviewId);
        addedInThisPage++;

        const reviewDate = new Date(review.date);
        const item = {
          userName: review.userName || 'Ẩn danh',
          rating: Number(review.score || 5),
          comment: review.text || review.comment || '',
          date: reviewDate && !isNaN(reviewDate.getTime()) ? reviewDate.toISOString().split('T')[0] : '',
          thumbsUp: review.thumbsUp || 0,
          replyText: review.replyText || '',
          replyDate: review.replyDate ? new Date(review.replyDate).toISOString().split('T')[0] : '',
        };

        rawReviewsBuffer.push(item);

        const matchStart = !startDate || isNaN(startDate.getTime()) || (reviewDate >= startDate);
        const matchEnd = !endDate || isNaN(endDate.getTime()) || (reviewDate <= endDate);

        if (matchStart && matchEnd) {
          allReviews.push(item);
        }
        if (startDate && !isNaN(startDate.getTime()) && reviewDate < startDate) {
          hasOlderInPage = true;
        }
      }

      console.log(`[Android] Trang ${pageCount}: ${reviews.length} reviews, mới: ${addedInThisPage}, khớp ngày: ${allReviews.length}`);

      if (addedInThisPage === 0 || !nextToken) break;
      if (hasOlderInPage && pageCount >= 3) break;

      await new Promise(resolve => setTimeout(resolve, 150));
    }

    if (allReviews.length === 0 && rawReviewsBuffer.length > 0) {
      allReviews = rawReviewsBuffer;
    }

    // Sort descending by date (newest first)
    allReviews.sort((a, b) => {
      const dA = a.date ? new Date(a.date).getTime() : 0;
      const dB = b.date ? new Date(b.date).getTime() : 0;
      return dB - dA;
    });

    // Generate Excel
    const fileName = 'android_rating_comment.xlsx';
    const { filePath, base64 } = await generateExcel(allReviews, fileName, appId, 'Google Play');
    
    const avgRating = allReviews.length > 0 ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) : 0;
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allReviews.forEach(r => { if (ratingCounts[r.rating] !== undefined) ratingCounts[r.rating]++; });

    const summaryTopics = analyzeSummaryTopics(allReviews);

    res.json({
      success: true,
      totalReviews: allReviews.length,
      avgRating: parseFloat(avgRating.toFixed(2)),
      ratingCounts,
      reviews: allReviews,
      summaryTopics,
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

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      let html = '';
      res.on('data', c => html += c);
      res.on('end', () => resolve(html));
    }).on('error', reject);
  });
}

// Helper: Fetch JSON with retry logic to prevent rate-limiting and socket drops
function fetchJsonWithRetry(url, headers, maxRetries = 3) {
  return new Promise(async (resolve) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const data = await new Promise((r) => {
        https.get(url, { headers }, (res) => {
          if (res.statusCode !== 200) return r(null);
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try { r(JSON.parse(d)); } catch(e) { r(null); }
          });
        }).on('error', () => r(null));
      });

      if (data && data.data) return resolve(data);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, attempt * 300));
      }
    }
    resolve(null);
  });
}

// Helper: Fetch paginated App Store reviews from Apple Storefront API with fast parallel batching & redirect support
async function fetchAppStoreReviewsFromAPI(country, appId, startDate, endDate, maxPages = 30) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://apps.apple.com/',
    'Origin': 'https://apps.apple.com',
    'Accept': 'application/json'
  };

  const targetCountry = country || 'vn';
  const seenIds = new Set();
  const reviews = [];
  const limit = 20;

  const fetchSinglePage = (offset, retries = 2) => {
    const url = `https://apps.apple.com/api/apps/v1/catalog/${targetCountry}/apps/${appId}/reviews?platform=iphone&l=vi&limit=${limit}&offset=${offset}`;
    
    const getWithRedirect = (targetUrl, depth = 0) => {
      return new Promise((resolve) => {
        if (depth > 5) return resolve([]);
        https.get(targetUrl, { headers }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            let loc = res.headers.location;
            if (loc.startsWith('/')) loc = 'https://apps.apple.com' + loc;
            return resolve(getWithRedirect(loc, depth + 1));
          }
          if (res.statusCode !== 200) return resolve([]);
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => {
            try {
              const parsed = JSON.parse(d);
              resolve(parsed.data || []);
            } catch (e) { resolve([]); }
          });
        }).on('error', () => resolve([]));
      });
    };

    return new Promise(async (resolve) => {
      for (let r = 0; r <= retries; r++) {
        const resData = await getWithRedirect(url);
        if (Array.isArray(resData) && resData.length > 0) return resolve(resData);
        if (r < retries) await new Promise(res => setTimeout(res, 200 * (r + 1)));
      }
      resolve([]);
    });
  };

  const BATCH_SIZE = 5;
  let emptyBatchesCount = 0;

  for (let b = 0; b < maxPages; b += BATCH_SIZE) {
    const promises = [];
    for (let i = b; i < b + BATCH_SIZE && i < maxPages; i++) {
      promises.push(fetchSinglePage(i * limit));
    }

    const batchResults = await Promise.all(promises);
    let totalBatchItems = 0;

    for (const items of batchResults) {
      if (!Array.isArray(items)) continue;
      totalBatchItems += items.length;

      for (const item of items) {
        if (!item || !item.attributes) continue;
        const reviewId = item.id || `${item.attributes.userName}_${item.attributes.date}`;
        if (seenIds.has(reviewId)) continue;
        seenIds.add(reviewId);

        const rDate = new Date(item.attributes.date);
        const isValidDate = !isNaN(rDate.getTime());

        const matchStart = !startDate || isNaN(startDate.getTime()) || (isValidDate && rDate >= startDate);
        const matchEnd = !endDate || isNaN(endDate.getTime()) || (isValidDate && rDate <= endDate);

        if (matchStart && matchEnd) {
          reviews.push({
            userName: item.attributes.userName || 'Ẩn danh',
            rating: Number(item.attributes.rating || 5),
            title: item.attributes.title || '',
            comment: item.attributes.review || '',
            date: isValidDate ? rDate.toISOString().split('T')[0] : '',
            version: item.attributes.version || ''
          });
        }
      }
    }

    if (totalBatchItems === 0) {
      emptyBatchesCount++;
      if (emptyBatchesCount >= 2) break;
    } else {
      emptyBatchesCount = 0;
    }
  }

  return reviews;
}

// Helper: Fetch App Store reviews from Apple Web Page HTML (Fallback)
function fetchAppStoreReviewsFromWeb(country, appId, fullUrl) {
  return new Promise(async (resolve) => {
    try {
      const targetUrl = (fullUrl && fullUrl.startsWith('http')) ? fullUrl : `https://apps.apple.com/${country || 'vn'}/app/id${appId}`;
      const html = await fetchHtml(targetUrl);
      const match = html.match(/id=\x22serialized-server-data\x22>([\s\S]*?)<\/script>/);
      if (!match) return resolve([]);
      const json = JSON.parse(match[1]);
      const reviews = [];
      const visited = new Set();
      
      function walk(obj) {
        if (!obj || typeof obj !== 'object' || visited.has(obj)) return;
        visited.add(obj);
        if (obj.rating && obj.reviewerName) {
          const idKey = `${obj.reviewerName}_${obj.date}_${obj.contents}`;
          if (!visited.has(idKey)) {
            visited.add(idKey);
            reviews.push({
              userName: obj.reviewerName || 'Ẩn danh',
              rating: Number(obj.rating),
              comment: obj.contents || '',
              title: obj.title || '',
              date: obj.date ? obj.date.split('T')[0] : '',
              version: obj.version || ''
            });
          }
        }
        for (const k in obj) {
          if (obj[k] && typeof obj[k] === 'object') walk(obj[k]);
        }
      }
      
      walk(json);
      resolve(reviews);
    } catch (err) {
      resolve([]);
    }
  });
}

function parseFlexibleDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  const str = String(dateStr).trim();
  
  // DD/MM/YYYY format check
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  // YYYY-MM-DD format check
  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }
  
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

// Scrape App Store reviews
app.post(['/api/scrape/ios', '/scrape/ios'], async (req, res) => {
  try {
    const { url, dateFrom, dateTo } = req.body || {};
    const appId = extractAppStoreId(url);
    const country = extractAppStoreCountry(url);

    if (!appId) {
      return res.status(400).json({ error: 'Không thể lấy App ID từ URL. Vui lòng kiểm tra lại đường dẫn App Store.' });
    }

    const startDate = parseFlexibleDate(dateFrom);
    const endDate = parseFlexibleDate(dateTo);
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
    }

    console.log(`[iOS] Bắt đầu scraping app ID: ${appId}, country: ${country}`);
    console.log(`[iOS] Khoảng thời gian: ${dateFrom} đến ${dateTo}`);

    // 1. Primary: Fetch via Storefront API with full pagination & deduplication
    let allReviews = await fetchAppStoreReviewsFromAPI(country, appId, startDate, endDate);

    // 2. Fallback: If Storefront API yields 0, try Web HTML scraper
    if (allReviews.length === 0) {
      const webReviews = await fetchAppStoreReviewsFromWeb(country, appId, url);
      for (const review of webReviews) {
        const rDate = new Date(review.date);
        const isValidDate = !isNaN(rDate.getTime());
        const matchStart = !startDate || isNaN(startDate.getTime()) || (isValidDate && rDate >= startDate);
        const matchEnd = !endDate || isNaN(endDate.getTime()) || (isValidDate && rDate <= endDate);

        if (matchStart && matchEnd) {
          allReviews.push(review);
        }
      }
      if (allReviews.length === 0 && webReviews.length > 0) {
        allReviews = webReviews;
      }
    }

    // Sort descending by date (newest first)
    allReviews.sort((a, b) => {
      const dA = a.date ? new Date(a.date).getTime() : 0;
      const dB = b.date ? new Date(b.date).getTime() : 0;
      return dB - dA;
    });

    console.log(`[iOS] Hoàn tất: ${allReviews.length} reviews`);

    // Generate Excel
    const fileName = 'ios_rating_comment.xlsx';
    const { filePath, base64 } = await generateExcel(allReviews, fileName, appId, 'App Store');
    
    const avgRating = allReviews.length > 0 ? (allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length) : 0;
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allReviews.forEach(r => { if (ratingCounts[r.rating] !== undefined) ratingCounts[r.rating]++; });

    const summaryTopics = analyzeSummaryTopics(allReviews);

    res.json({
      success: true,
      totalReviews: allReviews.length,
      avgRating: parseFloat(avgRating.toFixed(2)),
      ratingCounts,
      reviews: allReviews,
      summaryTopics,
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

// Scrape Both Stores (Android + iOS) & Generate Aggregated Summary Report
app.post(['/api/scrape/both', '/scrape/both'], async (req, res) => {
  try {
    const { urlAndroid, urlIos, url, dateFrom, dateTo } = req.body || {};
    const targetUrlAndroid = urlAndroid || url;
    const targetUrlIos = urlIos || url;

    const startDate = parseFlexibleDate(dateFrom);
    const endDate = parseFlexibleDate(dateTo);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    console.log(`[Both] Bắt đầu scrape cả 2 stores... Khoảng thời gian: ${dateFrom} đến ${dateTo}`);

    let androidReviews = [];
    let iosReviews = [];

    // 1. Scrape Android
    const appIdAndroid = extractGooglePlayId(targetUrlAndroid);
    if (appIdAndroid) {
      try {
        const gplay = await getGplay();
        const seenIdsAndroid = new Set();
        let nextToken = undefined;
        for (let page = 0; page < 30; page++) {
          const opts = { appId: appIdAndroid, sort: gplay.sort ? gplay.sort.NEWEST : 2, paginate: true, lang: 'vi', country: 'vn' };
          if (targetUrlAndroid.includes('gl=')) opts.country = targetUrlAndroid.match(/gl=([a-zA-Z]+)/)[1];
          if (targetUrlAndroid.includes('hl=')) opts.lang = targetUrlAndroid.match(/hl=([a-zA-Z]+)/)[1];
          if (nextToken) opts.nextPaginationToken = nextToken;
          
          const result = await gplay.reviews(opts);
          const reviews = result.data || [];
          nextToken = result.nextPaginationToken;

          if (!reviews.length) break;
          let addedInThisPage = 0;
          let hasOlder = false;
          for (const item of reviews) {
            const reviewId = item.id || `${item.userName}_${item.date}_${item.text}`;
            if (seenIdsAndroid.has(reviewId)) continue;
            seenIdsAndroid.add(reviewId);
            addedInThisPage++;

            const rDate = new Date(item.date);
            if (startDate && rDate < startDate) { hasOlder = true; }
            const matchStart = !startDate || isNaN(startDate.getTime()) || (rDate >= startDate);
            const matchEnd = !endDate || isNaN(endDate.getTime()) || (rDate <= endDate);
            if (matchStart && matchEnd) {
              androidReviews.push({
                userName: item.userName || 'Ẩn danh',
                rating: Number(item.score || 5),
                comment: item.text || item.comment || '',
                date: rDate && !isNaN(rDate.getTime()) ? rDate.toISOString().split('T')[0] : '',
                thumbsUp: item.thumbsUp || 0,
                replyText: item.replyText || '',
                replyDate: item.replyDate ? new Date(item.replyDate).toISOString().split('T')[0] : ''
              });
            }
          }
          if (addedInThisPage === 0 || !nextToken) break;
          if (hasOlder && page >= 3) break;
        }
        androidReviews.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      } catch (e) {
        console.error('[Both] Android scrape error:', e.message);
      }
    }

    // 2. Scrape iOS
    const appIdIos = extractAppStoreId(targetUrlIos);
    const countryIos = extractAppStoreCountry(targetUrlIos);
    if (appIdIos) {
      try {
        iosReviews = await fetchAppStoreReviewsFromAPI(countryIos, appIdIos, startDate, endDate);
        if (iosReviews.length === 0) {
          const webReviews = await fetchAppStoreReviewsFromWeb(countryIos, appIdIos, targetUrlIos);
          iosReviews = webReviews.filter(r => {
            const d = new Date(r.date);
            return (!startDate || d >= startDate) && (!endDate || d <= endDate);
          });
        }
        iosReviews.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      } catch (e) {
        console.error('[Both] iOS scrape error:', e.message);
      }
    }

    const combinedReviews = [...androidReviews, ...iosReviews];
    const summaryTopics = analyzeSummaryTopics(combinedReviews);

    const fileName = 'tong_hop_rating_comment.xlsx';
    const { filePath, base64 } = await generateCombinedExcel(androidReviews, iosReviews, summaryTopics, fileName);

    const androidExcel = await generateExcel(androidReviews, 'android_rating_comment.xlsx', appIdAndroid || 'android', 'Google Play');
    const iosExcel = await generateExcel(iosReviews, 'ios_rating_comment.xlsx', appIdIos || 'ios', 'App Store');

    const totalCombined = combinedReviews.length;
    const avgCombined = totalCombined > 0 ? (combinedReviews.reduce((s, r) => s + r.rating, 0) / totalCombined) : 0;

    const androidAvg = androidReviews.length > 0 ? (androidReviews.reduce((s, r) => s + r.rating, 0) / androidReviews.length) : 0;
    const iosAvg = iosReviews.length > 0 ? (iosReviews.reduce((s, r) => s + r.rating, 0) / iosReviews.length) : 0;

    const androidRatingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    androidReviews.forEach(r => { if (androidRatingCounts[r.rating] !== undefined) androidRatingCounts[r.rating]++; });

    const iosRatingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    iosReviews.forEach(r => { if (iosRatingCounts[r.rating] !== undefined) iosRatingCounts[r.rating]++; });

    res.json({
      success: true,
      summary: {
        totalCombined,
        avgCombined: parseFloat(avgCombined.toFixed(2)),
        topics: summaryTopics,
        fileName,
        filePath: `/api/download/${fileName}`,
        base64
      },
      android: {
        totalReviews: androidReviews.length,
        avgRating: parseFloat(androidAvg.toFixed(2)),
        ratingCounts: androidRatingCounts,
        reviews: androidReviews,
        fileName: 'android_rating_comment.xlsx',
        filePath: androidExcel ? androidExcel.filePath : `/api/download/android_rating_comment.xlsx`,
        base64: androidExcel ? androidExcel.base64 : base64
      },
      ios: {
        totalReviews: iosReviews.length,
        avgRating: parseFloat(iosAvg.toFixed(2)),
        ratingCounts: iosRatingCounts,
        reviews: iosReviews,
        fileName: 'ios_rating_comment.xlsx',
        filePath: iosExcel ? iosExcel.filePath : `/api/download/ios_rating_comment.xlsx`,
        base64: iosExcel ? iosExcel.base64 : base64
      },
      fileName,
      filePath: `/api/download/${fileName}`,
      base64
    });
  } catch (err) {
    console.error('[Both] Lỗi:', err);
    res.status(500).json({ error: `Lỗi khi scrape tổng hợp: ${err.message}` });
  }
});

// Topic Analyzer for Summary Tab & Sheet
function analyzeSummaryTopics(reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return [];

  const topicDefs = [
    {
      id: 'positive_general',
      topic: 'Đánh giá chung tích cực',
      sentiment: '✅ Tốt',
      minRating: 4,
      keywords: ['tốt', 'rất tốt', 'ok', 'oke', 'tuyệt vời', 'phục vụ tốt', 'hài lòng', 'mượt', 'xịn', 'ngon', 'good', 'great', '5 sao', 'ưng ý', 'xuất sắc', 'dễ dùng', 'gọn', 'ổn'],
      defaultDetails: 'Khách hàng phản hồi "Tốt", "Rất tốt", "OK", "Tuyệt vời", "MB phục vụ rất tốt", hài lòng với trải nghiệm tổng thể'
    },
    {
      id: 'support_rm',
      topic: 'Hỗ trợ khách hàng / RM / Chi nhánh',
      sentiment: '⚠️ Chưa tốt',
      keywords: ['rm', 'nhân viên', 'chi nhánh', 'hỗ trợ', 'tư vấn', 'thái độ', 'liên hệ', 'phản hồi chậm', 'giải ngân', 'nghiệp vụ', 'kích hoạt', 'gọi', 'hotline'],
      defaultDetails: 'RM không nắm rõ nghiệp vụ; cung cấp sai thông tin; phản hồi chậm; khó liên hệ; hồ sơ giải ngân xử lý kéo dài; không hỗ trợ kích hoạt dịch vụ; thiếu cập nhật tiến độ hồ sơ'
    },
    {
      id: 'enterprise_features',
      topic: 'Thiếu tính năng cho khách hàng doanh nghiệp',
      sentiment: '⚠️ Chưa tốt',
      keywords: ['doanh nghiệp', 'tài khoản usd', 'hạn mức', 'bankhub', 'khoản vay', 'tất toán', 'bhxh', 'hóa đơn', 'người nhận', 'tính năng', 'ủy nhiệm chi', 'tên hóa đơn'],
      defaultDetails: 'Chưa hỗ trợ thêm tài khoản USD ngoài hệ thống online; chưa nâng hạn mức online; chưa có BankHub; chưa tự tất toán khoản vay; chưa đóng BHXH trên app; chưa đổi tên hóa đơn; chưa mặc định nội dung chuyển tiền; thiếu quản lý danh sách người nhận thông minh'
    },
    {
      id: 'statement_info',
      topic: 'Tra cứu thông tin, sao kê, khoản vay',
      sentiment: '⚠️ Chưa tốt',
      keywords: ['sao kê', 'lịch sử', 'giao dịch', 'lãi', 'chứng từ', 'thông báo', 'bảng tính', 'dự kiến', 'báo nợ', 'tra cứu', 'lãi vay'],
      defaultDetails: 'Khó xem lịch sử giao dịch; không xuất được sao kê; không xem được lãi phải thu; không có thông báo gốc/lãi dự kiến; không nhận được bảng tính lãi hàng tháng; khó tải chứng từ'
    },
    {
      id: 'system_app_bug',
      topic: 'Lỗi hệ thống/App/eBanking',
      sentiment: '⚠️ Chưa tốt',
      keywords: ['lỗi', 'error', '400', '500', 'treo', 'đăng nhập', 'xác thực', 'vào được', 'không sử dụng', 'gián đoạn', 'văng', 'out', 'chậm', 'lag', 'bị out', 'bị văng', 'sập', 'không vào được'],
      defaultDetails: 'Lỗi 400; hệ thống treo; app không sử dụng được; gián đoạn giao dịch; lỗi xác thực tài khoản'
    },
    {
      id: 'transfer_payment',
      topic: 'Chuyển tiền & Thanh toán quốc tế',
      sentiment: '⚠️ Chưa tốt',
      keywords: ['chuyển tiền', 'thanh toán', 'quốc tế', 'duyệt', 'phong tỏa', 'lệnh', 'ttqt', 'chậm nhận', 'tài khoản', 'chuyển khoản', 'lệnh chuyển'],
      defaultDetails: 'Chuyển tiền chậm nhận; không xác nhận được giao dịch; tài khoản người nhận không tồn tại nhưng lệnh vẫn được duyệt; không giao dịch được dù tài khoản không bị phong tỏa; quy trình TTQT không nhất quán'
    },
    {
      id: 'ui_ux',
      topic: 'Giao diện và trải nghiệm người dùng (UI/UX)',
      sentiment: '⚠️ Chưa tốt',
      keywords: ['giao diện', 'ui', 'ux', 'trải nghiệm', 'khó tìm', 'khó dùng', 'font', 'chữ', 'tỷ giá', 'chat', 'trực quan', 'rối mắt', 'khó xem', 'nhìn'],
      defaultDetails: 'Khó tìm lịch sử giao dịch; khó tra cứu tên ngân hàng; chat tỷ giá tự nhảy về tin nhắn mới; không hiển thị số tiền bằng chữ; danh sách người nhận chưa trực quan'
    },
    {
      id: 'etax',
      topic: 'eTax và dịch vụ thuế điện tử',
      sentiment: '⚠️ Chưa tốt',
      keywords: ['etax', 'thuế', 'nộp thuế', 'thuế điện tử', 'nộp ngân sách'],
      defaultDetails: 'Hồ sơ eTax ở trạng thái "Đã gửi sang ngân hàng" nhiều ngày; kích hoạt dịch vụ thuế điện tử chậm; thiếu hỗ trợ xử lý'
    },
    {
      id: 'cskh_enthusiastic',
      topic: 'Chăm sóc khách hàng nhiệt tình',
      sentiment: '✅ Tốt',
      minRating: 4,
      keywords: ['nhiệt tình', 'chu đáo', 'thân thiện', 'hỗ trợ nhanh', 'thái độ tốt', 'dịch vụ tốt'],
      defaultDetails: 'Khách hàng ghi nhận nhân viên hỗ trợ nhiệt tình, thái độ phục vụ tốt'
    },
    {
      id: 'excel_data',
      topic: 'Dữ liệu Excel và chứng từ',
      sentiment: '⚠️ Chưa tốt',
      keywords: ['excel', 'tải về', 'định dạng', 'text', 'number', 'sms', 'giấy báo nợ', 'xuất excel'],
      defaultDetails: 'File Excel tải về bị định dạng Text thay vì Number; không tải được giấy báo nợ thu phí SMS'
    },
    {
      id: 'company_info',
      topic: 'Cập nhật thông tin doanh nghiệp',
      sentiment: '⚠️ Chưa tốt',
      keywords: ['địa chỉ', 'tên doanh nghiệp', 'thông tin cty', 'cập nhật', 'đổi tên', 'tài khoản công ty'],
      defaultDetails: 'Chưa cập nhật địa chỉ doanh nghiệp; thay đổi tên doanh nghiệp trên tài khoản còn khó khăn'
    }
  ];

  const buckets = {};
  topicDefs.forEach(td => {
    buckets[td.id] = {
      topic: td.topic,
      sentiment: td.sentiment,
      count: 0,
      snippets: new Set(),
      defaultDetails: td.defaultDetails
    };
  });

  let otherPositiveCount = 0;
  let otherNegativeCount = 0;
  const otherPositiveSnippets = new Set();
  const otherNegativeSnippets = new Set();

  reviews.forEach(r => {
    const text = ((r.title || '') + ' ' + (r.comment || '')).toLowerCase();
    let matched = false;

    for (const td of topicDefs) {
      if (td.minRating && r.rating < td.minRating) continue;
      
      const hasKw = td.keywords.some(kw => text.includes(kw));
      if (hasKw) {
        matched = true;
        buckets[td.id].count++;
        if (r.comment && r.comment.length > 5 && buckets[td.id].snippets.size < 6) {
          buckets[td.id].snippets.add(r.comment.trim());
        }
        break;
      }
    }

    if (!matched) {
      if (r.rating >= 4) {
        otherPositiveCount++;
        if (r.comment && r.comment.length > 3) otherPositiveSnippets.add(r.comment.trim());
      } else {
        otherNegativeCount++;
        if (r.comment && r.comment.length > 3) otherNegativeSnippets.add(r.comment.trim());
      }
    }
  });

  const results = [];
  Object.keys(buckets).forEach(id => {
    const b = buckets[id];
    if (b.count > 0) {
      let detailText = '';
      if (b.snippets.size > 0) {
        detailText = Array.from(b.snippets).map(s => `"${s}"`).join('; ');
      } else {
        detailText = b.defaultDetails;
      }
      results.push({
        topic: b.topic,
        count: b.count,
        sentiment: b.sentiment,
        details: detailText
      });
    }
  });

  if (otherPositiveCount > 0) {
    results.push({
      topic: 'Các góp ý tích cực khác',
      count: otherPositiveCount,
      sentiment: '✅ Tốt',
      details: otherPositiveSnippets.size > 0 ? Array.from(otherPositiveSnippets).slice(0, 5).map(s => `"${s}"`).join('; ') : 'Khách hàng phản hồi tích cực về trải nghiệm tổng thể'
    });
  }

  if (otherNegativeCount > 0) {
    results.push({
      topic: 'Các góp ý & phản ánh khác',
      count: otherNegativeCount,
      sentiment: '⚠️ Chưa tốt',
      details: otherNegativeSnippets.size > 0 ? Array.from(otherNegativeSnippets).slice(0, 5).map(s => `"${s}"`).join('; ') : 'Một số vấn đề và góp ý trải nghiệm ứng dụng từ người dùng'
    });
  }

  results.sort((a, b) => b.count - a.count);
  results.forEach((item, index) => {
    item.rank = index + 1;
  });

  return results;
}

// Generate Combined 3-Sheet Excel file
async function generateCombinedExcel(androidReviews, iosReviews, summaryTopics, fileName) {
  ensureOutputDir();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rating & Comment Scraper Tool';
  workbook.created = new Date();

  // 1. Sheet "Tổng hợp" (Match user screenshot exactly!)
  const summarySheet = workbook.addWorksheet('Tổng hợp', {
    properties: { defaultRowHeight: 25 },
  });

  summarySheet.columns = [
    { header: 'Xếp hạng', key: 'rank', width: 12 },
    { header: 'Chủ đề', key: 'topic', width: 35 },
    { header: 'Số ý kiến', key: 'count', width: 14 },
    { header: 'Đánh giá', key: 'sentiment', width: 16 },
    { header: 'Chi tiết', key: 'details', width: 80 },
  ];

  const headerRow = summarySheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 32;

  summaryTopics.forEach((item, index) => {
    const row = summarySheet.addRow({
      rank: item.rank,
      topic: item.topic,
      count: item.count,
      sentiment: item.sentiment,
      details: item.details,
    });

    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF9FAFB' },
      };
    }

    row.getCell('rank').alignment = { horizontal: 'center', vertical: 'top' };
    row.getCell('topic').alignment = { vertical: 'top' };
    row.getCell('topic').font = { bold: true };
    row.getCell('count').alignment = { horizontal: 'center', vertical: 'top' };
    row.getCell('count').font = { bold: true };
    row.getCell('sentiment').alignment = { horizontal: 'center', vertical: 'top' };
    
    if (item.sentiment.includes('Tốt') && !item.sentiment.includes('Chưa')) {
      row.getCell('sentiment').font = { bold: true, color: { argb: 'FF059669' } };
    } else {
      row.getCell('sentiment').font = { bold: true, color: { argb: 'FFD97706' } };
    }

    row.getCell('details').alignment = { wrapText: true, vertical: 'top' };
  });

  // 2. Sheet "Google Play (Android)"
  if (androidReviews && androidReviews.length > 0) {
    const androidSheet = workbook.addWorksheet('Google Play (Android)', {
      properties: { defaultRowHeight: 22 },
    });
    androidSheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Tên người dùng', key: 'userName', width: 25 },
      { header: 'Rating (Số sao)', key: 'rating', width: 16 },
      { header: 'Bình luận', key: 'comment', width: 60 },
      { header: 'Ngày đánh giá', key: 'date', width: 16 },
      { header: 'Lượt thích', key: 'thumbsUp', width: 12 },
      { header: 'Phản hồi từ nhà phát triển', key: 'replyText', width: 50 },
    ];
    const aHeader = androidSheet.getRow(1);
    aHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    aHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
    aHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    aHeader.height = 30;

    androidReviews.forEach((review, index) => {
      const r = androidSheet.addRow({
        stt: index + 1,
        userName: review.userName,
        rating: parseFloat((review.rating || 5).toFixed(1)),
        comment: review.comment,
        date: review.date,
        thumbsUp: review.thumbsUp || 0,
        replyText: review.replyText || '',
      });
      r.getCell('comment').alignment = { wrapText: true, vertical: 'top' };
    });
  }

  // 3. Sheet "App Store (iOS)"
  if (iosReviews && iosReviews.length > 0) {
    const iosSheet = workbook.addWorksheet('App Store (iOS)', {
      properties: { defaultRowHeight: 22 },
    });
    iosSheet.columns = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Tên người dùng', key: 'userName', width: 25 },
      { header: 'Rating (Số sao)', key: 'rating', width: 16 },
      { header: 'Tiêu đề', key: 'title', width: 35 },
      { header: 'Bình luận', key: 'comment', width: 60 },
      { header: 'Ngày đánh giá', key: 'date', width: 16 },
      { header: 'Phiên bản ứng dụng', key: 'version', width: 18 },
    ];
    const iHeader = iosSheet.getRow(1);
    iHeader.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    iHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF007AFF' } };
    iHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    iHeader.height = 30;

    iosReviews.forEach((review, index) => {
      const r = iosSheet.addRow({
        stt: index + 1,
        userName: review.userName,
        rating: parseFloat((review.rating || 5).toFixed(1)),
        title: review.title || '',
        comment: review.comment,
        date: review.date,
        version: review.version || '',
      });
      r.getCell('comment').alignment = { wrapText: true, vertical: 'top' };
    });
  }

  const filePath = path.join(OUTPUT_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);
  const buffer = await workbook.xlsx.writeBuffer();
  const base64 = buffer.toString('base64');
  return { filePath, base64 };
}

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

// ============================================
// RATING AI & DICTIONARY CLASSIFIER MODULE
// ============================================
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

function extractCellText(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object') {
    if (cell.value.result !== undefined) return String(cell.value.result).trim();
    if (Array.isArray(cell.value.richText)) return cell.value.richText.map(r => r.text || '').join('').trim();
    if (cell.value.text) return String(cell.value.text).trim();
  }
  return String(cell.value).trim();
}

async function parseRatingExcel(buffer, fileName) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const reviews = [];

  workbook.worksheets.forEach(sheet => {
    let headerRowIndex = -1;
    let colMap = { userName: -1, rating: -1, comment: -1, date: -1 };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 5 && headerRowIndex === -1) {
        row.eachCell((cell, colNumber) => {
          const val = extractCellText(cell).toLowerCase();
          if (!val) return;
          if (colMap.userName === -1 && (val.includes('người dùng') || val.includes('user') || val.includes('tên') || val.includes('author'))) {
            colMap.userName = colNumber;
          }
          if (colMap.rating === -1 && (val.includes('sao') || val.includes('rating') || val.includes('score') || val.includes('điểm'))) {
            colMap.rating = colNumber;
          }
          if (colMap.comment === -1 && (val.includes('bình luận') || val.includes('comment') || val.includes('text') || val.includes('đánh giá') || val.includes('nội dung') || val.includes('nhận xét'))) {
            colMap.comment = colNumber;
          }
          if (colMap.date === -1 && (val.includes('ngày') || val.includes('date') || val.includes('thời gian') || val.includes('time'))) {
            colMap.date = colNumber;
          }
        });
        if (colMap.comment !== -1) {
          headerRowIndex = rowNumber;
        }
      }
    });

    if (headerRowIndex === -1) headerRowIndex = 1;
    if (colMap.comment === -1) colMap.comment = 4;
    if (colMap.rating === -1) colMap.rating = 3;
    if (colMap.userName === -1) colMap.userName = 2;
    if (colMap.date === -1) colMap.date = 5;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return;

      const userName = colMap.userName > 0 ? extractCellText(row.getCell(colMap.userName)) || 'Ẩn danh' : 'Ẩn danh';
      const rawRatingText = colMap.rating > 0 ? extractCellText(row.getCell(colMap.rating)) : '5';
      const ratingMatch = rawRatingText.match(/\d+/);
      const rating = ratingMatch ? Number(ratingMatch[0]) : 5;
      const comment = colMap.comment > 0 ? extractCellText(row.getCell(colMap.comment)) : '';
      const rawDateCell = colMap.date > 0 ? row.getCell(colMap.date).value : '';
      let date = '';
      if (rawDateCell instanceof Date) {
        date = rawDateCell.toISOString().split('T')[0];
      } else if (rawDateCell) {
        date = extractCellText(row.getCell(colMap.date)).split('T')[0].split(' ')[0];
      }

      if (comment && comment.length > 0) {
        reviews.push({
          sourceFile: fileName,
          sheetName: sheet.name,
          userName,
          rating,
          comment,
          date
        });
      }
    });
  });

  return reviews;
}

const DEFAULT_DICTIONARY_ITEMS = [
  // 1. Thuế
  { keyword: 'thanh toán thuế', feature: 'thanh toán thuế', journey: 'Daily' },
  { keyword: 'thue dien tu', feature: 'thanh toán thuế', journey: 'Daily' },
  { keyword: 'thuế điện tử', feature: 'thanh toán thuế', journey: 'Daily' },
  { keyword: 'nộp thuế', feature: 'thanh toán thuế', journey: 'Daily' },
  { keyword: 'nop thue', feature: 'thanh toán thuế', journey: 'Daily' },
  { keyword: 'thuế', feature: 'thanh toán thuế', journey: 'Daily' },
  { keyword: 'thue', feature: 'thanh toán thuế', journey: 'Daily' },

  // 2. Chuyển tiền / Thanh toán / Payroll
  { keyword: 'chuyển khoản theo lô', feature: 'Payroll', journey: 'Daily' },
  { keyword: 'chuyen khoan theo lo', feature: 'Payroll', journey: 'Daily' },
  { keyword: 'chuyển theo lô', feature: 'chuyển tiền', journey: 'Daily' },
  { keyword: 'chuyen theo lo', feature: 'chuyển tiền', journey: 'Daily' },
  { keyword: 'chi lương', feature: 'Payroll', journey: 'Daily' },
  { keyword: 'chi luong', feature: 'Payroll', journey: 'Daily' },
  { keyword: 'bảng lương', feature: 'Payroll', journey: 'Daily' },
  { keyword: 'trả lương', feature: 'Payroll', journey: 'Daily' },
  { keyword: 'lương', feature: 'Payroll', journey: 'Daily' },
  { keyword: 'luong', feature: 'Payroll', journey: 'Daily' },
  { keyword: 'chuyển liên ngân hàng', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'chuyển khoản', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'chuyen khoan', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'chuyển tiền', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'chuyen tien', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'đi tiền', feature: 'chuyển tiền', journey: 'Daily' },
  { keyword: 'di tien', feature: 'chuyển tiền', journey: 'Daily' },
  { keyword: 'số tài khoản', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'so tai khoan', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'thanh toán', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'thanh toan', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'quét qr', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'quet qr', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'qr', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'stk', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'nạp tiền', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'nap tien', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'rút tiền', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },
  { keyword: 'rut tien', feature: 'Thanh toán/Chuyển tiền', journey: 'Daily' },

  // 3. Bảo hiểm xã hội
  { keyword: 'thanh toán bảo hiểm xã hội', feature: 'Thanh toán bảo hiểm xã hội', journey: 'Daily' },
  { keyword: 'bảo hiểm xã hội', feature: 'Thanh toán bảo hiểm xã hội', journey: 'Daily' },
  { keyword: 'bao hiem xa hoi', feature: 'Thanh toán bảo hiểm xã hội', journey: 'Daily' },
  { keyword: 'bhxh', feature: 'Thanh toán bảo hiểm xã hội', journey: 'Daily' },
  { keyword: 'bảo hiểm', feature: 'Thanh toán bảo hiểm xã hội', journey: 'Daily' },
  { keyword: 'bao hiem', feature: 'Thanh toán bảo hiểm xã hội', journey: 'Daily' },

  // 4. Tài khoản (chung)
  { keyword: 'tài khoản', feature: 'Tài khoản', journey: 'Daily' },
  { keyword: 'tai khoan', feature: 'Tài khoản', journey: 'Daily' },

  // 5. Đăng nhập (MỚI THEO FILE TỪ ĐIỂN CỦA BẠN)
  { keyword: 'không đăng nhập được', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'khong dang nhap duoc', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'không vào được tài khoản', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'khong vao duoc tai khoan', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'không vào được app', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'khong vao duoc app', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'không truy cập được', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'khong truy cap duoc', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'tài khoản bị khóa', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'tai khoan bi khoa', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'mở khóa tài khoản', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'mo khoa tai khoan', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'khóa đăng nhập', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'khoa dang nhap', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'quên mật khẩu', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'quen mat khau', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'sai mật khẩu', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'sai mat khau', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'đổi mật khẩu', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'doi mat khau', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'reset mật khẩu', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'reset mat khau', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'đặt lại mật khẩu', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'dat lai mat khau', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'mật khẩu', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'mat khau', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'password', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'tên đăng nhập', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'ten dang nhap', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'user đăng nhập', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'user dang nhap', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'username', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'phiên đăng nhập', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'phien dang nhap', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'hết phiên', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'het phien', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'session', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'đăng xuất', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'dang xuat', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'logout', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'log in', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'login', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'vào app', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'vao app', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'đăng nhập', feature: 'Đăng nhập', journey: 'Daily' },
  { keyword: 'dang nhap', feature: 'Đăng nhập', journey: 'Daily' },

  // 5. Tiền gửi / Tiết kiệm
  { keyword: 'lãi suất tiết kiệm', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'sổ tiết kiệm', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'siêu lãi ngày', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'sieu lai ngay', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'tiền gửi', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'tien gui', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'gửi tiền', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'gui tien', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'tiết kiệm', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'tiet kiem', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'hđtg', feature: 'Tiền gửi', journey: 'Daily' },
  { keyword: 'hdtg', feature: 'Tiền gửi', journey: 'Daily' },

  // 6. Quản lý quan hệ / RM / Nhân viên / Quầy
  { keyword: 'nhân viên giao dịch tại chi nhánh', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'nhan vien giao dich tai chi nhanh', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'giao dịch tại quầy', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'dịch vụ tại quầy', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'dich vu tai quay', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'giao dịch viên', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'phòng giao dịch', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'chi nhánh', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'chi nhanh', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'quầy', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },
  { keyword: 'pgd', feature: 'Giao dịch tại quầy', journey: 'Trung tâm quỹ và dịch vụ KH' },

  { keyword: 'người hỗ trợ', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'nguoi ho tro', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'nhân viên hỗ trợ', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'nhan vien ho tro', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'nhân viên phụ trách', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'nhan vien phu trach', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'chuyên viên hỗ trợ', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'chuyen vien ho tro', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'chuyên viên tư vấn', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'chuyen vien tu van', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'chuyên viên', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'chuyen vien', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'nhân viên', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'nhan vien', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'cán bộ', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'can bo', feature: 'RM', journey: 'Khối kinh doanh' },
  { keyword: 'rm', feature: 'RM', journey: 'Khối kinh doanh' },

  // Thu phí
  { keyword: 'thu phí xử lý hồ sơ', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'xử lý hồ sơ', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'xu ly ho so', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'ca clound', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'ca cloud', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'thu phí', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'thu phi', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'thu tiền', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'thu tien', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'trừ phí', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },
  { keyword: 'tru phi', feature: 'Thu phí Xử lý hồ sơ (CA clound)', journey: 'Khối kinh doanh' },

  // 7. TF / Ngoại tệ / Quốc tế
  { keyword: 'chuyển tiền quốc tế', feature: 'Chuyển tiền quốc tế', journey: 'TF' },
  { keyword: 'chuyen tien quoc te', feature: 'Chuyển tiền quốc tế', journey: 'TF' },
  { keyword: 'tài trợ thương mại', feature: 'Chuyển tiền quốc tế', journey: 'TF' },
  { keyword: 'tai tro thuong mai', feature: 'Chuyển tiền quốc tế', journey: 'TF' },
  { keyword: 'thương mại', feature: 'Chuyển tiền quốc tế', journey: 'TF' },
  { keyword: 'thuong mai', feature: 'Chuyển tiền quốc tế', journey: 'TF' },
  { keyword: 'swift', feature: 'Chuyển tiền quốc tế', journey: 'TF' },
  { keyword: 'bán ngoại tệ', feature: 'Bán ngoại tệ', journey: 'TF' },
  { keyword: 'ban ngoai te', feature: 'Bán ngoại tệ', journey: 'TF' },
  { keyword: 'mua ngoại tệ', feature: 'Bán ngoại tệ', journey: 'TF' },
  { keyword: 'ngoại tệ', feature: 'Bán ngoại tệ', journey: 'TF' },
  { keyword: 'ngoai te', feature: 'Bán ngoại tệ', journey: 'TF' },

  // 8. MB247 / Hotline
  { keyword: 'gửi yêu cầu hỗ trợ', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'gui yeu cau ho tro', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'chăm sóc khách hàng', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'cham soc khach hang', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'chăm sóc kh', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'cham soc kh', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'tổng đài', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'tong dai', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'mb247', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'cskh', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'hotline', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'khiếu nại', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'khieu nai', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'tra soát', feature: 'MB247', journey: 'Trung tâm MB247' },
  { keyword: 'tra soat', feature: 'MB247', journey: 'Trung tâm MB247' },

  // 9. Sao kê / Sổ phụ
  { keyword: 'lịch sử giao dịch', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'lich su giao dich', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'tải chứng từ', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'tai chung tu', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'tải unc', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'tai unc', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'xuất file', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'xuat file', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'sổ phụ', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'so phu', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'sao kê', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'sao ke', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'số dư', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'so du', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },
  { keyword: 'unc', feature: 'Sao kê/Sổ phụ', journey: 'Daily' },

  // 10. Lending / Vay / Giải ngân / Bảo lãnh
  { keyword: 'bảo lãnh', feature: 'Bảo lãnh', journey: 'Lending' },
  { keyword: 'bao lanh', feature: 'Bảo lãnh', journey: 'Lending' },
  { keyword: 'khoản vay', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'khoan vay', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'giải ngân', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'giai ngan', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'gốc lãi', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'goc lai', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'vay vốn', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'vay von', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'vay tiền', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'vay tien', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'hạn mức', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'han muc', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'lãi vay', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'lai vay', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'trả nợ', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'tra no', feature: 'Giải ngân', journey: 'Lending' },
  { keyword: 'vay', feature: 'Giải ngân', journey: 'Lending' },

  // 11. Hệ thống / CNTT
  { keyword: 'lỗi hệ thống', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'loi he thong', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'hệ thống', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'he thong', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'quay vòng', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'quay vong', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'xoay mãi', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'xoay mai', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'loading mãi', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'không vào được', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'khong vao duoc', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'không mở được', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'khong mo duoc', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'tự thoát', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'tu thoat', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'bị văng', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'bi vang', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'văng app', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'vang app', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'bảo trì', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'bao tri', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'cập nhật', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'cap nhat', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'update', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'khắc phục', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'khac phuc', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'sửa lỗi', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'sua loi', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'chậm', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'cham', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'lag', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'đơ', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'treo', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'văng', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'sập', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'lỗi', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'loi', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'crash', feature: 'Hệ thống', journey: 'CNTT' },
  { keyword: 'bug', feature: 'Hệ thống', journey: 'CNTT' },

  // 12. Onboarding / Sinh trắc / Đăng ký
  { keyword: 'thu thập sinh trắc học', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'giấy phép kinh doanh', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'giay phep kinh doanh', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'gpkd', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'nhận diện', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'nhan dien', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'khuôn mặt', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'khuon mat', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'face id', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'faceid', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'căn cước', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'can cuoc', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'cccd', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'nfc', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'sinh trắc', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'sinh trac', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'đăng ký', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'dang ky', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'mở tài khoản', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'mo tai khoan', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'ekyc', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },
  { keyword: 'e-kyc', feature: 'Thu thập sinh trắc học', journey: 'Onboarding' },

  // 13. UI UX / Giao diện
  { keyword: 'khó sử dụng', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'kho su dung', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'size chữ', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'size chu', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'chữ nhỏ', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'chu nho', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'khó tìm', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'kho tim', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'thao tác', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'thao tac', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'giao diện', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'giao dien', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'bất tiện', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'bat tien', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'khó dùng', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'kho dung', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'rối mắt', feature: 'Giao diện', journey: 'UI UX' },
  { keyword: 'phức tạp', feature: 'Giao diện', journey: 'UI UX' },

  // 14. Quản lý phê duyệt
  { keyword: 'quản lý phê duyệt', feature: 'Quản lý phê duyệt', journey: 'Daily' },
  { keyword: 'quan ly phe duyet', feature: 'Quản lý phê duyệt', journey: 'Daily' },
  { keyword: 'phê duyệt', feature: 'Quản lý phê duyệt', journey: 'Daily' },
  { keyword: 'phe duyet', feature: 'Quản lý phê duyệt', journey: 'Daily' },
  { keyword: 'duyệt lệnh', feature: 'Quản lý phê duyệt', journey: 'Daily' },
  { keyword: 'duyet lenh', feature: 'Quản lý phê duyệt', journey: 'Daily' },

  // 15. Noti / Thông báo
  { keyword: 'thông báo số dư', feature: 'Noti', journey: 'Daily' },
  { keyword: 'thong bao so du', feature: 'Noti', journey: 'Daily' },
  { keyword: 'thông báo', feature: 'Noti', journey: 'Daily' },
  { keyword: 'thong bao', feature: 'Noti', journey: 'Daily' },
  { keyword: 'noti', feature: 'Noti', journey: 'Daily' },
  { keyword: 'notification', feature: 'Noti', journey: 'Daily' },
  { keyword: 'tin nhắn biến động', feature: 'Noti', journey: 'Daily' },

  // 16. DOTP / OTP
  { keyword: 'smart otp', feature: 'DOTP', journey: 'Daily' },
  { keyword: 'smartotp', feature: 'DOTP', journey: 'Daily' },
  { keyword: 'dotp', feature: 'DOTP', journey: 'Daily' },
  { keyword: 'd otp', feature: 'DOTP', journey: 'Daily' },
  { keyword: 'otp', feature: 'DOTP', journey: 'Daily' },

  // 17. Hóa đơn điện tử
  { keyword: 'hóa đơn điện tử', feature: 'Hóa đơn điện tử', journey: 'Daily' },
  { keyword: 'hoa don dien tu', feature: 'Hóa đơn điện tử', journey: 'Daily' },
  { keyword: 'hóa đơn vat', feature: 'Hóa đơn điện tử', journey: 'Daily' },
  { keyword: 'hóa đơn', feature: 'Hóa đơn điện tử', journey: 'Daily' },
  { keyword: 'hoa don', feature: 'Hóa đơn điện tử', journey: 'Daily' },

  // 18. Thẻ
  { keyword: 'thẻ tín dụng', feature: 'Thẻ', journey: 'Team Thẻ' },
  { keyword: 'the tin dung', feature: 'Thẻ', journey: 'Team Thẻ' },
  { keyword: 'thẻ atm', feature: 'Thẻ', journey: 'Team Thẻ' },
  { keyword: 'thẻ', feature: 'Thẻ', journey: 'Team Thẻ' },
  { keyword: 'the', feature: 'Thẻ', journey: 'Team Thẻ' },

  // 19. Ngôn ngữ
  { keyword: 'thêm tiếng', feature: 'Quản lý ngôn ngữ', journey: 'Daily' },
  { keyword: 'them tieng', feature: 'Quản lý ngôn ngữ', journey: 'Daily' },
  { keyword: 'ngôn ngữ', feature: 'Quản lý ngôn ngữ', journey: 'Daily' },
  { keyword: 'ngon ngu', feature: 'Quản lý ngôn ngữ', journey: 'Daily' },

  // 20. Rating / Quảng cáo
  { keyword: 'quảng cáo', feature: 'Rating', journey: 'Daily' },
  { keyword: 'quang cao', feature: 'Rating', journey: 'Daily' },
  { keyword: 'đánh giá', feature: 'Rating', journey: 'Daily' },
  { keyword: 'danh gia', feature: 'Rating', journey: 'Daily' },

  // 21. Homepage
  { keyword: 'màn hình chính', feature: 'homepage', journey: 'Daily' },
  { keyword: 'man hinh chinh', feature: 'homepage', journey: 'Daily' },
  { keyword: 'trang chủ', feature: 'homepage', journey: 'Daily' },
  { keyword: 'trang chu', feature: 'homepage', journey: 'Daily' },
  { keyword: 'homepage', feature: 'homepage', journey: 'Daily' },

  // 22. Trải nghiệm dịch vụ / Đánh giá chung (Fallback nhận xét)
  { keyword: 'dịch vụ', feature: 'Trải nghiệm dịch vụ', journey: 'Daily' },
  { keyword: 'dich vu', feature: 'Trải nghiệm dịch vụ', journey: 'Daily' },
  { keyword: 'phục vụ', feature: 'Trải nghiệm dịch vụ', journey: 'Daily' },
  { keyword: 'phuc vu', feature: 'Trải nghiệm dịch vụ', journey: 'Daily' },
  { keyword: 'tồi tệ', feature: 'Trải nghiệm chung', journey: 'Daily' },
  { keyword: 'toi te', feature: 'Trải nghiệm chung', journey: 'Daily' },
  { keyword: 'thất vọng', feature: 'Trải nghiệm chung', journey: 'Daily' },
  { keyword: 'that vong', feature: 'Trải nghiệm chung', journey: 'Daily' },
  { keyword: 'tuyệt vời', feature: 'Trải nghiệm chung', journey: 'Daily' },
  { keyword: 'tuyet voi', feature: 'Trải nghiệm chung', journey: 'Daily' },
  { keyword: 'hài lòng', feature: 'Trải nghiệm chung', journey: 'Daily' },
  { keyword: 'hai long', feature: 'Trải nghiệm chung', journey: 'Daily' }
];

function matchWordBoundary(textLower, word) {
  if (!textLower || !word) return false;
  if (word.includes(' ')) {
    return textLower.includes(word);
  }
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|[^a-z0-9à-ỹ])${escaped}([^a-z0-9à-ỹ]|$)`, 'i');
  return regex.test(textLower);
}

async function parseDictionaryFile(buffer, fileName) {
  const dictItems = [...DEFAULT_DICTIONARY_ITEMS];
  const positiveKeywords = new Set(['tốt', 'tuyệt vời', 'tuyệt', 'ok', 'oke', 'ngon', 'uy tín', 'nhanh', 'tiện', 'tiện dụng', 'hài lòng', 'mượt', 'chuẩn', 'xịn', 'yêu', 'thích', 'xuất sắc']);
  const negativeKeywords = new Set(['lag', 'lỗi', 'đơ', 'rác', 'tệ', 'chậm', 'treo', 'phàn nàn', 'chán', 'kém', 'bực', 'ức chế', 'tệ hại', 'tồi', 'kém chất lượng', 'kém cỏi', 'quá kém', 'không đăng nhập được', 'không nạp được', 'mất tiền', 'bị văng', 'sập', 'không vào được', 'lừa đảo', 'phiền']);

  if (!buffer) return { positiveKeywords, negativeKeywords, dictItems };

  try {
    const ext = path.extname(fileName || '').toLowerCase();

    if (ext === '.txt' || ext === '.csv') {
      const text = buffer.toString('utf-8');
      const lines = text.split(/\r?\n/);
      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const parts = trimmed.split(/[,;\t]/);
        const kw = parts[0] ? parts[0].trim().toLowerCase() : '';
        const col2 = parts[1] ? parts[1].trim() : '';
        const col3 = parts[2] ? parts[2].trim() : '';

        if (!kw || (idx === 0 && (kw.includes('từ khóa') || kw.includes('nội dung') || kw.includes('keyword')))) return;

        let feature = col2 || 'Trải nghiệm chung';
        let journey = col3 || 'Daily';

        dictItems.unshift({ keyword: kw, feature, journey });
      });
    } else {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      workbook.worksheets.forEach(sheet => {
        let colMap = { keyword: 1, feature: 2, journey: 3 };

        sheet.eachRow((row, rowNumber) => {
          if (rowNumber <= 3) {
            row.eachCell((cell, colNum) => {
              const text = extractCellText(cell).toLowerCase();
              if (text.includes('từ') || text.includes('nội dung') || text.includes('keyword') || text.includes('key word')) colMap.keyword = colNum;
              if (text.includes('tính năng') || text.includes('feature') || text.includes('chức năng')) colMap.feature = colNum;
              if (text.includes('đơn vị') || text.includes('tiếp nhận') || text.includes('hành trình') || text.includes('journey') || text.includes('xử lý')) colMap.journey = colNum;
            });
          }

          const kwText = extractCellText(row.getCell(colMap.keyword)).trim();
          if (rowNumber <= 3 && (kwText.toLowerCase().includes('nội dung') || kwText.toLowerCase().includes('từ khóa') || kwText.toLowerCase().includes('keyword') || kwText.toLowerCase().includes('key word'))) return;

          const kw = kwText.toLowerCase();
          const featureVal = extractCellText(row.getCell(colMap.feature)).trim();
          const journeyVal = extractCellText(row.getCell(colMap.journey)).trim();

          if (!kw) return;

          dictItems.unshift({
            keyword: kw,
            feature: featureVal || 'Trải nghiệm chung',
            journey: journeyVal || 'Daily'
          });
        });
      });
    }
  } catch (err) {
    console.error('Error parsing dictionary file:', err.message);
  }

  return { positiveKeywords, negativeKeywords, dictItems };
}

function classifySentimentWithDict(comment, rating, dict = {}) {
  const textLower = (comment || '').toLowerCase().trim();
  const items = (dict && Array.isArray(dict.dictItems) && dict.dictItems.length > 0)
    ? dict.dictItems
    : DEFAULT_DICTIONARY_ITEMS;

  const sortedDict = [...items].sort((a, b) => b.keyword.length - a.keyword.length);

  const matchedKeywordsList = [];
  let foundFeature = '';
  let foundJourney = '';

  for (const item of sortedDict) {
    if (matchWordBoundary(textLower, item.keyword)) {
      if (!matchedKeywordsList.includes(item.keyword)) {
        matchedKeywordsList.push(item.keyword);
      }
      if (!foundFeature && item.feature) foundFeature = item.feature;
      if (!foundJourney && item.journey) foundJourney = item.journey;
    }
  }

  // Fallback intelligent classification if not directly matched by keyword
  if (!foundFeature || foundFeature === 'Chưa phân loại') {
    if (matchWordBoundary(textLower, 'lỗi') || matchWordBoundary(textLower, 'loi') || matchWordBoundary(textLower, 'chậm') || matchWordBoundary(textLower, 'lag') || matchWordBoundary(textLower, 'đơ') || matchWordBoundary(textLower, 'treo') || textLower.includes('văng') || textLower.includes('không vào') || textLower.includes('bảo trì') || textLower.includes('cập nhật') || textLower.includes('sửa lỗi') || textLower.includes('khắc phục')) {
      foundJourney = 'CNTT';
      foundFeature = 'Hệ thống';
    } else if (textLower.includes('đăng ký') || textLower.includes('nhận diện') || textLower.includes('giấy phép') || textLower.includes('sinh trắc') || textLower.includes('khuôn mặt') || textLower.includes('căn cước') || textLower.includes('cccd')) {
      foundJourney = 'Onboarding';
      foundFeature = 'Thu thập sinh trắc học';
    } else if (textLower.includes('giao diện') || textLower.includes('chữ') || textLower.includes('khó dùng') || textLower.includes('thao tác') || textLower.includes('bất tiện') || textLower.includes('rối mắt')) {
      foundJourney = 'UI UX';
      foundFeature = 'Giao diện';
    } else if (textLower.includes('vay') || textLower.includes('giải ngân') || textLower.includes('bảo lãnh') || textLower.includes('hạn mức')) {
      foundJourney = 'Lending';
      foundFeature = 'Giải ngân';
    } else if (textLower.includes('nhân viên') || textLower.includes('cán bộ') || textLower.includes('chuyên viên') || textLower.includes('hỗ trợ') || textLower.includes('tư vấn')) {
      foundJourney = 'Khối kinh doanh';
      foundFeature = 'RM';
    } else if (textLower.includes('tổng đài') || textLower.includes('hotline') || textLower.includes('cskh') || textLower.includes('khiếu nại') || textLower.includes('tra soát')) {
      foundJourney = 'Trung tâm MB247';
      foundFeature = 'MB247';
    } else if (textLower.includes('dịch vụ') || textLower.includes('phục vụ') || textLower.includes('thất vọng') || textLower.includes('tồi tệ') || textLower.includes('tệ')) {
      foundJourney = 'Daily';
      foundFeature = 'Trải nghiệm dịch vụ';
    } else {
      foundJourney = 'Daily';
      foundFeature = 'Trải nghiệm chung';
    }
  }

  if (!foundJourney) foundJourney = 'Daily';

  // Sentiment Analysis Indicators
  const NEGATIVE_WORDS = [
    'lỗi', 'lag', 'đơ', 'rác', 'tệ', 'chậm', 'treo', 'văng', 'sập', 'kém', 'chán', 'ức chế', 'bực',
    'khó', 'không', 'ko', 'sai', 'hỏng', 'bị', 'hết hạn', 'quên', 'phát sinh', 'chưa', 'chờ',
    'giữ hồ sơ', 'từ chối', 'tự thoát', 'bắt', 'khóa', 'phiền', 'tồi', 'vượt hạn mức', 'mất tiền',
    'không vào', 'không nạp', 'không mở', 'không dùng', 'phản hồi chậm', 'không nghe', 'máy bận',
    'quá lâu', 'khiếu nại', 'tra soát', 'bảo trì', 'xoay mãi', 'loading mãi', 'không tải', 'tự xóa',
    'bất tiện', 'đòi cập nhật', 'đừng bắt'
  ];

  const matchedNeg = [];
  NEGATIVE_WORDS.forEach(kw => {
    if (matchWordBoundary(textLower, kw)) matchedNeg.push(kw);
  });

  const POSITIVE_WORDS = [
    'tốt', 'tuyệt vời', 'tuyệt', 'mượt', 'nhanh', 'ngon', 'xịn', 'tiện', 'tiện dụng', 'chu đáo', 'nhiệt tình',
    'hài lòng', 'good', 'great', 'ok', 'oke', 'ưng ý', 'xuất sắc', 'uy tín', 'dễ dùng', 'gọn', 'đơn giản', 'an toàn'
  ];

  const matchedPos = [];
  POSITIVE_WORDS.forEach(kw => {
    if (matchWordBoundary(textLower, kw)) matchedPos.push(kw);
  });

  let finalSentiment = 'Tích cực';
  let badgeClass = 'badge-ai-positive';
  const isNegAuto = rating <= 2;
  const hasNegKeyword = matchedNeg.length > 0;

  if (isNegAuto || (hasNegKeyword && (rating <= 3 || !matchedPos.length || matchedNeg.length >= 2 || textLower.includes('đừng bắt') || textLower.includes('lỗi')))) {
    finalSentiment = 'Tiêu cực';
    badgeClass = 'badge-ai-negative';
  } else if (rating >= 4 || matchedPos.length > 0) {
    finalSentiment = 'Tích cực';
    badgeClass = 'badge-ai-positive';
  } else {
    finalSentiment = 'Tiêu cực';
    badgeClass = 'badge-ai-negative';
  }

  const matchedKeywords = matchedKeywordsList.length > 0
    ? matchedKeywordsList.slice(0, 4).join(', ')
    : (matchedNeg.length > 0 ? matchedNeg.slice(0, 3).join(', ') : `Đánh giá ${rating} sao`);

  return {
    sentiment: finalSentiment,
    matchedKeywords,
    journey: foundJourney,
    feature: foundFeature,
    badgeClass
  };
}

async function generateAIAnalysisExcel(results, fileName) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Báo cáo Rating AI');

  sheet.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Tên File / Nguồn', key: 'sourceFile', width: 25 },
    { header: 'Người dùng', key: 'userName', width: 22 },
    { header: 'Số sao', key: 'rating', width: 12 },
    { header: 'Bình luận', key: 'comment', width: 55 },
    { header: 'Ngày', key: 'date', width: 14 },
    { header: 'Phân loại AI', key: 'sentiment', width: 16 },
    { header: 'Hành trình / Đơn vị tiếp nhận & xử lý', key: 'journey', width: 28 },
    { header: 'Tính năng', key: 'feature', width: 26 },
    { header: 'Từ khóa trùng khớp', key: 'matchedKeywords', width: 30 }
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6366F1' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

  results.forEach((r, idx) => {
    const row = sheet.addRow({
      stt: idx + 1,
      sourceFile: r.sourceFile,
      userName: r.userName,
      rating: `⭐ ${r.rating}`,
      comment: r.comment,
      date: r.date,
      sentiment: r.sentiment,
      journey: r.journey || 'Daily',
      feature: r.feature || 'Chưa phân loại',
      matchedKeywords: r.matchedKeywords
    });

    const isNeg = r.sentiment === 'Tiêu cực';
    const isPos = r.sentiment === 'Tích cực';
    const cellSentiment = row.getCell('sentiment');
    cellSentiment.font = { bold: true, color: { argb: isNeg ? 'EF4444' : isPos ? '10B981' : '6B7280' } };
  });

  sheet.views = [{ showGridLines: true }];

  ensureOutputDir();
  const filePath = path.join(OUTPUT_DIR, fileName);
  try {
    await workbook.xlsx.writeFile(filePath);
  } catch (e) {
    console.error('Error writing AI excel file:', e.message);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return { filePath, base64: buffer.toString('base64') };
}

app.post(['/api/ai/analyze', '/ai/analyze'], upload.fields([{ name: 'ratingFiles', maxCount: 20 }, { name: 'dictFile', maxCount: 1 }]), async (req, res) => {
  try {
    const ratingFiles = req.files && req.files.ratingFiles ? req.files.ratingFiles : [];
    const dictFile = req.files && req.files.dictFile ? req.files.dictFile[0] : null;

    if (!ratingFiles.length) {
      return res.status(400).json({ error: 'Vui lòng tải lên ít nhất 1 file Excel chứa đánh giá Rating!' });
    }

    const dict = await parseDictionaryFile(dictFile ? dictFile.buffer : null, dictFile ? dictFile.originalname : '');

    let allReviews = [];
    for (const file of ratingFiles) {
      const parsed = await parseRatingExcel(file.buffer, file.originalname);
      allReviews.push(...parsed);
    }

    if (!allReviews.length) {
      return res.status(400).json({ error: 'Không đọc được dữ liệu đánh giá nào từ các file Excel đã tải lên.' });
    }

    let countPos = 0;
    let countNeg = 0;
    let countNeu = 0;

    const classifiedResults = allReviews.map((r, idx) => {
      const { sentiment, matchedKeywords, journey, feature, badgeClass } = classifySentimentWithDict(r.comment, r.rating, dict);
      if (sentiment === 'Tích cực') countPos++;
      else if (sentiment === 'Tiêu cực') countNeg++;
      else countNeu++;

      return {
        id: idx + 1,
        ...r,
        sentiment,
        matchedKeywords,
        journey,
        feature,
        badgeClass
      };
    });

    const fileName = 'rating_ai_analysis.xlsx';
    const { filePath, base64 } = await generateAIAnalysisExcel(classifiedResults, fileName);

    res.json({
      success: true,
      totalReviews: classifiedResults.length,
      countPos,
      countNeg,
      countNeu,
      dictInfo: {
        posKeywordsCount: dict.positiveKeywords.size,
        negKeywordsCount: dict.negativeKeywords.size
      },
      results: classifiedResults,
      fileName,
      filePath: `/api/download/${fileName}`,
      base64
    });
  } catch (err) {
    console.error('Error in AI analysis:', err);
    res.status(500).json({ error: `Lỗi khi phân tích dữ liệu Rating AI: ${err.message}` });
  }
});

module.exports = app;

