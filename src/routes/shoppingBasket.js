import express from "express";
import { selectSql, createSql, updateSql, deleteSql} from "../database/sql.js";

const router = express.Router();

// 장바구니 리스트 조회
router.get("/", async (req, res) => {
  const userEmail = req.session.userEmail; // 세션에서 사용자 이메일 가져오기
  if (!userEmail) {
    return res.redirect("/login"); // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  }

  try {
    const shoppingBasket = await selectSql.getShoppingBasket(userEmail); // 자신의 장바구니 조회
    res.render("shoppingBasket", { shoppingBasket }); // 결과 렌더링
  } catch (error) {
    console.error("Error fetching shopping basket:", error);
    res.status(500).send("Error fetching shopping basket.");
  }
});


// 구매 완료 페이지 렌더링
router.get("/complete", async (req, res) => {
  const userEmail = req.session.userEmail; // 세션에서 사용자 이메일 가져오기
  if (!userEmail) {
    return res.redirect("/login"); // 로그인하지 않은 경우 로그인 페이지로 리다이렉트
  }

  try {
    // 구매 완료된 항목 가져오기
    const purchasedItems = await selectSql.getPurchasedItems(userEmail);

    res.render("purchaseComplete", { purchasedItems });
  } catch (error) {
    console.error("Error fetching purchased items:", error);
    res.status(500).send("Error fetching purchased items.");
  }
});

// 장바구니 책 추가
router.post("/add", async (req, res) => {
  const userEmail = req.session.userEmail; // 사용자 이메일
  const { bookISBN, quantity } = req.body; // 입력값

  if (!userEmail) {
    return res.redirect("/login");
  }

  try {
    // 책 재고 확인
    const stock = await selectSql.checkBookStock(bookISBN);
    if (stock < quantity) {
      return res.render("shoppingBasket", {
        shoppingBasket: await selectSql.getShoppingBasket(userEmail),
        errorMessage: `Not enough stock for ${quantity} copies. Available: ${stock}`,
      });
    }

    // 장바구니에 추가
    await createSql.addToBasket(userEmail, bookISBN, quantity);
    res.redirect("/shoppingBasket");
  } catch (error) {
    console.error("Error adding to shopping basket:", error);
    res.status(500).send("Error adding to shopping basket.");
  }
}); 

// 장바구니 책 삭제
router.post("/remove", async (req, res) => {
  const userEmail = req.session.userEmail; // 사용자 이메일
  const bookISBN = req.body.bookISBN; // 전달된 bookISBN 확인
  console.log("Removing book: ", bookISBN); // 로그 추가

  if (!userEmail) {
    return res.redirect("/login");
  }

  try {
    await deleteSql.removeFromBasket(userEmail, bookISBN); // 장바구니에서 책 삭제
    res.redirect("/shoppingBasket");
  } catch (error) {
    console.error("Error removing from shopping basket:", error);
    res.status(500).send("Error removing from shopping basket.");
  }
});

// 장바구니 책 구매
router.post("/purchase", async (req, res) => {
  const userEmail = req.session.userEmail;

  if (!userEmail) {
    return res.redirect("/login");
  } 

  const connection = await promisePool.getConnection(); // 트랜잭션을 위해 연결 가져오기
  await connection.beginTransaction(); // 트랜잭션 시작

  try {
    const shoppingBasket = await selectSql.getShoppingBasket(userEmail);
    const errors = [];

    for (const item of shoppingBasket) {
      const stockInfo = await selectSql.getBookStockWithWarehouse(item.BookISBN);

      if (!stockInfo || stockInfo.TotalQuantity < item.Number) {
        errors.push(`Not enough stock for ${item.Title}. Available: ${stockInfo?.TotalQuantity || 0}`);
        continue;
      }

      // 재고 업데이트
      await updateSql.updateInventory({
        WarehouseID: stockInfo.WarehouseID, // 동적으로 WarehouseID 가져옴
        BookISBN: item.BookISBN,
        Quantity: stockInfo.TotalQuantity - item.Number,
      });
    }

    if (errors.length > 0) {
      return res.render("shoppingBasket", {
        shoppingBasket,
        errorMessage: errors.join(" "),
      });
    } 

    await connection.commit(); // 트랜잭션 커밋: 모든 항목이 성공적으로 처리된 경우
    res.render("shoppingBasket", {
      shoppingBasket: [],
      successMessage: "Purchase completed!",
    });
  } catch (error) {
    await connection.rollback(); //에러 발생 시 롤백
    console.error("Error purchasing items:", error);
    res.status(500).send("Error purchasing items.");
  }
});

// 구매 완료 처리
router.post("/complete", async (req, res) => {
  const userEmail = req.session.userEmail;

  if (!userEmail) {
    return res.redirect("/login");
  }

  try {
    // ShoppingBasket의 OrderDate를 현재 날짜로 업데이트
    await updateSql.updateOrderDate(userEmail);

    res.redirect("/shoppingBasket/complete"); // 구매 완료 페이지로 이동
  } catch (error) {
    console.error("Error completing purchase:", error);
    res.status(500).send("Error completing purchase.");
  }
});

export default router;
