const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 ANEM Notifier - Enhanced Version',
    status: 'SUCCESS', 
    version: '2.0 - Full User Data'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// API مع بيانات مستخدم كاملة
app.post('/api/check', (req, res) => {
  console.log('✅ API Called with:', req.body);
  
  // بيانات تجريبية كاملة - تشبه بيانات ANEM الحقيقية
  const userProfiles = {
    "282003014552": {
      success: true,
      hasAppointment: false,
      eligible: true,
      hasPreInscription: true,
      userInfo: {
        nomFr: "Lalouani",
        prenomFr: "Mohamed akram", 
        nomAr: "العلواني",
        prenomAr: "محمد اكرم",
        dateNaissance: "2003-05-14",
        structureAr: "الوكالة المحلية بوسعادة",
        structureFr: "Alem BOUSSAADA",
        numeroDemandeur: "282003014552"
      },
      appointmentInfo: {
        hasRendezVous: false,
        availableDates: [],
        lastChecked: new Date().toISOString()
      },
      message: '⏳ لا توجد مواعيد متاحة حالياً',
      isMock: true
    },
    "123456789": {
      success: true,
      hasAppointment: true,
      eligible: true,
      hasPreInscription: true,
      userInfo: {
        nomFr: "Smith",
        prenomFr: "John",
        nomAr: "سميث", 
        prenomAr: "جون",
        dateNaissance: "1995-08-20",
        structureAr: "الوكالة المحلية الجزائر",
        structureFr: "Agence Alger Centre",
        numeroDemandeur: "123456789"
      },
      appointmentInfo: {
        hasRendezVous: true,
        availableDates: ["2024-01-20", "2024-01-21"],
        lastChecked: new Date().toISOString()
      },
      message: '🎉 موعد متاح! تواريخ: 20-21 يناير 2024',
      isMock: true
    }
  };

  const { cardNumber, nationalId } = req.body;
  
  // استخدام بيانات محددة أو افتراضية
  let response;
  if (userProfiles[cardNumber]) {
    response = userProfiles[cardNumber];
  } else {
    // بيانات افتراضية إذا لم يكن الرقم معروفاً
    response = {
      success: true,
      hasAppointment: Math.random() > 0.7,
      eligible: true,
      hasPreInscription: true,
      userInfo: {
        nomAr: "المستخدم",
        prenomAr: "تجريبي",
        dateNaissance: "2000-01-01", 
        structureAr: "الوكالة المحلية التجريبية",
        structureFr: "Agence Test",
        numeroDemandeur: cardNumber
      },
      appointmentInfo: {
        hasRendezVous: Math.random() > 0.7,
        availableDates: Math.random() > 0.7 ? ["2024-01-15", "2024-01-16"] : [],
        lastChecked: new Date().toISOString()
      },
      message: Math.random() > 0.7 ? '🎉 موعد تجريبي متاح!' : '⏳ لا توجد مواعيد تجريبية',
      isMock: true
    };
  }
  
  console.log('📤 Sending user data for:', response.userInfo.prenomAr + ' ' + response.userInfo.nomAr);
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
  console.log('🚀 ENHANCED ANEM NOTIFIER - FULL USER DATA');
  console.log(`📍 http://localhost:${PORT}`);
  console.log('✅ Ready with complete user profiles!');
  console.log('='.repeat(50));
});
