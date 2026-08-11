const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const gplay = require('google-play-scraper').default;
const ExcelJS = require('exceljs');

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
const PORT = 3000;
const CONFIG_PATH = process.env.VERCEL ? path.join('/tmp', 'config.json') : path.join(__dirname, 'config.json');
const OUTPUT_DIR = process.env.VERCEL ? path.join('/tmp', 'output') : path.join(__dirname, 'output');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Load saved config
app.get('/api/config', (req, res) => {
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
app.post('/api/config', (req, res) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: extract Google Play app ID from URL
function extractGooglePlayId(url) {
  const match = url.match(/id=([a-zA-Z0-9._]+)/);
  if (match) return match[1];
  // Maybe it's just the ID
  if (/^[a-zA-Z0-9._]+$/.test(url)) return url;
  return null;
}

// Helper: extract App Store app ID from URL
function extractAppStoreId(url) {
  const match = url.match(/\/id(\d+)/);
  if (match) return parseInt(match[1]);
  // Maybe it's just the number
  if (/^\d+$/.test(url)) return parseInt(url);
  return null;
}

// Helper: get country code from App Store URL
function extractAppStoreCountry(url) {
  const match = url.match(/\/([a-z]{2})\/app\//);
  return match ? match[1] : 'us';
}

// Scrape Google Play reviews
app.post('/api/scrape/android', async (req, res) => {
  try {
    const { url, dateFrom, dateTo } = req.body;
    const appId = extractGooglePlayId(url);

    if (!appId) {
      return res.status(400).json({ error: 'Không thể lấy App ID từ URL. Vui lòng kiểm tra lại đường dẫn Google Play.' });
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    let allReviews = [];
    let nextToken = undefined;
    const MAX_PAGES = 50; // Safety limit
    let pageCount = 0;

    // Send progress updates via SSE-like approach
    // But since we're using simple REST, collect all then filter
    console.log(`[Android] Bắt đầu scraping app: ${appId}`);
    console.log(`[Android] Khoảng thời gian: ${dateFrom} đến ${dateTo}`);

    while (pageCount < MAX_PAGES) {
      pageCount++;
      const options = {
        appId: appId,
        sort: gplay.sort.NEWEST,
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

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[Android] Hoàn tất: ${allReviews.length} reviews trong khoảng thời gian`);

    // Generate Excel
    const filePath = await generateExcel(allReviews, 'android_rating_comment.xlsx', appId, 'Google Play');
    
    res.json({
      success: true,
      totalReviews: allReviews.length,
      filePath: '/api/download/android_rating_comment.xlsx',
      appId,
    });
  } catch (err) {
    console.error('[Android] Lỗi:', err);
    res.status(500).json({ error: `Lỗi khi scrape Google Play: ${err.message}` });
  }
});

// Helper: fetch iTunes RSS with retry and URL fallback
async function fetchITunesReviews(country, appId, page) {
  // Multiple URL patterns - Apple rate-limits differently per pattern
  const urlPatterns = [
    `https://itunes.apple.com/${country}/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json`,
    `https://itunes.apple.com/${country}/rss/customerreviews/id=${appId}/page=${page}/json`,
    `https://itunes.apple.com/rss/customerreviews/page=${page}/id=${appId}/sortBy=mostRecent/json?cc=${country}`,
  ];

  const MAX_RETRIES = 3;

  for (const urlPattern of urlPatterns) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const data = await fetchJSON(urlPattern);
        if (!data || !data.feed) continue;

        let entries = data.feed.entry;
        if (!entries) {
          // Empty response, try next attempt with backoff
          if (attempt < MAX_RETRIES) {
            const delay = attempt * 2000; // 2s, 4s, 6s
            console.log(`[iOS] Trang ${page}: empty response, retry ${attempt}/${MAX_RETRIES} sau ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          continue;
        }

        // Handle single entry (not array)
        if (!Array.isArray(entries)) {
          entries = [entries];
        }

        const reviews = entries.filter(e => e['im:rating']);
        if (reviews.length > 0) {
          return reviews;
        }

        // Got entries but no reviews, retry
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 1500));
          continue;
        }
      } catch (err) {
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, attempt * 2000));
          continue;
        }
      }
    }
  }

  return []; // All patterns and retries exhausted
}

// Scrape App Store reviews using iTunes RSS API directly
app.post('/api/scrape/ios', async (req, res) => {
  try {
    const { url, dateFrom, dateTo } = req.body;
    const appId = extractAppStoreId(url);
    const country = extractAppStoreCountry(url);

    if (!appId) {
      return res.status(400).json({ error: 'Không thể lấy App ID từ URL. Vui lòng kiểm tra lại đường dẫn App Store.' });
    }

    const startDate = new Date(dateFrom);
    const endDate = new Date(dateTo);
    endDate.setHours(23, 59, 59, 999);

    let allReviews = [];
    const MAX_PAGES = 10; // iTunes RSS API supports up to 10 pages
    let consecutiveEmpty = 0;

    console.log(`[iOS] Bắt đầu scraping app ID: ${appId}, country: ${country}`);
    console.log(`[iOS] Khoảng thời gian: ${dateFrom} đến ${dateTo}`);

    for (let page = 1; page <= MAX_PAGES; page++) {
      try {
        const reviews = await fetchITunesReviews(country, appId, page);

        if (reviews.length === 0) {
          consecutiveEmpty++;
          if (consecutiveEmpty >= 2) break; // Stop after 2 consecutive empty pages
          console.log(`[iOS] Trang ${page}: 0 reviews (sẽ thử trang tiếp)`);
          await new Promise(r => setTimeout(r, 3000));
          continue;
        }

        consecutiveEmpty = 0;
        let hasOlderReview = false;

        for (const review of reviews) {
          const reviewDate = new Date(review.updated.label);
          if (reviewDate >= startDate && reviewDate <= endDate) {
            allReviews.push({
              userName: review.author ? review.author.name.label : 'Ẩn danh',
              rating: parseInt(review['im:rating'].label),
              comment: review.content ? review.content.label : '',
              title: review.title ? review.title.label : '',
              date: reviewDate.toISOString().split('T')[0],
              version: review['im:version'] ? review['im:version'].label : '',
            });
          }
          if (reviewDate < startDate) {
            hasOlderReview = true;
          }
        }

        console.log(`[iOS] Trang ${page}: ${reviews.length} reviews, tổng cộng: ${allReviews.length}`);

        if (hasOlderReview) break;

        // Delay between pages to avoid rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (pageErr) {
        console.log(`[iOS] Trang ${page} lỗi: ${pageErr.message}`);
        break;
      }
    }

    console.log(`[iOS] Hoàn tất: ${allReviews.length} reviews trong khoảng thời gian`);

    // Generate Excel
    const filePath = await generateExcel(allReviews, 'ios_rating_comment.xlsx', appId, 'App Store');
    
    res.json({
      success: true,
      totalReviews: allReviews.length,
      filePath: '/api/download/ios_rating_comment.xlsx',
      appId: appId.toString(),
    });
  } catch (err) {
    console.error('[iOS] Lỗi:', err);
    res.status(500).json({ error: `Lỗi khi scrape App Store: ${err.message}` });
  }
});

// Generate Excel file
async function generateExcel(reviews, fileName, appId, storeName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Rating & Comment Scraper Tool';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Reviews', {
    properties: { defaultRowHeight: 22 },
  });

  // Define columns based on store type
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

    // Alternate row colors
    if (index % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8F9FA' },
      };
    }

    // Color-code rating cells
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

    // Wrap text for comment column
    row.getCell('comment').alignment = { wrapText: true, vertical: 'top' };
  });

  // Add summary sheet
  const summarySheet = workbook.addWorksheet('Tổng hợp', {
    properties: { defaultRowHeight: 25 },
  });

  // Calculate summary stats
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

  // Style summary header
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

  // Auto-filter on main sheet
  sheet.autoFilter = {
    from: 'A1',
    to: `${String.fromCharCode(64 + sheet.columns.length)}1`,
  };

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const filePath = path.join(OUTPUT_DIR, fileName);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

// Download files
app.get('/api/download/:filename', (req, res) => {
  const filePath = path.join(OUTPUT_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File không tồn tại. Vui lòng scrape lại.' });
  }
});

// Get app info for preview
app.post('/api/app-info/android', async (req, res) => {
  try {
    const { url } = req.body;
    const appId = extractGooglePlayId(url);
    if (!appId) {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }
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
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/app-info/ios', async (req, res) => {
  try {
    const { url } = req.body;
    const appId = extractAppStoreId(url);
    const country = extractAppStoreCountry(url);
    if (!appId) {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }
    // Use iTunes Lookup API for app info
    const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
    const data = await fetchJSON(lookupUrl);
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'Không tìm thấy ứng dụng' });
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
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📱 Mở trình duyệt để sử dụng tool\n`);
  });
}

module.exports = app;
