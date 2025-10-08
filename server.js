import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/check", async (req, res) => {
  const { wassit, cin } = req.query;

  if (!wassit || !cin) {
    return res.status(400).json({ error: "Missing wassit or cin" });
  }

  try {
    // 1) تحقق المرشح
    const validateUrl = `https://ac-controle.anem.dz/AllocationChomage/api/validateCandidate/query?wassitNumber=${encodeURIComponent(wassit)}&identityDocNumber=${encodeURIComponent(cin)}`;
    const validateResp = await fetch(validateUrl, { headers: { Accept: "application/json" } });
    const validateData = await validateResp.json();

    if (!validateData.validInput || !validateData.eligible) {
      // نُعيد أيضاً الاسم إن كان موجوداً في الاستجابة (أحياناً لا)
      return res.json({
        available: false,
        reason: "Not eligible or invalid",
        validateData
      });
    }

    const { structureId, preInscriptionId } = validateData;

    // 2) جلب بيانات التسجيل المسبق للحصول على الاسم الكامل
    let fullNameFr = null;
    let fullNameAr = null;
    if (preInscriptionId) {
      try {
        const preUrl = `https://ac-controle.anem.dz/AllocationChomage/api/PreInscription/GetPreInscription?Id=${encodeURIComponent(preInscriptionId)}`;
        const preResp = await fetch(preUrl, { headers: { Accept: "application/json" } });
        const preData = await preResp.json();

        // صياغة الاسم الكامل بالفرنسية والعربية إن وجدت الحقول
        if (preData) {
          const fnFrParts = [];
          if (preData.prenomDemandeurFr) fnFrParts.push(preData.prenomDemandeurFr.trim());
          if (preData.nomDemandeurFr) fnFrParts.push(preData.nomDemandeurFr.trim());
          fullNameFr = fnFrParts.join(" ").trim() || null;

          const fnArParts = [];
          if (preData.prenomDemandeurAr) fnArParts.push(preData.prenomDemandeurAr.trim());
          if (preData.nomDemandeurAr) fnArParts.push(preData.nomDemandeurAr.trim());
          fullNameAr = fnArParts.join(" ").trim() || null;
        }
      } catch (e) {
        // لا نفشل العملية بسبب فشل جلب الاسم، نكمل ولكن نرسلك خطأ غير حرج
        console.warn("Failed to fetch PreInscription:", e.message);
      }
    }

    // 3) تحقق من التواريخ المتاحة
    const rdvUrl = `https://gestrdv.anem.dz/AllocationChomage/api/RendezVous/GetAvailableDates?StructureId=${structureId}&PreInscriptionId=${preInscriptionId}`;
    const rdvResp = await fetch(rdvUrl, { headers: { Accept: "application/json" } });
    const rdvData = await rdvResp.json();

    res.json({
      available: Array.isArray(rdvData.dates) && rdvData.dates.length > 0,
      dates: rdvData.dates || [],
      structureId,
      preInscriptionId,
      fullNameFr,
      fullNameAr,
      validateDataSummary: {
        haveRendezVous: !!validateData.haveRendezVous,
        eligible: !!validateData.eligible
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));
