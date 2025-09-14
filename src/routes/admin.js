import express from "express";
import { selectSql, createSql, updateSql, deleteSql } from "../database/sql.js";

const router = express.Router();

// 관리자 접근 제한 미들웨어
function adminOnly(req, res, next) {
  if (req.session.user && req.session.user.Role === "Admin") {
    next();
  } else {
    res.status(403).send("Access denied. Admins only.");
  }
}

router.use(adminOnly);

// 관리자 페이지 렌더링
router.get("/", (req, res) => {
  res.render("admin", { user: req.session.user });
});

router.get("/add-book", (req, res) => {
  res.render("add-book"); // add-book.hbs 뷰 파일 렌더링
});

// Edit Book 화면 렌더링
router.get("/edit-book", async (req, res) => {
  const books = await selectSql.searchBooks(""); // 모든 책 조회
  res.render("edit-book", { books }); // edit-book.hbs 뷰 파일 렌더링
});  

// Delete Book 화면 렌더링
router.get("/delete-book", async (req, res) => {
  const books = await selectSql.searchBooks(""); // 모든 책 조회
  res.render("delete-book", { books }); // delete-book.hbs 뷰 파일 렌더링
});  

// Add Author 화면 렌더링
router.get("/add-author", (req, res) => {
  res.render("add-author");
}); 

// Edit Author 화면 렌더링
router.get("/edit-author", async (req, res) => {
  const authors = await selectSql.getAuthors();
  res.render("edit-author", { authors });
}); 

// Delete Author 화면 렌더링
router.get("/delete-author", async (req, res) => {
  const authors = await selectSql.getAuthors();
  res.render("delete-author", { authors });
}); 

// Add Award 화면 렌더링
router.get("/add-award", (req, res) => {
  res.render("add-award");
}); 

// Edit Award 화면 렌더링
router.get("/edit-award", async (req, res) => {
  const awards = await selectSql.getAwards();
  res.render("edit-award", { awards });
}); 

// Delete Award 화면 렌더링
router.get("/delete-award", async (req, res) => {
  const awards = await selectSql.getAwards();
  res.render("delete-award", { awards });
}); 

// Add Award 화면 렌더링
router.get("/add-award", (req, res) => {
  res.render("add-award");
}); 

// Edit Award 화면 렌더링
router.get("/edit-award", async (req, res) => {
  const awards = await selectSql.getAwards();
  res.render("edit-award", { awards });
});

// Delete Award 화면 렌더링
router.get("/delete-award", async (req, res) => {
  const awards = await selectSql.getAwards();
  res.render("delete-award", { awards });
}); 

// Add Inventory 화면 렌더링
router.get("/add-inventory", (req, res) => {
  res.render("add-inventory");
}); 

// Edit Inventory 화면 렌더링
router.get("/edit-inventory", async (req, res) => {
  const inventories = await selectSql.getInventories();
  res.render("edit-inventory", { inventories });
}); 

// Delete Inventory 화면 렌더링
router.get("/delete-inventory", async (req, res) => {
  const inventories = await selectSql.getInventories();
  res.render("delete-inventory", { inventories });
}); 

// Add contains 화면 랜더링
router.get('/add-contains', async (req, res) => {
  const books = await selectSql.searchBooks('');
  const baskets = await selectSql.getShoppingBasket('');
  res.render('add-contains', { books, baskets });
}); 

// Edit contains 화면 랜더링
router.get('/edit-contains', async (req, res) => {
  const contains = await selectSql.getContains(); // Fetch all Contains entries
  res.render('edit-contains', { contains });
}); 

// Delete contains 화면 랜더링
router.get('/delete-contains', async (req, res) => {
  const contains = await selectSql.getContains(); // Fetch all Contains entries
  res.render('delete-contains', { contains });
});

// Add Book 데이터 처리
router.post("/add-book", async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    // 데이터베이스에 책 추가 
    await connection.beginTransaction(); // 트랜잭션 시작
    const { ISBN, Title, Year, Price, Category } = req.body;
    await createSql.addBook({ ISBN, Title, Year, Price, Category });

    await connection.commit(); // 성공 시 커밋
    res.redirect("/admin"); // 책 추가 후 관리자 페이지로 리디렉션
  } catch (err) {
    await connection.rollback(); // 실패 시 롤백    
    console.error("Error adding book:", err);
    res.status(500).send("Failed to add book.");
  } 
  connection.release(); // 연결 해제
});

// Edit Book 데이터 처리
router.post("/edit-book", async (req, res) => {
  const { ISBN, Title, Year, Price, Category } = req.body; 
  const connection = await promisePool.getConnection(); 
  try {
    await connection.beginTransaction(); // 트랜잭션 시작
    await updateSql.updateBook({ ISBN, Title, Year, Price, Category }); 
    await connection.commit(); // 성공 시 커밋
    res.redirect("/admin");
  } catch (err) {
    await connection.rollback(); // 실패 시 롤백
    console.error("Error updating book:", err);
    res.status(500).send("Failed to update book.");
  } 
  connection.release();
});

