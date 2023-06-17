const router = require("express").Router();
const prisma = require("../database");

//search
router.get("/", async (req, res) => {
  const searchTerm = req.query.term;

  if (!searchTerm) {
    return res.status(400).json({ message: "Search term is required" });
  }

  // Step 1: Fetch Shrine IDs that match the search term
  const matchingShrines = await prisma.shrine.findMany({
    where: {
      name: {
        contains: searchTerm,
        mode: "insensitive", // case-insensitive
      },
    },
    select: {
      id: true,
    },
  });

  const shrineIds = matchingShrines.map((shrine) => shrine.id);

  // Step 2: Fetch posts that match the search term or are associated with matching shrines
  const searchResults = await prisma.post.findMany({
    where: {
      AND: [
        {
          parentId: null, // Not a reply
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
              shrineId: {
                in: shrineIds,
              },
            },
          ],
        },
      ],
    },
    include: {
      user: true,
      likes: true,
      shrine: true,
      images: true,
    },
  });

  const searchResultsWithShrineName = searchResults.map((post) => ({
    ...post,
    shrineName: post.shrine ? post.shrine.name : null, // check if shrine exists
  }));

  res.json(searchResultsWithShrineName);
});

module.exports = router;
