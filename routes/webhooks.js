const router = require("express").Router();
const prisma = require("../database");

router.post("/webhook/shrine", async (req, res) => {
  // MicroCMSからのデータがreq.bodyに入っている
  const shrine = req.body;

  // 神社情報をSupabaseに保存する処理
  const { data: existingShrine, error: shrineError } = await supabase
    .from("Shrine")
    .select("*")
    .eq("microCmsId", shrine.id);

  if (shrineError) {
    console.error("Error fetching shrine: ", shrineError.message);
    return res.status(500).json({ error: "Error fetching shrine data." });
  }

  if (existingShrine.length === 0) {
    // Insert new shrine
    const { error: insertError } = await supabase.from("Shrine").insert({
      name: shrine.shrineName,
      prefecture: shrine.prefectures[0],
      area: shrine.area,
      microCmsId: shrine.id,
      updatedAt: new Date(),
    });

    if (insertError) {
      console.error("Error inserting new shrine: ", insertError.message);
      return res.status(500).json({ error: "Error inserting new shrine." });
    }
  } else {
    // Update existing shrine
    const { error: updateError } = await supabase
      .from("Shrine")
      .update({
        name: shrine.shrineName,
        prefecture: shrine.prefectures[0],
        area: shrine.area,
        microCmsId: shrine.id,
        updatedAt: new Date(),
      })
      .eq("microCmsId", shrine.id);

    if (updateError) {
      console.error("Error updating existing shrine: ", updateError.message);
      return res.status(500).json({ error: "Error updating existing shrine." });
    }
  }

  // 御利益情報も含まれている場合、それも保存します
  if (shrine.benefits && shrine.benefits.length > 0) {
    for (let benefit of shrine.benefits) {
      const benefitId = benefit.id;

      // 御利益のデータをSupabaseに挿入
      const { data: existingBenefit, error: benefitError } = await supabase
        .from("ShrineBenefit")
        .select("*")
        .eq("name", benefit.benefit_name[0]);

      if (benefitError) {
        console.error("Error fetching benefit: ", benefitError.message);
        continue;
      }

      if (existingBenefit.length === 0) {
        // Insert new benefit
        const { error: insertBenefitError } = await supabase
          .from("ShrineBenefit")
          .insert({
            name: benefit.benefit_name[0],
            updatedAt: new Date(),
          });

        if (insertBenefitError) {
          console.error(
            "Error inserting new benefit: ",
            insertBenefitError.message
          );
          continue;
        }
      } else {
        // Update existing benefit
        const { error: updateBenefitError } = await supabase
          .from("ShrineBenefit")
          .update({
            name: benefit.benefit_name[0],
            updatedAt: new Date(),
          })
          .eq("name", benefit.benefit_name[0]);

        if (updateBenefitError) {
          console.error(
            "Error updating existing benefit: ",
            updateBenefitError.message
          );
          continue;
        }
      }
    }
  }

  // 処理が完了したらレスポンスを返す
  res.sendStatus(200);
});

module.exports = router;
