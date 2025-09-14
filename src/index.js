import express from "express";
import logger from "morgan";
import path from "path";
import liveReload from "livereload";
import connectLiveReload from "connect-livereload";
import session from "express-session";
import hbs from "hbs";

import loginRouter from "./routes/login";
import logoutRouter from "./routes/logout";
import adminRouter from "./routes/admin"; // 관리자 페이지 라우터
import mainRouter from "./routes/main"; // 메인 페이지 라우터
import searchRouter from "./routes/search"; // 책 검색 라우터
import reservationRouter from "./routes/reservation"; // 예약 조회 라우터
import basketRouter from "./routes/shoppingBasket"; // 장바구니 라우터
const PORT = 3000;

// 라이브 리로드 서버 설정
const liveReloadServer = liveReload.createServer();
liveReloadServer.server.once("connection", () => {
  setTimeout(() => {
    liveReloadServer.refresh("/");
  }, 100);
});

const app = express();

// 라이브 리로드 미들웨어 연결
app.use(connectLiveReload());

// 세션 설정
app.use(
  session({
    secret: "secretkey", // 세션 암호화 키
    resave: false, // 세션 변경사항이 없을 경우 저장하지 않음
    saveUninitialized: true, // 초기화되지 않은 세션 저장
  })
);

// URL 인코딩 및 JSON 파싱 설정
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// 뷰 엔진 및 경로 설정
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

// 정적 파일 경로 설정
app.use(express.static(path.join(__dirname, "public")));

// 로깅 미들웨어 설정
app.use(logger("dev"));

// 핸들바 헬퍼 등록 (조건문 처리)
hbs.registerHelper("ifCond", function (v1, operator, v2, options) {
  switch (operator) {
    case "==":
      return v1 == v2 ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
}); 


// 날짜 포맷 헬퍼 등록
hbs.registerHelper("formatDate", function (date) {
  if (!date) return "No date available"; // 날짜가 없을 경우 처리
  const options = { 
    year: "numeric", 
    month: "short", 
    day: "numeric",  
  };
  return new Date(date).toLocaleDateString("en-US", options);
});

// 라우터 설정
app.use("/", mainRouter); // 메인 페이지
app.use("/login", loginRouter); // 로그인
app.use("/logout", logoutRouter); // 로그아웃
app.use("/admin", adminRouter); // 관리자 페이지
app.use("/search", searchRouter); // 책 검색
app.use("/reservation", reservationRouter); // 예약 조회
app.use("/shoppingBasket", basketRouter); // 장바구니

// 서버 실행
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
