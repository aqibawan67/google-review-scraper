const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const url = "https://www.google.com/maps/place/University+of+Central+Punjab/@31.4469043,74.2656513,17z/data=!4m8!3m7!1s0x3919017432b1835b:0xe396992a5b05891c!8m2!3d31.4468997!4d74.2682316!9m1!1b1!16zL20vMDgyZHdm?entry=ttu";

  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for the reviews section to load
  await page.waitForSelector('div.jftiEf.fontBodyMedium', { timeout: 30000 });

  // Scroll function to load reviews incrementally
  let previousReviewCount = 0;
  let currentReviewCount = 0;
  let maxScrollAttempts = 50; // Set a max number of scroll attempts
  let scrollAttempts = 0;

  while (scrollAttempts < maxScrollAttempts) {
    // Get the current review count
    currentReviewCount = await page.evaluate(() => {
      return document.querySelectorAll('div.jftiEf.fontBodyMedium').length;
    });

    // If no new reviews are loaded, break out of the loop
    if (currentReviewCount === previousReviewCount) {
      break;
    }

    // Scroll to load more reviews
    await autoScroll(page);
    
    // Wait for a loading animation or spinner to disappear before continuing
    await page.waitForSelector('div[jscontroller="W1dGVe"]', { timeout: 5000, visible: true }).catch(() => {}); // Wait for loading spinner (if any)

    // Update previous review count
    previousReviewCount = currentReviewCount;

    // Wait for new reviews to load using Promise-based timeout
    await new Promise(resolve => setTimeout(resolve, 19000)); // Adjust this if necessary
    scrollAttempts++;
    console.log(`Scroll attempt ${scrollAttempts}: Loaded ${currentReviewCount} reviews`);
  }

  // Extract all reviews
  const reviews = await page.evaluate(() => {
    const reviewNodes = document.querySelectorAll('div.jftiEf.fontBodyMedium');
    return Array.from(reviewNodes).map(node => {
      const name = node.querySelector('.d4r55')?.textContent.trim() || 'Anonymous';
      const profilePicture = node.querySelector('img.NBa7we')?.src || null;
      const stars = node.querySelectorAll('.hCCjke.elGi1d').length;
      const text = node.querySelector('.wiI7pd')?.textContent.trim() || '';
      const date = node.querySelector('.rsqaWe')?.textContent.trim() || '';
      const photos = node.querySelectorAll('.Tya61d').length;
      const isLocalGuide = node.querySelector('.RfnDt')?.textContent.includes('Local Guide') || false;

      return {
        name,
        profilePicture,
        rating: stars,
        review: text,
        date,
        photos,
        isLocalGuide
      };
    });
  });

  fs.writeFileSync('ucp_all_reviews.json', JSON.stringify(reviews, null, 2));
  console.log(`Successfully scraped ${reviews.length} reviews`);

  await browser.close();
})();

async function autoScroll(page) {
  await page.evaluate(async () => {
    const reviewScrollContainer = document.querySelector('div[aria-label][role="region"]');

    if (!reviewScrollContainer) {
      console.log("Scrollable container not found");
      return;
    }

    await new Promise((resolve) => {
      let totalScrolled = 0;
      const distance = 300;
      const timer = setInterval(() => {
        reviewScrollContainer.scrollBy(0, distance);
        totalScrolled += distance;

        if (totalScrolled >= reviewScrollContainer.scrollHeight - reviewScrollContainer.clientHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 200);
    });
  });
}
