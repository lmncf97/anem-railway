const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 ANEM Notifier is Working!',
    status: 'SUCCESS', 
    version: '1.0 - No Axios'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// API يعمل بدون axios
app.post('/api/check', (req, res) => {
  console.log('✅ API Called with:', req.body);
  
  // بيانات تجريبية - تعمل دائماً
  const response = {
    success: true,
    hasAppointment: Math.random() > 0.8, // 20% فرصة لموعد متاح
    eligible: true,
    hasPreInscription: true,
    message: Math.random() > 0.8 ? '🎉 موعد متاح تجريبي!' : '⏳ لا توجد مواعيد تجريبي',
    userInfo: {
      name: 'العلواني محمد اكرم',
      structure: 'الوكالة المحلية بوسعادة'
    },
    isMock: true,
    timestamp: new Date().toISOString()
  };
  
  console.log('📤 Sending response:', response.message);
  res.json(response);
});

// معالجة جميع المسارات غير المعروفة
app.use('*', (req, res) => {
  res.json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: ['GET /', 'GET /health', 'POST /api/check']
  });
});

// بدء الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🚀 SERVER STARTED - NO AXIOS VERSION');
  console.log(`📍 http://localhost:${PORT}`);
  console.log('✅ Ready for requests!');
  console.log('='.repeat(50));
});
