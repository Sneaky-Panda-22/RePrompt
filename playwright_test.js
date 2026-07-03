const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const logs = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    const entry = `[${type}] ${text}`;
    logs.push(entry);
    if (type === 'error') errors.push(entry);
  });
  
  page.on('pageerror', err => {
    const entry = 'PAGE ERROR: ' + err.message;
    errors.push(entry);
    logs.push(entry);
  });

  page.on('response', resp => {
    if (resp.status() >= 400) {
      logs.push(`HTTP ${resp.status()}: ${resp.url()}`);
    }
  });

  try {
    await page.goto('http://localhost:4322/app', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
  } catch (e) { 
    errors.push('NAVIGATION: ' + e.message); 
  }

  console.log('=== ALL LOGS ===');
  logs.forEach(l => console.log(l));
  
  console.log('\n=== ERROR COUNT:', errors.length, '===');
  errors.forEach(e => console.log('ERR:', e));

  const text = await page.evaluate(() => document.body.innerText);
  console.log('\n=== VISIBLE TEXT ===');
  console.log(text.substring(0, 1000));

  const islandInfo = await page.evaluate(() => {
    const island = document.querySelector('astro-island');
    return {
      found: !!island,
      children: island ? island.children.length : 0,
      hasSsr: island ? island.hasAttribute('ssr') : false,
      innerHTML: island ? island.innerHTML.substring(0, 300) : 'N/A'
    };
  });
  console.log('\n=== ISLAND INFO ===');
  console.log(JSON.stringify(islandInfo, null, 2));

  await browser.close();
})();
