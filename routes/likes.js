const router = require("express").Router();
const prisma = require("../database");

//投稿いいね＆いいね削除API
router.post("/:postId", async (req, res) => {
  const postId = parseInt(req.params.postId); //:postIdの値
  const userId = req.body.userId; //req.bodyに含める値

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    return res.status(404).json({ error: "Post not found." });
  }

  try {
    //すでにいいねが存在するか確認。
    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        postId,
      },
    });

    // console.log(existingLike);

    if (existingLike) {
      //いいねがあれば削除する。
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      res.status(200).json({ message: "Like removed" });
    } else {
      //いいねがなければ、いいねする。
      const like = await prisma.like.create({
        data: {
          userId,
          postId,
        },
      });
      res.status(201).json(like);
    }
  } catch (err) {
    console.error(err); // Add this line
    res.status(500).json({ error: "Failed to like the post." });
  }
});

module.exports = router;
