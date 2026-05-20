const puppeteer = require('puppeteer');
const fs = require('fs');

async function run() {
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Navigating to Kakao Webtoon viewer...');
    await page.goto('https://webtoon.kakao.com/viewer/%ED%95%98%EB%A0%98%EC%83%9D%EC%A1%B4%EA%B8%B0-001/60751', { waitUntil: 'networkidle2' });
    
    console.log('Page loaded. Waiting 5s...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Scrolling down...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight || totalHeight > 15000) {
            clearInterval(timer);
            resolve();
          }
        }, 80);
      });
    });

    console.log('Scroll complete. Taking screenshot...');
    await page.screenshot({ path: 'diagnose_screenshot.png', fullPage: false });
    console.log('Screenshot saved to diagnose_screenshot.png');

    const htmlContent = await page.evaluate(() => document.body.innerHTML);
    fs.writeFileSync('diagnose_dom.html', htmlContent);
    console.log('DOM saved to diagnose_dom.html');

    const imagesInfo = await page.evaluate(() => {
      const allImgs = Array.from(document.querySelectorAll('img'));
      return allImgs.map(img => ({
        src: img.src,
        class: img.className,
        parentTag: img.parentElement?.tagName,
        parentClass: img.parentElement?.className,
        grandparentClass: img.parentElement?.parentElement?.className,
        dataIndex: img.parentElement?.getAttribute('data-index') || img.parentElement?.parentElement?.getAttribute('data-index')
      }));
    });

    console.log('Detected webtoon images count:', imagesInfo.length);
    console.log('Sample images:', JSON.stringify(imagesInfo.slice(0, 10), null, 2));
    
  } catch (err) {
    console.error('Error during diagnosis:', err);
  } finally {
    await browser.close();
  }
}

run();
