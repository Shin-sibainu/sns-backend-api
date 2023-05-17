const router = require("express").Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");
const multer = require("multer");
const storage = multer.memoryStorage();

const upload = multer({ storage }).single("image");

const POSTS_PER_PAGE = 5;

// //テキスト投稿API
// router.post("/text", async (req, res) => {
//   const { userId, content, title, shrineName, visitedDate } = req.body;

//   try {
//     const user = await prisma.user.findUnique({ where: { id: userId } });

//     if (!user) {
//       return res.status(404).json({ error: "ユーザーが見つかりません" });
//     }

//     const post = await prisma.post.create({
//       data: {
//         userId,
//         title,
//         content,
//         shrineName,
//         visitedDate,
//       },
//     });

//     res.status(201).json(post);
//   } catch (err) {
//     res.status(500).json(err);
//     res.status(500).json({ error: "テキスト投稿できませんでした。" });
//   }
// });

// //画像投稿API
// router.post("/image_upload", upload.single("image"), async (req, res) => {
//   const { userId, content } = req.body;
//   const imageFile = req.file;
//   // console.log(imageFile);

//   if (!imageFile) {
//     return res.status(400).json({ error: "Image file is required." });
//   }

//   try {
//     // 画像をSupabase Storageにアップロード
//     const { data, error } = await supabase.storage
//       .from("post-images")
//       .upload(imageFile.originalname, imageFile.buffer);

//     if (error) {
//       console.log(error.message);
//       return res.status(500).json({ error: "Failed to upload the image." });
//     }

//     // console.log(data);

//     //テキストと画像のURLを投稿として保存
//     const imageUrl = data.path; //画像のURLを取得
//     const post = await prisma.post.create({
//       data: {
//         userId,
//         content: `${content}\n\n![Image](${imageUrl})`,
//         image: imageUrl,
//       },
//     });

//     res.status(201).json(post);
//   } catch (error) {
//     res.status(500).json({ error: "Failed to create an image post." });
//   }
// });

//テキスト投稿と画像投稿をまとめたAPI
router.post("/post", upload, async (req, res) => {
  const { userId, title, shrineName, content, visitedDate } = req.body;
  const imageFile = req.file;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log("ログインしていません。");
      return res.status(404).json({ error: "ユーザーが見つかりません" });
    }

    let imageUrl;
    if (imageFile) {
      // 画像をSupabase Storageにアップロード
      const { data, error } = await supabase.storage
        .from("post-images")
        .upload(imageFile.originalname, imageFile.buffer);

      if (error) {
        console.log(error.message);
        return res.status(500).json({ error: "Failed to upload the image." });
      }
      imageUrl = data.path; //画像のURLを取得
    }

    const visitedDateTime = new Date(visitedDate);

    const postData = {
      userId,
      title,
      shrineName,
      content: content,
      visitedDate: visitedDateTime,
    };

    if (imageUrl) {
      postData.image = imageUrl;
    }

    const post = await prisma.post.create({
      data: postData,
    });

    res.status(201).json(post);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to create a post." });
  }
});
//最新投稿の10件取得API（いいね数取得も）
router.get("/get_posts_for_timeline", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { parentId: null },
      take: POSTS_PER_PAGE,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
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
//もっと見る用のAPI
router.get("/get_more_posts", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * POSTS_PER_PAGE;

  try {
    const posts = await prisma.post.findMany({
      where: { parentId: null },
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
//投稿の詳細ページ取得
router.get("/:postId", async (req, res) => {
  const postId = parseInt(req.params.postId);

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        likes: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    const postWithLikesCount = {
      ...post,
      likesCount: post.likes.length,
    };

    res.json(postWithLikesCount);
  } catch (err) {
    res.status(500).json({ error: "Failed to get post details." });
  }
});

//投稿への返信用API
router.post("/:postId/reply", async (req, res) => {
  const { content, userId } = req.body;
  const { postId } = req.params;

  console.log(content, userId, postId);

  try {
    const originalPost = await prisma.post.findUnique({
      where: { id: Number(postId) },
    });

    if (!originalPost) {
      return res.status(404).json({ error: "元の投稿が見つかりません。" });
    }

    const post = await prisma.post.create({
      data: {
        content,
        userId,
        parentId: Number(postId),
        title: originalPost.title,
        shrineName: originalPost.shrineName,
        visitedDate: originalPost.visitedDate,
      },
    });

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ error: "Failed to create reply." });
  }
});

//投稿への返信取得用API
router.get("/:postId/replies", async (req, res) => {
  const postId = req.params.postId;

  try {
    const replies = await prisma.post.findMany({
      where: {
        parentId: Number(postId),
      },
      include: {
        user: true,
      },
    });

    return res.json(replies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get replies." });
  }
});

module.exports = router;
