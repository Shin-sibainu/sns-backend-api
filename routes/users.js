const express = require("express");
const router = express.Router();
const supabase = require("../supabaseClient");
const prisma = require("../database");

//これらの認証用APIは全てフロントエンドで定義する。
//そうでないとセッション維持ができず、再度リロードするとuser情報が消えてしまうから。

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
      const avatarUrl = `https://avatars.dicebear.com/api/bottts/${username}.svg`;

      // Supabase Authで登録されたユーザー情報をPrismaのUserモデルにも追加
      const prismaUser = await prisma.user.create({
        data: {
          id: data.user.sub, // Supabase Authで生成されたユーザーIDを 'sub' プロパティから取得
          email,
          // 必要な他のフィールドをここに追加
          username,
          profilePicture: avatarUrl,
          bio: "こんにちは！はじめまして！",
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

// router.post("/login", async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     const { data, error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error) {
//       throw error;
//     }

//     res.status(200).json({ user: data.user, token: data.session.access_token });
//   } catch (error) {
//     res.status(400).json({ error: error.message });
//   }
// });

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

router.get("/me", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];
  // console.log(token);

  try {
    const { data, error } = await supabase.auth.getUser(token);
    // console.log("aaa");
    // console.log(data.user.email);
    if (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { email: data.user.email },
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
