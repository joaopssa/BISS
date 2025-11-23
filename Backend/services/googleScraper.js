const { chromium } = require("playwright");

async function scrapeGoogleResult(timeCasa, timeFora, data) {
  const query = `${timeCasa} x ${timeFora} ${data}`;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`);

  try {
    const result = await page.evaluate(() => {
      const ft = document.querySelector("div[jsname='U1S4Ne']");
      if (!ft) return null;

      const gols = [...document.querySelectorAll("div.imso_mh__l-tm-sc")].map(e =>
        Number(e.textContent.trim())
      );

      if (gols.length < 2) return null;

      return {
        golsCasa: gols[0],
        golsFora: gols[1],
        htCasa: null,
        htFora: null
      };
    });

    await browser.close();
    return result;
  } catch (e) {
    await browser.close();
    return null;
  }
}

module.exports = { scrapeGoogleResult };
