import express from "express";
import { selectSql, createSql, updateSql, deleteSql } from "../database/sql.js";

const router = express.Router();

// 예약 페이지 랜더링
router.get("/", async (req, res) => {
  const userEmail = req.session.userEmail; // 세션에서 사용자 이메일 가져오기
  if (!userEmail) {
    return res.redirect("/login"); // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  }

  try {
    const reservations = await selectSql.getReservations(userEmail); // 자신의 예약 조회 
    console.log("Reservations to render:", reservations); // 로그 추가  
    res.render("reservation", {
      reservations: reservations || [], // 예약이 없으면 빈 배열 전달
      hasReservations: reservations.length > 0,
    });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    res.status(500).send("Error fetching reservations.");
  }
});

// 책 검색 처리
router.post("/search", async (req, res) => {
  const { keyword } = req.body;
  const userEmail = req.session.userEmail;

  if (!userEmail) {
    return res.redirect("/login");
  }

  try {
    const reservations = await selectSql.getReservations(userEmail); // 자신의 예약 조회
    const searchResults = await selectSql.searchBooksSimplified(keyword); // 간소화된 책 검색
    res.render("reservation", {
      reservations,
      hasReservations: reservations.length > 0,
      searchResults,
    });
  } catch (error) {
    console.error("Error searching for books:", error);
    res.status(500).send("Error during book search.");
  }
});

// 예약 처리 라우터
router.post("/add", async (req, res) => {
  const { bookISBN, reservationDate, pickupTime } = req.body; // 클라이언트로부터 받은 데이터
  const userEmail = req.session.userEmail; // 사용자 세션 


  const connection = await promisePool.getConnection(); // 트랜잭션 시작
  await connection.beginTransaction(); // 트랜잭션 시작

  try {
    console.log("Request Body:", req.body);

    // 재고 확인
    const stock = await selectSql.checkBookStock(bookISBN);
    if (stock <= 0) {
      return res.status(400).render("outOfStock", {
        title: "Out of Stock",
        message: "Sorry, the book you are trying to reserve is currently out of stock.",
      });
    }

    // 기존 예약 정보 가져오기
    const currentReservation = await selectSql.getReservationsById(bookISBN);
    let reservationDateToUse;

    if (!currentReservation || currentReservation.length === 0) {
      // 기존 예약이 없으면 POST로 받은 날짜 사용
      reservationDateToUse = reservationDate;
    } else {
      // 기존 예약이 있으면 그 날짜 사용
      reservationDateToUse = currentReservation[0].ReservationDate;
    }

    console.log("Reservation Date to Use:", reservationDateToUse);

    // 픽업 시간과 날짜 조합
    const fullPickupTime = `${reservationDateToUse} ${pickupTime}:00`;

    // 픽업 시간 충돌 확인
    const timeConflict = await selectSql.checkPickupTimeConflict(fullPickupTime);

    if (!timeConflict) {
      // 예약 데이터 삽입
      await createSql.addReservation(userEmail, bookISBN, reservationDateToUse, pickupTime);
      console.log("Reservation added successfully.");
      await connection.commit(); // 트랜잭션 성공 시 커밋
      res.redirect("/reservation");
    } else {
      // 시간 충돌 발생 시 에러 페이지로 랜더링
      return res.status(400).render("reservationConflict", {
        title: "Reservation Conflict",
      });
    }
  } catch (error) {
    await connection.rollback(); // 롤백
    console.error("Error processing reservation:", error);
    res.status(500).send("Error processing reservation.");
  } 
  connection.release(); // 연결 해제
});

// 예약 취소 처리
router.post("/cancel/:id", async (req, res) => {
  const reservationID = req.params.id;

  try {
    await deleteSql.cancelReservation(reservationID);
    res.redirect("/reservation");
  } catch (error) {
    console.error("Error canceling reservation:", error);
    res.status(500).send("Error canceling reservation.");
  }
});

// 예약 수정 처리
router.post("/update/:id", async (req, res) => {
  const reservationID = req.params.id; // URL에서 예약 ID 가져오기
  const { newPickupTime } = req.body; // POST 데이터에서 새 픽업 시간 가져오기

  try {
    console.log("Request Body:", req.body);

    // 기존 예약 정보 가져오기
    const currentReservation = await selectSql.getReservationsById(reservationID);
    if (!currentReservation || currentReservation.length === 0) {
      return res.status(400).send("Invalid reservation ID.");
    }

    // 기존 예약 날짜를 가져오기
    const reservationDate = currentReservation[0].ReservationDate; // 'YYYY-MM-DD'
    console.log("Reservation Date:", reservationDate);

    // 예약 날짜와 새 픽업 시간을 조합 (MySQL DATETIME 형식)
    const mysqlPickupTime = `${newPickupTime}:00`;
    console.log("MySQL Pickup Time:", mysqlPickupTime);

    // 픽업 시간 충돌 확인
    const timeConflict = await selectSql.checkPickupTimeConflict(mysqlPickupTime);
    if (timeConflict) {
      return res
        .status(400)
        .send("Another reservation exists within 10 minutes of this time.");
    }

    // 픽업 시간 업데이트
    await updateSql.updatePickupTime(reservationID, mysqlPickupTime);
    console.log("Pickup time updated successfully.");
    
    res.redirect("/reservation");
  } catch (error) {
    console.error("Error updating pickup time:", error);
    res.status(500).send("Error updating pickup time.");
  }
});

export default router;
