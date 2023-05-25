const router = require("express").Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");

//フォロー＆アンフォローAPI
router.post("/:followedId", async (req, res) => {
  const followedId = req.params.followedId; //誰かがフォローしようとしているユーザーを指す（相手）
  const followerId = req.body.followerId; //他のユーザーをフォローしようとしているユーザーを指す(自分)

  //ex:
  //followedId = 5348cf76-d33d-4761-a348-d45845d083a4(username: eeeeee)
  //followerId = 9ff81f0e-6465-4c05-b237-1949e5f90892(username: shincode)
  //=== shincode(フォロー1, フォロワー0). ===eeeeee(フォロー0, フォロワー1)

  if (!followerId) {
    return res.status(400).json({ error: "Follower ID is required." });
  }

  if (followedId === followerId) {
    return res
      .status(400)
      .json({ error: "自分をフォロー/アンフォローすることはできません" });
  }

  const followedUser = await prisma.user.findUnique({
    where: { id: followedId },
  });
  const followerUser = await prisma.user.findUnique({
    where: { id: followerId },
  });

  if (!followedUser || !followerUser) {
    return res.status(404).json({ error: "User not found." });
  }

  try {
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId,
        followedId,
      },
    });

    if (existingFollow) {
      await prisma.follow.delete({
        where: {
          id: existingFollow.id,
        },
      });
      res.status(200).json({ message: "Unfollowed the user." });
    } else {
      const follow = await prisma.follow.create({
        data: {
          followerId,
          followedId,
        },
      });
      res.status(201).json(follow);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to follow/unfollow the user." });
  }
});

// フォロー確認API
router.get("/:followedId/:followerId", async (req, res) => {
  const followedId = req.params.followedId; // フォローされているユーザーのID（相手）
  const followerId = req.params.followerId; // フォローしているユーザーのID（自分）

  if (!followerId || !followedId) {
    return res
      .status(400)
      .json({ error: "Follower ID and Followed ID are required." });
  }

  if (followedId === followerId) {
    return res
      .status(400)
      .json({ error: "自分自身をフォローすることはできません" });
  }

  const followedUser = await prisma.user.findUnique({
    where: { id: followedId },
  });
  const followerUser = await prisma.user.findUnique({
    where: { id: followerId },
  });

  if (!followedUser || !followerUser) {
    return res.status(404).json({ error: "User not found." });
  }

  try {
    const existingFollow = await prisma.follow.findFirst({
      where: {
        followerId,
        followedId,
      },
    });

    if (existingFollow) {
      return res.status(200).json({ isFollowing: true });
    } else {
      return res.status(200).json({ isFollowing: false });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "Failed to determine if the user is followed." });
  }
});

module.exports = router;
