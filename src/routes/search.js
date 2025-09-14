import express from "express";
import { selectSql } from "../database/sql.js";

const router = express.Router();

// 검색 페이지 GET 요청 처리
router.get("/", (req, res) => {
  res.render("search", { results: [] });
});

// 검색 요청 처리
router.post("/", async (req, res) => {
  const { keyword } = req.body;

  // 수정된 검색 방식: 책 제목, 상 이름, 저자 이름으로 검색
  const { bookResults, awardResults, authorResults } = await selectSql.searchBooksDetailed(keyword);

  // 결과를 렌더링
  res.render("search", {
    results: {
      books: bookResults,
      awards: awardResults,
      authors: authorResults,
    },
    keyword,
  });
});

export default router;
