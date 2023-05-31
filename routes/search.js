const router = require("express").Router();
const prisma = require("../database");

//search
router.get("/", async (req, res) => {
  const searchTerm = req.query.term;

  if (!searchTerm) {
    return res.status(400).json({ message: "Search term is required" });
  }

  const searchResults = await prisma.post.findMany({
    where: {
      AND: [
        {
          parentId: null, // 返信でない投稿
        },
        {
          OR: [
            {
              title: {
                contains: searchTerm,
                mode: "insensitive", // case-insensitive
              },
            },
            {
              shrineName: {
                contains: searchTerm,
                mode: "insensitive", // case-insensitive
              },
            },
          ],
        },
      ],
    },
    include: {
      user: true,
      likes: true,
    },
  });

  res.json(searchResults);
});

module.exports = router;
