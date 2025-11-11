// Backend/routes/financeRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  getSaldo,
  getExtrato,
  deposito,
  saque,
} = require("../controllers/financeController");

router.get("/saldo", auth, getSaldo);
router.get("/extrato", auth, getExtrato);
router.post("/deposito", auth, deposito);
router.post("/saque", auth, saque);

module.exports = router;
