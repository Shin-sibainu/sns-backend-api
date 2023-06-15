const router = require("express").Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");
const fs = require("fs");
const util = require("util");
const multer = require("multer");
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });

const POSTS_PER_PAGE = 5;

//ユーザープロフィール取得API
//c89febd9-29c2-4ec3-b380-e9295fc707bd
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

//閲覧中のユーザーが投稿している投稿を取得するAPI
router.get("/posts/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const userPosts = await prisma.post.findMany({
      where: {
        userId: userId,
        parentId: null,
      },
      include: {
        user: true,
        likes: true,
        comments: true, // 必要に応じてコメントも含める
        shrine: true,
      },
      orderBy: {
        createdAt: "desc", // 最新の投稿が先に来るように
      },
    });

    if (!userPosts.length) {
      return res.status(404).json({ error: "No posts found for this user" });
    }

    // マッピングで神社名も付け加える
    const userPostsMapped = userPosts.map((post) => ({
      ...post,
      shrineName: post.shrine.name,
    }));

    res.json(userPostsMapped);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving posts for this user" });
  }
});

//ユーザープロフィール編集API
router.put("/:userId", upload.single("profilePicture"), async (req, res) => {
  const userId = req.params.userId;
  const { username, bio } = req.body;
  const profilePicture = req.file;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return res.status(404).json({ error: "User not found." });
    }

    let uploadedProfilePicture = existingUser.profilePicture;

    if (profilePicture) {
      // Upload the file to Supabase Storage
      const filePath = `profile-picture/${userId}_${Date.now()}.jpg`;
      console.log(profilePicture);

      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(filePath, profilePicture.buffer, {
          contentType: "image/jpeg",
        });

      if (error) {
        console.error("Error uploading image to Supabase Storage:", error);
        return res
          .status(500)
          .json({ error: "Failed to upload profile picture." });
      }

      // Get the public URL of the uploaded image from Supabase Storage
      const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/avatars/${filePath}`;

      uploadedProfilePicture = imageUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: username !== undefined ? username : existingUser.username,
        bio: bio !== undefined ? bio : existingUser.bio,
        profilePicture: uploadedProfilePicture,
      },
    });

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user profile." });
  }
});

//フォロー中のユーザー一覧表示API
router.get("/following/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const following = await prisma.follow.findMany({
      where: {
        followerId: userId,
      },
      include: {
        followed: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });

    // Convert the array of Follow objects into array of User objects
    const followingUsers = following.map((follow) => follow.followed);

    // Return an empty array instead of a 404 error when no following users are found
    res.json(followingUsers);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error retrieving following list for this user" });
  }
});

// フォロワーを取得するAPI
router.get("/followers/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const followers = await prisma.follow.findMany({
      where: {
        followedId: userId,
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            profilePicture: true,
          },
        },
      },
    });

    console.log(followers);

    const followerUsers = followers.map((follow) => follow.follower);

    res.json(followerUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error retrieving followers for this user" });
  }
});

//フォロー中のユーザーの投稿を出力するAPI
router.get("/followingPosts/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // まずフォローしているユーザーのリストを取得
    const userFollowings = await prisma.follow.findMany({
      where: {
        followerId: userId,
      },
    });

    // フォローしているユーザーのIDのリストを作成
    const followingIds = userFollowings.map((follow) => follow.followedId);

    // フォローしているユーザーがいなければ空の配列を返す
    if (!followingIds.length) {
      return res.json([]);
    }
    // フォローしているユーザーの投稿を取得
    const followingPosts = await prisma.post.findMany({
      where: {
        userId: {
          in: followingIds,
        },
        parentId: null,
      },
      take: POSTS_PER_PAGE,
      include: {
        user: true,
        likes: true,
        comments: true,
        shrine: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // フォローしているユーザーが投稿を持っていない場合は空の配列を返す
    if (!followingPosts.length) {
      return res.json([]);
    }

    // 以下のようにfollowingPostsをマッピングして各投稿に神社の名前を追加します。
    const followingPostsMapped = followingPosts.map((post) => ({
      ...post,
      shrineName: post.shrine.name,
    }));

    res.json(followingPostsMapped);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Error retrieving posts from followed users" });
  }
});

module.exports = router;
