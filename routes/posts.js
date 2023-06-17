const router = require("express").Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");
const multer = require("multer");
const storage = multer.memoryStorage();

const upload = multer().array("images", 10); // Accept up to 10 files

const POSTS_PER_PAGE = 5;

//テキスト投稿と画像投稿をまとめたAPI
router.post("/post", upload, async (req, res) => {
  const { userId, title, shrineId, content, visitedDate } = req.body;
  const imageFiles = req.files;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      console.log("ログインしていません。");
      return res.status(404).json({ error: "ユーザーが見つかりません" });
    }

    //ここではSupabaseのshrineテーブルから神社を取得している。
    const shrine = await prisma.shrine.findUnique({
      where: { microCmsId: shrineId },
    });

    if (!shrine) {
      // error handling
      return res.status(404).json({ error: "神社が見つかりません" });
    }

    // let imageUrl;
    // if (imageFile) {
    //   // 画像をSupabase Storageにアップロード
    //   const { data, error } = await supabase.storage
    //     .from("post-images")
    //     .upload(imageFile.originalname, imageFile.buffer);

    //   if (error) {
    //     console.log(error.message);
    //     return res.status(500).json({ error: "Failed to upload the image." });
    //   }
    //   imageUrl = data.path; //画像のURLを取得
    // }

    let imageUrls = [];
    if (imageFiles) {
      for (let imageFile of imageFiles) {
        // 画像をSupabase Storageにアップロード
        const { data, error } = await supabase.storage
          .from("post-images")
          .upload(imageFile.originalname, imageFile.buffer, {
            contentType: imageFile.mimetype,
          });

        if (error) {
          console.log(error.message);
          return res.status(500).json({ error: "Failed to upload the image." });
        }
        imageUrls.push(data.path); //画像のURLを配列に追加
      }
    }

    const visitedDateTime = new Date(visitedDate);

    const postData = {
      userId,
      title,
      shrineId: shrine.id, // ここを変更
      content: content,
      visitedDate: visitedDateTime,
    };

    // create post
    const post = await prisma.post.create({
      data: postData,
    });

    // create images
    if (imageUrls.length > 0) {
      for (let imageUrl of imageUrls) {
        await prisma.image.create({
          data: {
            postId: post.id,
            url: imageUrl,
          },
        });
      }
    }

    res.status(201).json(post);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to create a post." });
  }
});

//最新投稿の5件取得API（いいね数取得も）
router.get("/get_posts_for_timeline", async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: { parentId: null },
      take: POSTS_PER_PAGE,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        likes: true,
        shrine: true,
        images: true,
      },
    });

    const postsWithLikesCount = posts.map((post) => ({
      ...post,
      likesCount: post.likes.length,
      shrineName: post.shrine.name, // ここでshrineのnameを取得できます
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
        user: true,
        likes: true,
        shrine: true,
      },
    });

    const postsWithLikesCount = posts.map((post) => ({
      ...post,
      likesCount: post.likes.length,
      shrineName: post.shrine.name, // ここでshrineのnameを取得できます
    }));

    res.json(postsWithLikesCount);
  } catch (err) {
    res.status(500).json({ error: "Failed to get posts." });
  }
});

//フォロー中ユーザーのもっと見るAPI
router.get("/get_more_following_posts/:loggedInUserId", async (req, res) => {
  const { loggedInUserId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const skip = (page - 1) * POSTS_PER_PAGE;

  try {
    // 先ず現在のユーザーがフォローしているユーザーのIDを取得
    const currentUser = await prisma.user.findUnique({
      where: { id: loggedInUserId },
      select: {
        following: {
          select: {
            followedId: true,
          },
        },
      },
    });

    // フォローしているユーザーのIDのみを配列として取り出す
    // const followingIds = currentUser.following.map((user) => String(user.id));
    const followingIds = currentUser.following.map(
      (follow) => follow.followedId
    );

    // フォローしているユーザーの投稿を取得
    const posts = await prisma.post.findMany({
      where: {
        AND: [{ userId: { in: followingIds } }, { parentId: null }],
      },
      take: POSTS_PER_PAGE,
      skip,
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        likes: true,
        shrine: true,
      },
    });

    const postsWithLikesCount = posts.map((post) => ({
      ...post,
      likesCount: post.likes.length,
      shrineName: post.shrine.name, // ここでshrineのnameを取得できます
    }));

    res.json(postsWithLikesCount);
  } catch (err) {
    console.error("Error fetching posts:", err);
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
        user: true,
        shrine: true,
        images: true,
      },
    });

    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    const postWithLikesCount = {
      ...post,
      likesCount: post.likes.length,
      shrineName: post.shrine.name, // ここでshrineのnameを取得できます
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

  // console.log(content, userId, postId);

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
        shrineId: originalPost.shrineId, // 追加: 元の投稿のshrineIdを利用
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
      orderBy: { createdAt: "asc" },
    });

    return res.json(replies);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get replies." });
  }
});

//投稿削除API
router.delete("/:postId", async (req, res) => {
  const postId = Number(req.params.postId);
  const { userId } = req.body; // ここでは、req.user.idがログイン中のユーザーのIDであると仮定します。

  // 先ずは投稿を取得します
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });

  // ユーザーが投稿の所有者でない場合はエラーメッセージを返します
  if (post.userId !== userId) {
    return res
      .status(403)
      .json({ message: "You can only delete your own posts." });
  }

  // ユーザーが投稿の所有者である場合は、まず関連するいいねを削除します
  await prisma.like.deleteMany({
    where: {
      postId: postId,
    },
  });

  // ユーザーが投稿の所有者である場合は投稿を削除します
  const deletedPost = await prisma.post.delete({
    where: {
      id: postId,
    },
  });

  res.json(deletedPost);
});

//投稿編集API
router.put("/:postId", upload, async (req, res) => {
  const postId = Number(req.params.postId);
  const { userId, title, content, shrineId, visitedDate } = req.body; // これらはリクエストボディから送られてくる更新したいデータです
  const imageFile = req.file;

  // console.log(userId, title, content, shrineId, visitedDate);

  // 先ずは投稿を取得します
  const post = await prisma.post.findUnique({
    where: {
      id: postId,
    },
  });

  // ユーザーが投稿の所有者でない場合はエラーメッセージを返します
  if (post.userId !== userId) {
    return res
      .status(403)
      .json({ message: "You can only edit your own posts." });
  }

  const shrine = await prisma.shrine.findUnique({
    where: { microCmsId: shrineId },
  });

  if (!shrine) {
    return res.status(404).json({ error: "指定の神社は存在しません" });
  }

  let imageUrl = post.image;
  if (imageFile) {
    // 画像をSupabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from("post-images")
      .upload(imageFile.originalname, imageFile.buffer, { upsert: true });

    if (error) {
      console.log(error.message);
      return res.status(500).json({ error: "Failed to upload the image." });
    }
    imageUrl = data.path; //画像のURLを取得
  }

  // ユーザーが投稿の所有者である場合は投稿を更新します
  const updatedPost = await prisma.post.update({
    where: {
      id: postId,
    },
    data: {
      title,
      content,
      shrineId: shrine.id, // ここを変更
      visitedDate: new Date(visitedDate),
      image: imageUrl,
    },
  });

  res.json(updatedPost);
});

module.exports = router;
