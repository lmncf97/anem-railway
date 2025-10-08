import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/check", async (req, res) => {
  const { wassit, cin } = req.query;

  if (!wassit || !cin) {
    return res.status(400).json({ error: "Missing wassit or cin" });
  }

  try {
    // 🔹 1. نتحقق من بيانات المرشح
    const validateUrl = `https://ac-controle.anem.dz/AllocationChomage/api/validateCandidate/query?wassitNumber=${wassit}&identityDocNumber=${cin}`;
    const validateResponse = await fetch(validateUrl);
    const validateData = await validateResponse.json();

    if (!validateData.validInput || !validateData.eligible) {
      return res.json({ available: false, reason: "Not eligible or invalid" });
    }

    const { structureId, preInscriptionId } = validateData;

    // 🔹 2. نتحقق من المواعيد
    const rdvUrl = `https://gestrdv.anem.dz/AllocationChomage/api/RendezVous/GetAvailableDates?StructureId=${structureId}&PreInscriptionId=${preInscriptionId}`;
    const rdvResponse = await fetch(rdvUrl);
    const rdvData = await rdvResponse.json();

    res.json({
      available: rdvData.dates?.length > 0,
      dates: rdvData.dates || [],
      structureId,
      preInscriptionId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Proxy running on port ${PORT}`));
