const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");

router.post("/register", async (req, res) => {
  const { email, password, username } = req.body;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data && data.user) {
      // Supabase Authで登録されたユーザー情報をPrismaのUserモデルにも追加
      const prismaUser = await prisma.user.create({
        data: {
          id: data.user.sub, // Supabase Authで生成されたユーザーIDを 'sub' プロパティから取得
          email,
          // 必要な他のフィールドをここに追加
          username,
        },
      });

      res.status(200).json({ user: prismaUser });
    } else {
      res.status(400).json({ error: "User is not defined." });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    res.status(200).json(data.user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/logout", async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    res.status(200).json({ message: "ログアウトしました。" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//ログインしているユーザー取得用API
router.get("/:me", async (req, res) => {
  const authHeader = req.header.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        username: true,
        email: true,
        profilePicture: true,
        bio: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch the user" });
  }
});

module.exports = router;
