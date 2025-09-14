import mysql from "mysql2";

// 데이터베이스 연결 풀 설정
const pool = mysql.createPool(
  process.env.JAWSDB_URL ?? {
    host: "localhost",
    user: "root",
    database: "termproject",
    password: "chungdam369@",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }
);

const promisePool = pool.promise();

// 데이터 조회 관련 함수
export const selectSql = {
  // 사용자 정보 확인
  getUser: async (email, phone) => {
    const [rows] = await promisePool.query(
      `SELECT * FROM User WHERE Email = ? AND Phone = ?`,
      [email, phone]
    );
    return rows;
  },

  // 책 검색
  searchBooks: async (title) => {
    const [rows] = await promisePool.query(
      `SELECT * FROM Book WHERE Title LIKE ?`,
      [`%${title}%`]
    );
    return rows;
  }, 

  // 책 제목과 재고만 검색
  searchBooksSimplified: async (keyword) => {
    const [rows] = await promisePool.query(
      `SELECT b.ISBN, b.Title, SUM(i.Quantity) as Stock
       FROM Book b
       JOIN Inventory i ON b.ISBN = i.Book_ISBN
       WHERE b.Title LIKE ? OR b.Category LIKE ?
       GROUP BY b.ISBN`,
      [`%${keyword}%`, `%${keyword}%`]
    );
    return rows;
  }, 

  // 책 제목, 상 이름, 저자 이름으로 검색
  searchBooksDetailed: async (keyword) => {
    // 책 제목으로 검색
    const [bookResults] = await promisePool.query(
      `SELECT b.Title, SUM(i.Quantity) as Stock
      FROM Book b
      JOIN Inventory i ON b.ISBN = i.Book_ISBN
      WHERE b.Title LIKE ?
      GROUP BY b.Title`,
      [`%${keyword}%`]
    );

    // 상 이름으로 검색 (해당 상을 받은 책)
    const [awardResults] = await promisePool.query(
      `SELECT b.Title, SUM(i.Quantity) as Stock
      FROM Book b
      JOIN Inventory i ON b.ISBN = i.Book_ISBN
      JOIN Awarded_to at ON b.ISBN = at.Book_ISBN
      JOIN Award a ON at.Award_AwardID = a.AwardID
      WHERE a.Name LIKE ?
      GROUP BY b.Title`,
      [`%${keyword}%`]
    );

    // 저자 이름으로 검색 (해당 저자가 쓴 책)
    const [authorResults] = await promisePool.query(
      `SELECT b.Title, SUM(i.Quantity) as Stock
      FROM Book b
      JOIN Inventory i ON b.ISBN = i.Book_ISBN
      JOIN Written_by wb ON b.ISBN = wb.Book_ISBN
      JOIN Author a ON wb.Author_AuthorID = a.AuthorID
      WHERE a.Name LIKE ?
      GROUP BY b.Title`,
      [`%${keyword}%`]
    );

    return { bookResults, awardResults, authorResults };
  },

  // 작가 검색
  searchAuthors: async (keyword) => {
    const [rows] = await promisePool.query(
      `SELECT * FROM Author WHERE Name LIKE ?`,
      [`%${keyword}%`]
    );
    return rows;
  },

  // 상 검색
  searchAwards: async (keyword) => {
    const [rows] = await promisePool.query(
      `SELECT a.Name, a.Year, b.Title as BookTitle
       FROM Awarded_to at
       JOIN Award a ON at.Award_AwardID = a.AwardID
       JOIN Book b ON at.Book_ISBN = b.ISBN
       WHERE a.Name LIKE ?`,
      [`%${keyword}%`]
    );
    return rows;
  },

  // **Author 관련 함수**
  getAuthors: async () => {
    const [rows] = await promisePool.query(`SELECT * FROM Author`);
    return rows;
  },

  // **Award 관련 함수**
  getAwards: async () => {
    const [rows] = await promisePool.query(`SELECT * FROM Award`);
    return rows;
  },

  // **Inventory 관련 함수**
  getInventories: async () => {
    const [rows] = await promisePool.query(
      `SELECT i.Warehouse_WarehouseID as WarehouseID, i.Book_ISBN as BookISBN, i.Quantity, b.Title
       FROM Inventory i
       JOIN Book b ON i.Book_ISBN = b.ISBN`
    );
    return rows;
  }, 

  // 예약 리스트 가져오기
  getReservations: async (userEmail) => {
    const [rows] = await promisePool.query(
      `SELECT r.ReservationID, b.Title, r.ReservationDate, r.PickupTime
       FROM Reservation r
       JOIN Book b ON r.Book_ISBN = b.ISBN
       WHERE r.User_Email = ?`,
      [userEmail]
    );

  // 포맷팅: ReservationDate와 PickupTime을 분리해서 적절히 처리
    const formattedRows = rows.map((row) => ({
      ...row,
      ReservationDate: new Date(row.ReservationDate).toLocaleDateString('ko-KR'), // 예약 날짜
      PickupTime: row.PickupTime, // 시간만 그대로 사용 (HH:MM:SS)
  })); 

  console.log("Formatted Reservations:", formattedRows); // 확인용 로그
  return formattedRows;
  },

  // 장바구니 목록 가져오기
  getShoppingBasket: async (userEmail) => {
    const [rows] = await promisePool.query(
      `SELECT sb.BasketID, b.ISBN AS BookISBN, b.Title, c.Number, b.Price
      FROM ShoppingBasket sb
      JOIN Contains c ON sb.BasketID = c.ShoppingBasket_BasketID
      JOIN Book b ON c.Book_ISBN = b.ISBN
      WHERE sb.User_Email = ?`,
      [userEmail]
    );
    return rows;
  },


  // 책 재고 확인
  checkBookStock: async (bookISBN) => {
    const [rows] = await promisePool.query(
      `SELECT SUM(Quantity) as TotalQuantity
       FROM Inventory
       WHERE Book_ISBN = ?`,
      [bookISBN]
    );
    return rows[0]?.TotalQuantity || 0; // 재고 수량 반환
  },

  // 예약 시간 중복 확인
  checkPickupTimeConflict: async (fullPickupTime) => {
    const [rows] = await promisePool.query(
      `SELECT *
       FROM Reservation
       WHERE ABS(TIMESTAMPDIFF(MINUTE, 
               CONCAT(ReservationDate, ' ', PickupTime), ?)) < 10`,
      [fullPickupTime]
    );
    return rows.length > 0; // 중복 여부 반환
  },
  

  // Contains 테이블 가져오기
  getContains: async () => {
    const [rows] = await promisePool.query(
      `SELECT c.ShoppingBasket_BasketID as BasketID, c.Book_ISBN as BookISBN, c.Number
       FROM Contains c`
    );
    return rows;
  }, 

  // 특정 ReservationID로 예약 정보 가져오기
getReservationsById: async (reservationID) => {
  const [rows] = await promisePool.query(
    `SELECT ReservationDate, PickupTime
     FROM Reservation 
     WHERE ReservationID = ?`,
    [reservationID]
  );
  return rows;
}, 

getPurchasedItems: async (userEmail) => {
  const [rows] = await promisePool.query(
    `SELECT sb.BasketID, b.Title, c.Number, b.Price, sb.OrderDate
     FROM ShoppingBasket sb
     JOIN Contains c ON sb.BasketID = c.ShoppingBasket_BasketID
     JOIN Book b ON c.Book_ISBN = b.ISBN
     WHERE sb.User_Email = ? AND sb.OrderDate IS NOT NULL`, // 구매 완료된 항목만 가져오기
    [userEmail]
  );
  return rows; 
}, 

// 특정 책의 재고 및 WarehouseID 가져오기
getBookStockWithWarehouse: async (bookISBN) => {
  const [rows] = await promisePool.query(
    `SELECT Warehouse_WarehouseID AS WarehouseID, SUM(Quantity) AS TotalQuantity
     FROM Inventory
     WHERE Book_ISBN = ?
     GROUP BY Warehouse_WarehouseID
     ORDER BY TotalQuantity DESC
     LIMIT 1`,
    [bookISBN]
  );
  return rows[0]; // 가장 재고가 많은 WarehouseID 반환
},

};

