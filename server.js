const app = require('./api/index.js');
const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📱 Mở trình duyệt để sử dụng tool\n`);
  });
}

module.exports = app;
