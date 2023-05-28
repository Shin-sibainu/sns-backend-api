const express = require("express");
const app = express();
require("dotenv").config();
const postRoute = require("./routes/posts");
const userRoute = require("./routes/users");
const likeRoute = require("./routes/likes");
const followRoute = require("./routes/follows");
const profileRoute = require("./routes/profiles");
const searchRoute = require("./routes/search");
const cors = require("cors");

const PORT = 5000;

//https://hotokami.jp/

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);
app.use("/api/likes", likeRoute);
app.use("/api/follows", followRoute);
app.use("/api/profiles", profileRoute);
app.use("/api/search", searchRoute);

const port = process.env.PORT || PORT;

app.listen(port, () => console.log(`server is runngin on ${port}`));