// 데이터 추가 관련 함수
export const createSql = {
  // Contains에 데이터 추가
  addContains: async (BasketID, BookISBN, Number) => {
    const query = `
      INSERT INTO Contains (ShoppingBasket_BasketID, Book_ISBN, Number)
      VALUES (?, ?, ?)
    `;
    const results = await promisePool.query(query, [BasketID, BookISBN, Number]);
    return results[0];
  },

  // 장바구니에 책 추가
  addToBasket: async (userEmail, bookISBN, number) => {
    // Step 1: ShoppingBasket 테이블에서 사용자의 BasketID 확인
    const [rows] = await promisePool.query(
      `SELECT BasketID FROM ShoppingBasket WHERE User_Email = ?`,
      [userEmail]
    );
  
    let basketID;
    if (rows.length === 0) {
      // Step 2: 장바구니가 없을 경우 생성  
      const [result] = await promisePool.query(
        `INSERT INTO ShoppingBasket (OrderDate, User_Email)
         VALUES (CURDATE(), ?)`,
        [userEmail]
      );
  
      // Step 3: 새로 생성된 BasketID 가져오기
      basketID = result.insertId;
    } else {
      // 기존 장바구니 사용
      basketID = rows[0].BasketID;
    }
  
    // Step 4: Contains 테이블에 데이터 삽입
    const results = await promisePool.query(
      `INSERT INTO Contains (ShoppingBasket_BasketID, Book_ISBN, Number)
       VALUES (?, ?, ?)`,
      [basketID, bookISBN, number]
    );
  
    console.log("Insert Results:", results);
    return results[0];
  },

  // 예약 추가
  addReservation: async (userEmail, bookISBN, reservationDate, pickupTime) => {
    console.log("ReservationDate:", reservationDate);
    console.log("PickupTime:", pickupTime);
    
    const results = await promisePool.query(
      `INSERT INTO Reservation (User_Email, Book_ISBN, ReservationDate, PickupTime)
       VALUES (?, ?, ?, ?)`,
      [userEmail, bookISBN, reservationDate, pickupTime]
    );
    return results[0];
  },

  // 책 추가
  addBook: async (data) => {
    const query = `
      INSERT INTO Book (ISBN, Title, Year, Price, Category)
      VALUES (?, ?, ?, ?, ?)`;
    await promisePool.query(query, [data.ISBN, data.Title, data.Year, data.Price, data.Category]);
  },

  // 저자 추가
  addAuthor: async (data) => {
    const query = `
      INSERT INTO Author (AuthorID, Name, Address, URL)
      VALUES (?, ?, ?, ?)`;
    await promisePool.query(query, [data.AuthorID, data.Name, data.Address, data.URL]);
  },

  // 상 추가
  addAward: async (data) => {
    const query = `
      INSERT INTO Award (AwardID, Name, Year)
      VALUES (?, ?, ?)`;
    await promisePool.query(query, [data.AwardID, data.Name, data.Year]);
  },

  // Inventory 추가
  addInventory: async (data) => {
    const query = `
      INSERT INTO Inventory (Warehouse_WarehouseID, Book_ISBN, Quantity)
      VALUES (?, ?, ?)`;
    await promisePool.query(query, [data.WarehouseID, data.BookISBN, data.Quantity]);
  },
}; 

