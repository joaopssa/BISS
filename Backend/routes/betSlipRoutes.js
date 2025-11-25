const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  criarBilhete,
  listarBilhetes,
  historicoApostas,
} = require("../controllers/betSlipController");
const { verificarBilhetesPendentes } = require("../controllers/betCheckController");

router.post("/bilhetes", auth, criarBilhete);
router.get("/bilhetes", auth, listarBilhetes);
router.get("/historico", auth, historicoApostas);
router.post("/verificar", auth, verificarBilhetesPendentes);
module.exports = router;
