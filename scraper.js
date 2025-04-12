const puppeteer = require("puppeteer");
const fs = require("fs");

(async () => {
  const url = "https://www.google.com/maps/place/YOUR_BUSINESS_NAME_HERE"; // Replace this

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  await page.waitForSelector('button[jsaction*="reviews"]', { timeout: 10000 });
  await page.click('button[jsaction*="reviews"]');
  await page.waitForTimeout(3000);

  const reviews = await page.evaluate(() => {
    const reviewNodes = document.querySelectorAll(".jftiEf");
    return Array.from(reviewNodes).map((node) => {
      const name = node.querySelector(".d4r55")?.innerText || "";
      const text = node.querySelector(".wiI7pd")?.innerText || "";
      const stars = node.querySelector("span[aria-label*='stars']")?.getAttribute("aria-label") || "";
      const time = node.querySelector(".rsqaWe")?.innerText || "";
      return { name, text, stars, time };
    });
  });

  fs.writeFileSync("reviews.json", JSON.stringify(reviews, null, 2));
  console.log(`Saved ${reviews.length} reviews`);

  await browser.close();
})();
