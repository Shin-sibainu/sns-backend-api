const router = require("express").Router();
const prisma = require("../database");

router.get("/prefectures", async (req, res) => {
  try {
    const prefectures = await prisma.shrine.groupBy({ by: ["prefecture"] });
    res.json(prefectures.map((pref) => pref.prefecture));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "都道府県名の取得に失敗しました" });
  }
});

router.get("/prefecture/:prefName", async (req, res) => {
  const { prefName } = req.params;
  try {
    const shrines = await prisma.shrine.findMany({
      where: { prefecture: prefName },
      orderBy: { name: "asc" },
      include: {
        posts: {
          where: { parentId: null },
          include: {
            user: true, // include User model
            likes: true, // include Likes model
            images: true,
          },
        },
      },
    });

    const shrinesWithPosts = shrines.map((shrine) => ({
      ...shrine,
      posts: shrine.posts.map((post) => ({
        ...post,
        likesCount: post.likes.length,
        shrineName: shrine.name, // use the shrine name from the outer scope
      })),
    }));

    res.json(shrinesWithPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "神社情報の取得に失敗しました" });
  }
});

router.get("/:shrineId", async (req, res) => {
  const { shrineId } = req.params;

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

router.get("/prefectures/postcount", async (req, res) => {
  try {
    // すべての投稿を取得
    const posts = await prisma.post.findMany({
      where: { parentId: null },
      include: {
        shrine: {
          select: {
            prefecture: true,
          },
        },
      },
    });

    // 都道府県ごとに集計
    const prefectureCount = {};
    for (const post of posts) {
      const prefecture = post.shrine.prefecture;
      if (prefecture in prefectureCount) {
        prefectureCount[prefecture]++;
      } else {
        prefectureCount[prefecture] = 1;
      }
    }

    // 集計結果を投稿数の多い順に並べ替えて、都道府県名と投稿数のペアの配列を作成
    const sortedPrefectures = Object.entries(prefectureCount)
      .sort((a, b) => b[1] - a[1])
      .map((item) => ({ name: item[0], count: item[1] }));

    res.json(sortedPrefectures);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "データの取得に失敗しました" });
  }
});

module.exports = router;
