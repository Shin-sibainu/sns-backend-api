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

module.exports = router;
