const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// تجاهل أخطاء SSL للاتصال بـ ANEM
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ✅ الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 ANEM Notifier API is Running!',
    service: 'Algerian Unemployment Appointment Notifier',
    status: 'OK',
    version: '1.0',
    endpoints: {
      health: '/health',
      check: 'POST /api/check'
    }
  });
});

// ✅ Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'ANEM Notifier',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ التحقق من حالة ANEM
app.post('/api/check', async (req, res) => {
  try {
    const { cardNumber, nationalId } = req.body;

    // التحقق من البيانات
    if (!cardNumber || !nationalId) {
      return res.status(400).json({
        success: false,
        error: 'رقم البطاقة ورقم الهوية مطلوبان'
      });
    }

    console.log('🔍 Checking ANEM for:', cardNumber);

    // الاتصال بـ ANEM API
    const response = await fetch(
      `https://ac-controle.anem.dz/AllocationChomage/api/validateCandidate/query?wassitNumber=${cardNumber}&identityDocNumber=${nationalId}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'ar,en;q=0.9,fr;q=0.8'
        },
        timeout: 30000
      }
    );

    if (!response.ok) {
      throw new Error(`ANEM API returned status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ ANEM API response received');

    // إعداد الرد
    const result = {
      success: true,
      hasAppointment: data.haveRendezVous,
      eligible: data.eligible,
      hasPreInscription: data.havePreInscription,
      appointmentsAvailable: false, // سيتم تحديثه لاحقاً
      userInfo: {
        nom: data.nomDemandeurAr,
        prenom: data.prenomDemandeurAr,
        structure: data.structureAr
      },
      message: data.haveRendezVous ? 
        '🎉 موعد متاح! سارع بالحجز!' : 
        '⏳ لا توجد مواعيد متاحة حالياً',
      timestamp: new Date().toISOString()
    };

    res.json(result);

  } catch (error) {
    console.error('❌ ANEM API Error:', error.message);
    
    res.status(500).json({
      success: false,
      error: 'فشل في الاتصال بخدمة ANEM',
      details: error.message,
      suggestion: 'يرجى المحاولة مرة أخرى لاحقاً'
    });
  }
});

// ✅ بدء الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🚀 ANEM Notifier deployed on Railway!');
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(60));
});