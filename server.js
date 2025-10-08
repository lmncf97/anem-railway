const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(express.json());
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.get('/', (req, res) => {
  res.json({ 
    message: '🎉 ANEM Notifier API - Complete System',
    status: 'OK',
    description: 'يستقبل رقم بطاقة العمل ورقم التعريف الوطني ليجلب البيانات من ANEM'
  });
});

app.post('/api/check', async (req, res) => {
  const { cardNumber, nationalId } = req.body;
  
  console.log('🔐 Received credentials:', {
    cardNumber: cardNumber,
    nationalId: nationalId ? nationalId.substring(0, 6) + '...' : 'missing'
  });

  if (!cardNumber || !nationalId) {
    return res.json({
      success: false,
      error: 'يرجى إدخال رقم بطاقة العمل ورقم التعريف الوطني'
    });
  }

  try {
    // 1. التحقق من الهوية والأهلية
    console.log('1️⃣ التحقق من الهوية...');
    const validationUrl = `https://ac-controle.anem.dz/AllocationChomage/api/validateCandidate/query?wassitNumber=${cardNumber}&identityDocNumber=${nationalId}`;
    
    const validationResponse = await fetch(validationUrl, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://minha.anem.dz',
        'Referer': 'https://minha.anem.dz/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 15000
    });

    if (!validationResponse.ok) {
      throw new Error(`فشل في التحقق: ${validationResponse.status}`);
    }

    const validationData = await validationResponse.json();
    console.log('✅ التحقق:', {
      eligible: validationData.eligible,
      hasPreInscription: validationData.havePreInscription,
      hasAppointment: validationData.haveRendezVous
    });

    // 2. إذا كان مسجلاً، جلب البيانات الكاملة
    let userData = {};
    if (validationData.havePreInscription && validationData.preInscriptionId) {
      console.log('2️⃣ جلب البيانات الشخصية...');
      const userUrl = `https://ac-controle.anem.dz/AllocationChomage/api/PreInscription/GetPreInscription?Id=${validationData.preInscriptionId}`;
      
      const userResponse = await fetch(userUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://minha.anem.dz',
          'Referer': 'https://minha.anem.dz/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      if (userResponse.ok) {
        userData = await userResponse.json();
        console.log('📋 البيانات الشخصية:', {
          name: userData.prenomDemandeurAr + ' ' + userData.nomDemandeurAr,
          birthDate: userData.dateNaissance,
          agency: userData.structureAr
        });
      }
    }

    // 3. التحقق من المواعيد المتاحة
    let availableDates = [];
    if (validationData.structureId && validationData.preInscriptionId) {
      console.log('3️⃣ التحقق من المواعيد...');
      const datesUrl = `https://gestrdv.anem.dz/AllocationChomage/api/RendezVous/GetAvailableDates?StructureId=${validationData.structureId}&PreInscriptionId=${validationData.preInscriptionId}`;
      
      const datesResponse = await fetch(datesUrl, {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 15000
      });

      if (datesResponse.ok) {
        const datesData = await datesResponse.json();
        availableDates = datesData.dates || [];
        console.log('📅 المواعيد المتاحة:', availableDates.length);
      }
    }

    // 4. إعداد الرد النهائي
    const response = {
      success: true,
      hasAppointment: validationData.haveRendezVous,
      appointmentsAvailable: availableDates.length > 0,
      availableDates: availableDates,
      eligible: validationData.eligible,
      hasPreInscription: validationData.havePreInscription,
      userInfo: {
        nomAr: userData.nomDemandeurAr || '',
        prenomAr: userData.prenomDemandeurAr || '',
        dateNaissance: userData.dateNaissance ? this.formatDate(userData.dateNaissance) : 'غير محدد',
        structureAr: userData.structureAr || '',
        numeroDemandeur: userData.numeroDemandeur || cardNumber
      },
      message: this.generateStatusMessage(validationData.haveRendezVous, availableDates.length),
      isRealData: true,
      timestamp: new Date().toISOString()
    };

    console.log('🎯 الإرسال النهائي:', response.message);
    res.json(response);

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    res.json({
      success: false,
      error: 'فشل في الاتصال بخدمة ANEM: ' + error.message,
      suggestion: 'يرجى المحاولة مرة أخرى لاحقاً'
    });
  }
});

// دالة مساعدة لتنسيق التاريخ
function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

// دالة مساعدة لإنشاء رسالة الحالة
function generateStatusMessage(hasAppointment, availableDatesCount) {
  if (availableDatesCount > 0) {
    return `🎉 ${availableDatesCount} موعد متاح! سارع بالحجز`;
  } else if (hasAppointment) {
    return '📅 لديك موعد مسبق';
  } else {
    return '⏳ لا توجد مواعيد متاحة حالياً';
  }
}

// إرفاق الدوال المساعدة
app.locals.formatDate = formatDate;
app.locals.generateStatusMessage = generateStatusMessage;

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ANEM Notifier System Running on port', PORT);
  console.log('📡 يستقبل: رقم بطاقة العمل + رقم التعريف الوطني');
  console.log('📨 يرد بـ: الاسم، التاريخ، الوكالة، حالة الموعد');
});
