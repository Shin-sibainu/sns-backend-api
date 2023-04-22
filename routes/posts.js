const router = require("express").Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");
const multer = require("multer");
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

const POSTS_PER_PAGE = 10;

//テキスト投稿API
router.post("/text", async (req, res) => {
  const { userId, content } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: "ユーザーが見つかりません" });
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content,
      },
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json(err);
    res.status(500).json({ error: "テキスト投稿できませんでした。" });
  }
});

//画像投稿API
router.post("/image_upload", upload.single("image"), async (req, res) => {
  const { userId, content } = req.body;
  const imageFile = req.file;
  // console.log(imageFile);

  if (!imageFile) {
    return res.status(400).json({ error: "Image file is required." });
  }

  try {
    // 画像をSupabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(imageFile.originalname, imageFile.buffer);

    if (error) {
      // console.log(error.message);
      return res.status(500).json({ error: "Failed to upload the image." });
    }

    // console.log(data);

    //テキストと画像のURLを投稿として保存
    const imageUrl = data.path; //画像のURLを取得
    const post = await prisma.post.create({
      data: {
        userId,
        content: `${content}\n\n![Image](${imageUrl})`,
        image: imageUrl,
      },
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ error: "Failed to create an image post." });
  }
});

//最新投稿の10件取得API（いいね数取得も）
router.get("/get_posts", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * POSTS_PER_PAGE;

  try {
    const posts = await prisma.post.findMany({
      take: POSTS_PER_PAGE,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        likes: true,
      },
    });

    const postsWithLikesCount = posts.map((post) => ({
      ...post,
      likesCount: post.likes.length,
    }));

    res.json(postsWithLikesCount);
  } catch (err) {
    res.status(500).json({ error: "Failed to get posts." });
  }
});

module.exports = router;
