const router = require("express").Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");
const fs = require("fs");
const util = require("util");
const multer = require("multer");
const storage = multer.memoryStorage();

const upload = multer({ storage: storage });
const unlinkAsync = util.promisify(fs.unlink);

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

//ユーザープロフィール編集API
router.put("/:userId", upload.single("profilePicture"), async (req, res) => {
  const userId = req.params.userId;
  const { bio } = req.body;
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

module.exports = router;
