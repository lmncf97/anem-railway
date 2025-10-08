import express from "express";
import fetch from "node-fetch";
import https from "https";

const app = express();
app.use(express.json());

// للسماح لأي موقع بالوصول للبروكسي (CORS)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

// إعداد عميل HTTPS لتجاوز مشاكل TLS القديمة في خوادم anem
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // لتجاهل الشهادات القديمة
});

// 🔹 نقطة التحقق الرئيسية
app.get("/api/check", async (req, res) => {
  const { wassit, cin } = req.query;

  if (!wassit || !cin) {
    return res.status(400).json({ error: "Missing wassit or cin" });
  }

  try {
    // الخطوة 1: تحقق من بيانات المترشح
    const validateUrl = `https://ac-controle.anem.dz/AllocationChomage/api/validateCandidate/query?wassitNumber=${wassit}&identityDocNumber=${cin}`;
    const validateResponse = await fetch(validateUrl, { agent: httpsAgent });
    const validateData = await validateResponse.json();

    if (!validateData.validInput) {
      return res.json({ error: "Invalid input data" });
    }

    const preId = validateData.preInscriptionId;
    const structureId = validateData.structureId;

    // الخطوة 2: جلب المعلومات الشخصية
    const preUrl = `https://ac-controle.anem.dz/AllocationChomage/api/PreInscription/GetPreInscription?Id=${preId}`;
    const preResponse = await fetch(preUrl, { agent: httpsAgent });
    const preData = await preResponse.json();

    const fullNameFr = `${preData.prenomDemandeurFr} ${preData.nomDemandeurFr}`;
    const fullNameAr = `${preData.prenomDemandeurAr} ${preData.nomDemandeurAr}`;

    // الخطوة 3: جلب المواعيد المتاحة
    const rdvUrl = `https://gestrdv.anem.dz/AllocationChomage/api/RendezVous/GetAvailableDates?StructureId=${structureId}&PreInscriptionId=${preId}`;
    const rdvResponse = await fetch(rdvUrl, { agent: httpsAgent });
    const rdvData = await rdvResponse.json();

    const available = rdvData.dates && rdvData.dates.length > 0;

    res.json({
      available,
      dates: rdvData.dates || [],
      structureId,
      preInscriptionId: preId,
      fullNameFr,
      fullNameAr,
    });
  } catch (error) {
    console.error("Error fetching data:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// تشغيل السيرفر
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Proxy running on port ${port}`));
