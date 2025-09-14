import express from "express";
import { selectSql } from "../database/sql.js";

const router = express.Router();

// 로그인 페이지 렌더링
router.get("/", (req, res) => {
  if (req.session.user) {
    // 이미 로그인된 상태라면 메인 페이지로 리다이렉트
    return res.redirect("/");
  }
  res.render("login");
});

// 로그아웃 처리 라우트
router.get("/logout", (req, res) => {
  if (req.session.user) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Failed to destroy session:", err);
        return res.status(500).send("Logout failed.");
      }
      res.redirect("/login");
    });
  } else {
    res.redirect("/login");
  }
});

// 로그인 요청 처리
router.post("/", async (req, res) => {
  const { email, phone } = req.body;

  if (!email || !phone) {
    // 이메일 또는 전화번호가 비어 있는 경우 에러 메시지 표시
    return res.render("login", { error: "Please provide both email and phone number." });
  }

  try {
    const users = await selectSql.getUser(email, phone); // DB에서 사용자 조회
    if (users.length > 0) {
      const user = users[0];

      // 세션에 사용자 정보 저장
      req.session.user = {
        Name: user.Name,
        Role: user.Role,
      }; 
      req.session.userEmail = user.Email; // 로그인 시 설정


      // 역할에 따라 페이지 리다이렉트
      if (user.Role === "Admin") {
        return res.redirect("/admin");
      } else if (user.Role === "Customer") {
        return res.redirect("/");
      } else {
        return res.status(403).send("Unauthorized role.");
      }
    } else {
      // 로그인 실패 시 에러 메시지와 함께 로그인 페이지 렌더링
      return res.render("login", { error: "Invalid email or phone number." });
    }
  } catch (err) {
    console.error("Error during login:", err);
    res.status(500).send("Internal server error.");
  }
});

export default router;
