const router = require("express").Router();
const prisma = require("../database");

//search(神社名のみ)
router.get("/search-shrine-name", async (req, res) => {
  const searchTerm = req.query.term;

  if (!searchTerm) {
    return res.status(400).json({ message: "神社名を入力してください。" });
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

  // If no matching shrines were found, return an error
  if (shrineIds.length === 0) {
    return res
      .status(404)
      .json({ message: "指定した神社が存在しませんでした。" });
  }

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

//search(都道府県と御利益の複合検索)
router.get("/search-prefecture-and-benefit", async (req, res) => {
  const { prefecture, benefit, searchTerm } = req.query;

  // 誰もが選択しない場合、エラーメッセージを表示
  if (!searchTerm && (!prefecture || !benefit)) {
    return res
      .status(400)
      .json({ message: "Search term or (Prefecture and Benefit) is required" });
  }

  // 検索するための都道府県と御利益をもつ神社を見つける
  const shrines = await prisma.shrine.findMany({
    where: {
      AND: [
        // 都道府県と御利益が指定されている場合に適用する検索条件
        {
          prefecture: prefecture,
          shrineTags: {
            some: {
              shrineBenefit: {
                name: benefit,
              },
            },
          },
        },
        // 検索文字列が指定されている場合に適用する検索条件
        searchTerm && {
          name: {
            contains: searchTerm,
            mode: "insensitive", // case-insensitive
          },
        },
      ].filter(Boolean), // undefined を取り除く
    },
    select: { id: true }, // We only need the IDs here
  });

  // Map the shrines array to an array of shrine IDs
  const shrineIds = shrines.map((shrine) => shrine.id);

  // If no matching shrines were found, return an error
  if (shrineIds.length === 0) {
    return res
      .status(404)
      .json({ message: "指定した神社が存在しませんでした。" });
  }

  // Find posts that are associated with the found shrines
  const posts = await prisma.post.findMany({
    where: {
      AND: [
        {
          shrineId: {
            in: shrineIds,
          },
        },
        {
          parentId: null, // Not a reply
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

  const postsWithLikesCountAndShrineName = posts.map((post) => ({
    ...post,
    likesCount: post.likes.length,
    shrineName: post.shrine ? post.shrine.name : null, // check if shrine exists
  }));

  res.json(postsWithLikesCountAndShrineName);
});

module.exports = router;