// Delete Book 데이터 처리
router.post("/delete-book", async (req, res) => {
  const { ISBN } = req.body; 
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작
    await deleteSql.deleteBook(ISBN);
    await connection.commit(); // 성공 시 커밋
    res.redirect("/admin");
  } catch (err) {
    await connection.rollback(); // 실패 시 롤백
    console.error("Error deleting book:", err);
    res.status(500).send("Failed to delete book.");
  }
  connection.release(); // 연결 해제
}); 

// Add Author 데이터 처리
router.post("/add-author", async (req, res) => {
  const { AuthorID, Name, Address, URL } = req.body;
  try {
    await createSql.addAuthor({ AuthorID, Name, Address, URL });
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding author:", err);
    res.status(500).send("Failed to add author.");
  }
}); 

// Edit Author 데이터 처리
router.post("/edit-author", async (req, res) => {
  const { AuthorID, Name, Address, URL } = reqㄴㄴbody;
  try {
    await updateSql.updateAuthor({ AuthorID, Name, Address, URL });
    res.redirect("/admin");
  } catch (err) {
    console.error("Error editing author:", err);
    res.status(500).send("Failed to edit author.");
  }
}); 

// Delete Author 데이터 처리
router.post("/delete-author", async (req, res) => {
  const { AuthorID } = req.body;
  try {
    await deleteSql.deleteAuthor(AuthorID);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error deleting author:", err);
    res.status(500).send("Failed to delete author.");
  }
}); 

// Add Award 데이터 처리
router.post("/add-award", async (req, res) => {
  const { AwardID, Name, Year } = req.body;
  try {
    await createSql.addAward({ AwardID, Name, Year });
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding award:", err);
    res.status(500).send("Failed to add award.");
  }
}); 

// Edit Award 데이터 처리
router.post("/edit-award", async (req, res) => {
  const { AwardID, Name, Year } = req.body;
  try {
    await updateSql.updateAward({ AwardID, Name, Year });
    res.redirect("/admin");
  } catch (err) {
    console.error("Error editing award:", err);
    res.status(500).send("Failed to edit award.");
  }
}); 

// Delete Award 데이터 처리
router.post("/delete-award", async (req, res) => {
  const { AwardID } = req.body;
  try {
    await deleteSql.deleteAward(AwardID);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error deleting award:", err);
    res.status(500).send("Failed to delete award.");
  }
});

// Add Inventory 데이터 처리
router.post("/add-inventory", async (req, res) => {
  const { WarehouseID, BookISBN, Quantity } = req.body;
  try {
    await createSql.addInventory({ WarehouseID, BookISBN, Quantity });
    res.redirect("/admin");
  } catch (err) {
    console.error("Error adding inventory:", err);
    res.status(500).send("Failed to add inventory.");
  }
}); 

// Edit Inventory 데이터 처리
router.post("/edit-inventory", async (req, res) => {
  const { WarehouseID, BookISBN, Quantity } = req.body;
  try {
    await updateSql.updateInventory({ WarehouseID, BookISBN, Quantity });
    res.redirect("/admin");
  } catch (err) {
    console.error("Error editing inventory:", err);
    res.status(500).send("Failed to edit inventory.");
  }
}); 

// Delete Inventory 데이터 처리
router.post("/delete-inventory", async (req, res) => {
  const { WarehouseID, BookISBN } = req.body;
  try {
    await deleteSql.deleteInventory(WarehouseID, BookISBN);
    res.redirect("/admin");
  } catch (err) {
    console.error("Error deleting inventory:", err);
    res.status(500).send("Failed to delete inventory.");
  } 
}); 

// Add Contains 데이터 처리
router.post('/add-contains', async (req, res) => {
  const { BasketID, BookISBN, Number } = req.body; 
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction(); // 트랜잭션 시작작
    await createSql.addContains(BasketID, BookISBN, Number); // addToBasket에서 addContains로 변경
    await connection.commit(); // 성공 시 커밋
    res.redirect('/admin');
  } catch (err) {
    await connection.rollback(); // 실패 시 롤백
    console.error(err);
    res.status(500).send('Error adding to contains');
  } 
  connection.release();
});

// Edit Contains 데이터 처리
router.post('/edit-contains', async (req, res) => {
  const { BasketID, BookISBN, NewNumber } = req.body;
  await updateSql.editContains(BasketID, BookISBN, NewNumber);
  res.redirect('/admin');
}); 

// Delete Contains 데이터 처리
router.post("/delete-contains", async (req, res) => {
  const { BasketID, BookISBN } = req.body;
  const connection = await promisePool.getConnection();

  try {
    await connection.beginTransaction(); // 트랜잭션 시작

    // Contains 데이터 삭제
    await deleteSql.deleteContains(BasketID, BookISBN, connection);

    // ShoppingBasket 수량 업데이트
    await updateSql.updateBasketAfterDelete(BasketID, connection);

    await connection.commit(); // 성공 시 커밋
    res.redirect("/admin");
  } catch (err) {
    await connection.rollback(); // 실패 시 롤백
    console.error("Error deleting contains entry with basket update:", err);
    res.status(500).send("Error deleting contains.");
  } finally {
    connection.release();
  }
});


export default router;
