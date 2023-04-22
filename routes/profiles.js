const router = require("express").Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");

//ユーザープロフィール取得API
router.get("/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        profilePicture: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
        posts: true,
        comments: true,
        likes: true,
        following: true,
        followers: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get user profile." });
  }
});

//ユーザープロフィール編集API
router.put("/:userId", async (req, res) => {
  const userId = req.params.userId;
  const { bio, profilePicture } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        bio: bio !== undefined ? bio : existingUser.bio,
        profilePicture:
          profilePicture !== undefined
            ? profilePicture
            : existingUser.profilePicture,
      },
    });

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user profile." });
  }
});

module.exports = router;
