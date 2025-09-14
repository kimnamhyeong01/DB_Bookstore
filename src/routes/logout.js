import express from "express";

const router = express.Router();

// 로그아웃 처리
router.get("/", (req, res) => {
  if (req.session.user) {
    req.session.destroy((err) => {
      if (err) {
        console.error("Failed to destroy session:", err);
        res.status(500).send("Logout failed.");
      } else {
        res.redirect("/"); // 메인 페이지로 리다이렉트
      }
    });
  } else {
    res.redirect("/"); // 로그인 상태가 아니면 메인 페이지로 이동
  }
});

export default router;
