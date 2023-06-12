const router = require("express").Router();
const prisma = require("../database");

router.get("/:shrineId", async (req, res) => {
  const { shrineId } = req.params;
  console.log(shrineId);
  console.log("a");

  try {
    const shrine = await prisma.shrine.findUnique({
      where: { microCmsId: shrineId },
    });

    if (!shrine) {
      return res.status(404).json({ error: "そのような神社は存在しません" });
    }

    res.json(shrine);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "神社情報の取得に失敗しました" });
  }
});

module.exports = router;
