const express = require('express');
const router = express.Router();

// 메인 페이지
router.get('/', (req, res) => {
  const user = req.session.user;
  res.render('main', { user });
});

module.exports = router;
