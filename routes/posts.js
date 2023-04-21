const router = require("express").Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");
const multer = require("multer");
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

const POSTS_PER_PAGE = 10;

router.get("/posts", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * POSTS_PER_PAGE;

  try {
    const posts = await prisma.post.findMany({
      take: POSTS_PER_PAGE,
      skip,
      orderBy: { createdAt: "desc" },
    });

    res.json(posts);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Failed to fetch posts." });
  }
});

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

router.get("/get_posts", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * POSTS_PER_PAGE;

  try {
    const posts = await prisma.post.findMany({
      take: POSTS_PER_PAGE,
      skip,
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(posts);
  } catch (err) {
    res.status(500).json({ error: "Failed to get posts." });
  }
});

module.exports = router;
