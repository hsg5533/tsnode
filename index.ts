import express, { Request, Response } from "express";
import { json, urlencoded } from "body-parser";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import cors from "cors";

// JWT 생성 함수
function generateJWT(username: string, nickname: string) {
  return jwt.sign({ username, nickname }, secretKey, { expiresIn: "1h" });
}

const app = express();
const whitelist = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5500",
]; // 접속 허용 주소
const secretKey = "your-secret-key"; // 실제로는 보안에 강한 랜덤한 키를 사용해야 합니다.

// Mock database (in-memory)
let posts = [
  { id: 1, title: "첫 번째 게시물", content: "첫 번째 게시물 내용" },
  { id: 2, title: "두 번째 게시물", content: "두 번째 게시물 내용" },
];

let todos = [
  { id: 1, text: "Learn Node.js" },
  { id: 2, text: "Build a REST API" },
];

const users = [
  { username: "user1", password: "pass1", nickname: "User One" },
  { username: "user2", password: "pass2", nickname: "User Two" },
];

app.set("port", process.env.PORT || 5000);
app.set("host", process.env.HOST || "0.0.0.0");

// Middleware 설정
app.use(json());
app.use(cookieParser());
app.use(urlencoded({ extended: false }));
app.use(
  cors({
    origin(req, res) {
      console.log("접속된 주소: " + req),
        -1 == whitelist.indexOf(req || "") && req
          ? res(Error("허가되지 않은 주소입니다."))
          : res(null, !0);
    },
    credentials: !0,
    optionsSuccessStatus: 200,
  })
);

app.all("/*", (req: Request, res: Response, next: () => void) => {
  const ip = req.headers.origin;
  if (whitelist.indexOf(ip as string) !== -1 || !ip) {
    res.header("Access-Control-Allow-Origin", ip as string);
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
  }
});

// get 통신
app.get("/", function (req: Request, res: Response) {
  res.send("접속된 아이피: " + req.ip);
});

app.get("/posts", (req: Request, res: Response) => {
  res.json({ posts });
});

app.get("/todos", (req: Request, res: Response) => {
  res.json(todos);
});

app.get("/logout", (req: Request, res: Response) => {
  res.clearCookie("jwt");
  res.redirect("/");
});

app.get("/cookie", (req: Request, res: Response) => {
  res.cookie("cookieName", "cookieValue", {
    expires: new Date(Date.now() + 900000), // 쿠키의 만료일 (현재 시간 + 900000 밀리초)
    httpOnly: true,
  });
  res.send({ message: "쿠키가 설정되었습니다." });
});

app.get("/form", (req: Request, res: Response) => {
  let userNickname = "";
  const jwtCookie = req.cookies.jwt as string;
  if (jwtCookie) {
    const decoded = jwt.verify(jwtCookie, secretKey) as {
      username: string;
      nickname: string;
    };
    userNickname = decoded.nickname;
  }
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <h1>${userNickname ? `Welcome back, ${userNickname}!` : "Login"}</h1>
    ${
      userNickname
        ? `<p><a href="/logout">Logout</a></p>`
        : `
    <form action="/login" method="post">
      <label for="username">Username:</label>
      <input type="text" id="username" name="username" required />
      <br />
      <label for="password">Password:</label>
      <input type="password" id="password" name="password" required />
      <br />
      <button type="submit">Login</button>
    </form>
    `
    }
  </body>
  </html>
  `);
});

// 포스트
app.post("/posts", (req: Request, res: Response) => {
  const { title, content } = req.body;
  const newPost = { id: Date.now(), title, content };
  posts.push(newPost);
  res.status(201).json({ post: newPost });
});

app.post("/todos", (req: Request, res: Response) => {
  const { text } = req.body;
  const newTodo = { id: todos.length + 1, text };
  todos.push(newTodo);
  res.status(200).json(newTodo);
});

app.post("/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (user) {
    const jwtToken = generateJWT(user.username, user.nickname);
    res.cookie("jwt", jwtToken, { httpOnly: true });
    res.send({ message: `Login successful! Welcome, ${user.nickname}!` });
  } else {
    res.status(403).send({ smessage: "Invalid username or password" });
  }
});

// put 통신
app.put("/posts/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { title, content } = req.body;
  const index = posts.findIndex((post) => post.id === id);
  if (index !== -1) {
    posts[index] = { id, title, content };
    res.json({ post: posts[index] });
  } else {
    res.status(404).json({ error: "Post not found" });
  }
});

app.put("/todos/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;
  const todo = todos.find((todo) => todo.id === parseInt(id));
  if (todo) {
    todo.text = text;
    res.json(todo);
  } else {
    return res.status(404).json({ error: "Todo not found" });
  }
});

// delete 통신
app.delete("/posts/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const index = posts.findIndex((post) => post.id === id);
  if (index !== -1) {
    posts.splice(index, 1);
    res.sendStatus(204);
  } else {
    res.status(404).json({ error: "Post not found" });
  }
});

app.delete("/todos/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const todo = todos.find((todo) => todo.id === parseInt(id));
  if (todo) {
    todos = todos.filter((todo) => todo.id !== parseInt(id));
    res.status(200).json({ message: "Todo deleted successfully" });
  } else {
    return res.status(404).json({ error: "Todo not found" });
  }
});

app.listen(app.get("port"), app.get("host"), () =>
  console.log(
    "Server is running on : " + app.get("host") + ":" + app.get("port")
  )
);