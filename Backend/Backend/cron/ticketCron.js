const cron = require("node-cron");
const ticketSettlementService = require("../services/ticketSettlementService");

// roda de 5 em 5 minutos
cron.schedule("*/5 * * * *", async () => {
  console.log("⏳ Rodando verificação automática de bilhetes...");
  await ticketSettlementService.settleTickets();
});

console.log("Cron de bilhetes iniciado.");
