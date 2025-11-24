// Backend/routes/financeRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

const {
  getSaldo,
  getExtrato,
  deposito,
  saque,
  getMeta,
  saveMeta,
  updateMeta,
  deleteMeta,
} = require("../controllers/financeController");

// Saldo e Movimentações
router.get("/saldo", auth, getSaldo);
router.get("/extrato", auth, getExtrato);
router.post("/deposito", auth, deposito);
router.post("/saque", auth, saque);

// 🔥 Rotas da META financeira — ESTAVAM FALTANDO
router.get("/meta", auth, getMeta);
router.post("/meta", auth, saveMeta);
router.put("/meta/:id_meta", auth, updateMeta);
router.delete("/meta/:id_meta", auth, deleteMeta);

module.exports = router;