// 데이터 수정 관련 함수
export const updateSql = {

  // Reservation PickupTime 업데이트
  updatePickupTime: async (reservationID, combinedDateTime) => {
    const query = `
      UPDATE Reservation
      SET PickupTime = ?
      WHERE ReservationID = ?
    `;
    await promisePool.query(query, [combinedDateTime, reservationID]);
  },


  // 책 정보 수정
  updateBook: async (data) => {
    const query = `
      UPDATE Book
      SET Title = ?, Year = ?, Price = ?, Category = ?
      WHERE ISBN = ?
    `;
    await promisePool.query(query, [
      data.Title,
      data.Year,
      data.Price,
      data.Category,
      data.ISBN,
    ]);
  },

  // 저자 정보 수정
  updateAuthor: async (data) => {
    const query = `
      UPDATE Author
      SET Name = ?, Address = ?, URL = ?
      WHERE AuthorID = ?
    `;
    await promisePool.query(query, [
      data.Name,
      data.Address,
      data.URL,
      data.AuthorID,
    ]);
  },

  // 상 정보 수정
  updateAward: async (data) => {
    const query = `
      UPDATE Award
      SET Name = ?, Year = ?
      WHERE AwardID = ?
    `;
    await promisePool.query(query, [data.Name, data.Year, data.AwardID]);
  },

  // Inventory 정보 수정
  updateInventory: async ({ WarehouseID, BookISBN, Quantity }) => {
    const query = `
      UPDATE Inventory
      SET Quantity = ?
      WHERE Warehouse_WarehouseID = ? AND Book_ISBN = ?`;
    await promisePool.query(query, [Quantity, WarehouseID, BookISBN]);
  },
  
  // Contains 수정
  editContains: async (basketID, bookISBN, newNumber) => {
    const query = `
      UPDATE Contains
      SET Number = ?
      WHERE ShoppingBasket_BasketID = ? AND Book_ISBN = ?
    `;
    await promisePool.query(query, [newNumber, basketID, bookISBN]);
  }, 

  // Reservation Date 수정 (새롭게 추가된 함수)
  updateReservationDate: async (reservationID, newReservationDate) => {
    const query = `
      UPDATE Reservation
      SET ReservationDate = ?
      WHERE ReservationID = ?
    `;
    await promisePool.query(query, [newReservationDate, reservationID]);
  }, 

  updateOrderDate: async (userEmail) => {
    const query = `
      UPDATE ShoppingBasket
      SET OrderDate = CURDATE()
      WHERE User_Email = ? AND OrderDate IS NULL
    `;
    await promisePool.query(query, [userEmail]);
  },
  
};

