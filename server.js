const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ✅ إضافة مسار لـ favicon لتجنب خطأ 404
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 ANEM Notifier API is Live!',
    status: 'OK',
    version: '1.2 - Error Fixed'
  });
});

// ✅ الإصدار النهائي مع معالجة الأخطاء
app.post('/api/check', async (req, res) => {
  console.log('📨 Received request:', JSON.stringify(req.body));
  
  try {
    const { cardNumber, nationalId } = req.body;

    // التحقق من البيانات المدخلة
    if (!cardNumber || !nationalId) {
      return res.status(400).json({
        success: false,
        error: 'رقم البطاقة ورقم الهوية مطلوبان'
      });
    }

    console.log('🔍 Checking ANEM for card:', cardNumber);

    // استخدم axios بدلاً من fetch (أكثر استقراراً)
    const axios = require('axios');
    
    // إعدادات SSL
    const https = require('https');
    const httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      timeout: 45000
    });

    const response = await axios.get(
      `https://ac-controle.anem.dz/AllocationChomage/api/validateCandidate/query?wassitNumber=${cardNumber}&identityDocNumber=${nationalId}`,
      {
        httpsAgent: httpsAgent,
        timeout: 45000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      }
    );

    console.log('✅ ANEM API responded successfully');
    const data = response.data;

    // النتيجة النهائية
    const result = {
      success: true,
      hasAppointment: data.haveRendezVous,
      eligible: data.eligible,
      hasPreInscription: data.havePreInscription,
      message: data.haveRendezVous ? 
        '🎉 موعد متاح! سارع بالحجز!' : 
        '⏳ لا توجد مواعيد متاحة حالياً',
      userInfo: {
        name: data.nomDemandeurAr + ' ' + data.prenomDemandeurAr,
        structure: data.structureAr
      },
      timestamp: new Date().toISOString()
    };

    console.log('📊 Result:', result.message);
    res.json(result);

  } catch (error) {
    console.error('❌ Detailed Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data
    });

    // ردود خطأ محددة
    let errorMessage = 'فشل في الاتصال بخدمة ANEM';
    let suggestion = 'يرجى المحاولة مرة أخرى لاحقاً';

    if (error.code === 'ECONNABORTED') {
      errorMessage = 'انتهت مدة الانتظار';
      suggestion = 'ANEM يستغرق وقتاً طويلاً للرد';
    } else if (error.response) {
      errorMessage = `ANEM رد بالخطأ: ${error.response.status}`;
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message,
      suggestion: suggestion
    });
  }
});

// ✅ بدء الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🚀 ANEM Notifier - Error Fixed Version');
  console.log(`📍 Running on port: ${PORT}`);
  console.log('✅ Ready for testing!');
  console.log('='.repeat(60));
});
