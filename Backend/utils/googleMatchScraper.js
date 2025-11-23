// Backend/utils/googleMatchScraper.js
const puppeteer = require("puppeteer");

/**
 * Faz uma busca no Google do tipo:
 *   "Fluminense x Flamengo 19/11/2025"
 * e tenta extrair o placar final.
 *
 * Retorna:
 *   { found: true, homeGoals: 2, awayGoals: 1 }
 * ou:
 *   { found: false }
 */
async function scrapeGoogleResult(homeName, awayName, dateISO) {
  // dateISO: "2025-11-19"
  const [yyyy, mm, dd] = dateISO.split("-");
  const dateBr = `${dd}/${mm}/${yyyy}`;
  const query = `${homeName} x ${awayName} ${dateBr}`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  try {
    const url =
      "https://www.google.com/search?q=" + encodeURIComponent(query);
    await page.goto(url, { waitUntil: "networkidle2" });

    // Este seletor pode precisar de ajuste com o DOM atual do Google.
    // Ideia: pegar o placar principal do box do jogo (scoreboard).
    const score = await page.evaluate(() => {
      // tenta localizar spans com o placar principal
      const spanEls = Array.from(
        document.querySelectorAll("div[role='heading'] span")
      );

      // procura algo tipo "2" " - " "1"
      const nums = spanEls
        .map((el) => el.innerText.trim())
        .filter((t) => /^\d+$/.test(t));

      if (nums.length >= 2) {
        const homeGoals = parseInt(nums[0], 10);
        const awayGoals = parseInt(nums[1], 10);
        if (!Number.isNaN(homeGoals) && !Number.isNaN(awayGoals)) {
          return { homeGoals, awayGoals };
        }
      }

      return null;
    });

    await browser.close();

    if (!score) {
      return { found: false };
    }

    return {
      found: true,
      homeGoals: score.homeGoals,
      awayGoals: score.awayGoals,
    };
  } catch (err) {
    console.error("Erro no scrape do Google:", err);
    await browser.close();
    return { found: false };
  }
}

module.exports = {
  scrapeGoogleResult,
};