// 데이터 삭제 관련 함수
export const deleteSql = {
  // 장바구니에서 책 제거
  removeFromBasket: async (userEmail, bookISBN) => { 
    console.log("Deleting from basket: ", userEmail, bookISBN); // 디버깅 로그 추가
    const query = `
      DELETE FROM Contains
      WHERE ShoppingBasket_BasketID = (
        SELECT BasketID
        FROM ShoppingBasket
        WHERE User_Email = ?
      )
      AND Book_ISBN = ?
    `;
    await promisePool.query(query, [userEmail, bookISBN]);
  },

  // 예약 취소
  cancelReservation: async (reservationID) => {
    const results = await promisePool.query(
      `DELETE FROM Reservation WHERE ReservationID = ?`,
      [reservationID]
    );
    return results[0];
  },

  // 책 삭제
  deleteBook: async (ISBN) => {
    const query = `
      DELETE FROM Book WHERE ISBN = ?`;
    await promisePool.query(query, [ISBN]);
  },

  // 저자 삭제
  deleteAuthor: async (AuthorID) => {
    const query = `
      DELETE FROM Author WHERE AuthorID = ?`;
    await promisePool.query(query, [AuthorID]);
  },

  // 상 삭제
  deleteAward: async (AwardID) => {
    const query = `
      DELETE FROM Award WHERE AwardID = ?`;
    await promisePool.query(query, [AwardID]);
  },

  // Inventory 삭제
  deleteInventory: async (WarehouseID, BookISBN) => {
    const query = `
      DELETE FROM Inventory WHERE Warehouse_WarehouseID = ? AND Book_ISBN = ?`;
    await promisePool.query(query, [WarehouseID, BookISBN]);
  },

  // Contains 삭제
  deleteContains: async (BasketID, BookISBN) => {
    const results = await promisePool.query(
      `DELETE FROM Contains
       WHERE ShoppingBasket_BasketID = ? AND Book_ISBN = ?`,
      [BasketID, BookISBN]
    );
    return results[0];
  }, 
};
