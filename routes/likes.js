const router = require("express").Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");

router.post("/:postId", async (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });

  if (!post) {
    return res.status(404).json({ error: "Post not found." });
  }

  try {
    const like = await prisma.like.create({
      data: {
        userId,
        postId,
      },
    });
    res.status(201).json(like);
  } catch (err) {
    console.error(err); // Add this line
    res.status(500).json({ error: "Failed to like the post." });
  }
});

router.delete("/:postId", async (req, res) => {
  const postId = parseInt(req.params.postId);
  const userId = req.body.userId;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required." });
  }

  try {
    const like = await prisma.like.deleteMany({
      where: {
        userId,
        postId,
      },
    });

    res.status(200).json(like);
  } catch (error) {
    res.status(500).json({ error: "Failed to remove the like from the post." });
  }
});

module.exports = router;
