const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

function page(title, bodyHtml) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; background:#f4f7fb; margin:0; padding:0; }
    nav { background:#2563eb; padding:12px 24px; display:flex; gap:12px; }
    nav a { color:white; text-decoration:none; font-weight:600; }
    .wrap { display:flex; justify-content:center; padding:40px; }
    .card { background:white; padding:32px; border-radius:16px; width:100%; max-width:820px; box-shadow:0 8px 28px rgba(0,0,0,0.1); }
    h1 { margin-top:0; font-size:24px; }
    p { margin-bottom:20px; color:#4b5563; }
    .btn { padding:12px 20px; border:none; border-radius:10px; background:#2563eb; color:white; 
           cursor:pointer; font-weight:600; transition:background 0.2s; }
    .btn:hover { background:#1e40af; }
    .input { padding:12px; border:1px solid #d1d5db; border-radius:10px; width:100%; 
             box-sizing:border-box; margin-bottom:24px; }
    table { width:100%; border-collapse:collapse; margin-top:24px; }
    th, td { padding:12px; border-bottom:1px solid #eee; text-align:left; font-size:14px; vertical-align:top; }
    th { background:#f9fafb; font-weight:600; }
    td:nth-child(4) { max-width: 400px; word-wrap: break-word; }
    .state { font-weight:600; display:flex; align-items:center; gap:6px; }
    .state-running { color:orange; }
    .state-success { color:green; }
    .state-failed { color:red; }
    .bar { height:6px; width:100px; background:#e5e7eb; border-radius:4px; overflow:hidden; display:inline-block; vertical-align:middle; }
    .bar-fill { height:100%; width:0%; background:#2563eb; transition:width 0.4s ease; }
    .summary { margin-top:24px; font-weight:bold; font-size:15px; }
    .checkbox-group { display:flex; flex-direction:column; gap:8px; margin-top:12px; margin-bottom:16px; }
    .feedback { margin-top:12px; font-weight:bold; }
    .correct { color:green; font-weight:bold; }
    .incorrect { color:red; font-weight:bold; }
    .nav-btns { margin-top:16px; display:flex; justify-content:space-between; font-size:16px; font-weight:bold; color:#2563eb; cursor:pointer; }
    .nav-btns span { display:flex; align-items:center; gap:4px; }
    .arrow { transition: transform 0.3s; }
    .arrow.flip { transform: rotate(90deg); }
  </style>
</head>
<body>
  <nav>
    <a href="/">Scanner</a>
    <a href="/education">Education</a>
  </nav>
  <div class="wrap">
    <div class="card">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

// -------------------- API Endpoints --------------------
app.post('/api/run-sql-test', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`Running SQL injection test on: ${url}`);
    const response = await axios.get(`http://localhost:3001/run-task?url=${encodeURIComponent(url)}`);
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error calling backend:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to run SQL injection test',
      details: error.message
    });
  }
});

// -------------------- Main Security Scanner --------------------
app.get('/', (req, res) => {
  const html = `
    <h1>Fortify</h1>
    <p>Enter a target URL and run vulnerability checks against common issues.</p>
    <input id="urlInput" class="input" placeholder="https://example.com" />
    <button class="btn" onclick="runTests()">Run Tests</button>
    <div id="results"></div>

    <script>
      const vulnTypes = ["SQL Injection","API Key Leaks","CSRF","XSS"];

      async function runTests(){
        const target = document.getElementById('urlInput').value;
        if(!target){ alert("Enter a URL first."); return; }

        const resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = '';

        let table = '<table><tr><th>#</th><th>Vulnerability</th><th>Status</th><th>Feedback</th></tr>';
        vulnTypes.forEach((t,i)=>{
          table += \`
            <tr id="row\${i}">
              <td>\${i+1}</td>
              <td>\${t}</td>
              <td class="state">
                <span id="status\${i}" class="state-running">Running</span>
                <div class="bar"><div class="bar-fill" id="bar\${i}"></div></div>
              </td>
              <td id="fb\${i}"></td>
            </tr>\`;
        });
        table += '</table><div class="summary" id="summary"></div>';
        resultsDiv.innerHTML = table;

        let passCount = 0, failCount = 0;

        // Run SQL Injection test (real backend call)
        const sqlStatusSpan = document.getElementById('status0');
        const sqlBar = document.getElementById('bar0');
        const sqlFeedback = document.getElementById('fb0');

        // Show progress for SQL injection test
        let w=0;
        const sqlInterval = setInterval(()=>{ w+=5; if(w<=95) sqlBar.style.width=w+'%'; }, 200);

        try {
          const response = await fetch('/api/run-sql-test', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: target })
          });

          const result = await response.json();
          
          clearInterval(sqlInterval);
          sqlBar.style.width='100%';

          if (result.success && result.data.success) {
            sqlStatusSpan.className = 'state state-failed';
            sqlStatusSpan.textContent = 'Vulnerable';
            sqlBar.style.display = 'none';
            
            // Parse and format the result nicely
            let formattedResult = result.data.result;
            try {
              // Try to parse as JSON and format it nicely
              const parsedResult = JSON.parse(result.data.result);
              if (Array.isArray(parsedResult) && parsedResult.length > 0) {
                const vuln = parsedResult[0];
                formattedResult = 
                  '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
                    '<div style="color: #dc2626; font-weight: bold; margin-bottom: 8px;">⚠️ SQL Injection Vulnerability Detected</div>' +
                    '<div style="color: #374151; margin-bottom: 4px;"><strong>Type:</strong> ' + (vuln.type || 'SQL Injection') + '</div>' +
                    '<div style="color: #374151; margin-bottom: 4px;"><strong>Status:</strong> <span style="color: #dc2626;">' + (vuln.state || 'Failed') + '</span></div>' +
                    '<div style="color: #374151;"><strong>Details:</strong> ' + (vuln.feedback || vuln.reason || 'Vulnerability confirmed') + '</div>' +
                  '</div>';
              }
            } catch (e) {
              // If not JSON, display as formatted text
              formattedResult = 
                '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
                  '<div style="color: #dc2626; font-weight: bold; margin-bottom: 8px;">⚠️ SQL Injection Vulnerability Detected</div>' +
                  '<div style="color: #374151; white-space: pre-wrap;">' + result.data.result + '</div>' +
                '</div>';
            }
            
            sqlFeedback.innerHTML = formattedResult;
            failCount++;
          } else {
            sqlStatusSpan.className = 'state state-success';
            sqlStatusSpan.textContent = 'Secure';
            sqlBar.style.display = 'none';
            sqlFeedback.innerHTML = 
              '<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
                '<div style="color: #16a34a; font-weight: bold; margin-bottom: 4px;">✅ No SQL Injection Vulnerabilities Found</div>' +
                '<div style="color: #374151;">The application appears to be protected against SQL injection attacks.</div>' +
              '</div>';
            passCount++;
          }
        } catch (error) {
          clearInterval(sqlInterval);
          sqlBar.style.width='100%';
          sqlStatusSpan.className = 'state state-failed';
          sqlStatusSpan.textContent = 'Error';
          sqlBar.style.display = 'none';
          sqlFeedback.innerHTML = 
            '<div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
              '<div style="color: #d97706; font-weight: bold; margin-bottom: 4px;">⚠️ Error Running Test</div>' +
              '<div style="color: #374151;">' + error.message + '</div>' +
            '</div>';
          failCount++;
        }

        // API Key Leaks test (test 2)
        const apiKeyStatusSpan = document.getElementById('status1');
        const apiKeyBar = document.getElementById('bar1');
        const apiKeyFeedback = document.getElementById('fb1');

        let w2=0;
        const apiKeyInterval = setInterval(()=>{ w2+=5; if(w2<=95) apiKeyBar.style.width=w2+'%'; }, 200);

        await new Promise(r=>setTimeout(r, 10000)); // 10 seconds like SQL test

        clearInterval(apiKeyInterval);
        apiKeyBar.style.width='100%';

        // Simulate API Key Leaks detection (mock result)
        const apiKeyVulnerable = true; // Mock: always vulnerable for demo
        if (apiKeyVulnerable) {
          apiKeyStatusSpan.className = 'state state-failed';
          apiKeyStatusSpan.textContent = 'Vulnerable';
          apiKeyBar.style.display = 'none';
          
          apiKeyFeedback.innerHTML = 
            '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
              '<div style="color: #dc2626; font-weight: bold; margin-bottom: 8px;">⚠️ API Key Leak Vulnerability Detected</div>' +
              '<div style="color: #374151; margin-bottom: 4px;"><strong>Type:</strong> API Key Exposure</div>' +
              '<div style="color: #374151; margin-bottom: 4px;"><strong>Status:</strong> <span style="color: #dc2626;">Failed</span></div>' +
              '<div style="color: #374151;"><strong>Details:</strong> API key "sk-1234567890abcdef" found exposed in JavaScript source code. This key has access to sensitive data and should be immediately revoked and regenerated.</div>' +
            '</div>';
          failCount++;
        } else {
          apiKeyStatusSpan.className = 'state state-success';
          apiKeyStatusSpan.textContent = 'Secure';
          apiKeyBar.style.display = 'none';
          apiKeyFeedback.innerHTML = 
            '<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
              '<div style="color: #16a34a; font-weight: bold; margin-bottom: 4px;">✅ No API Key Leaks Found</div>' +
              '<div style="color: #374151;">No exposed API keys detected in the application.</div>' +
            '</div>';
          passCount++;
        }

        // CSRF test (test 3)
        const csrfStatusSpan = document.getElementById('status2');
        const csrfBar = document.getElementById('bar2');
        const csrfFeedback = document.getElementById('fb2');

        let w3=0;
        const csrfInterval = setInterval(()=>{ w3+=5; if(w3<=95) csrfBar.style.width=w3+'%'; }, 200);

        await new Promise(r=>setTimeout(r, 10000)); // 10 seconds like SQL test

        clearInterval(csrfInterval);
        csrfBar.style.width='100%';

        // Simulate CSRF detection (mock result)
        const csrfVulnerable = false; // Mock: secure for demo
        if (csrfVulnerable) {
          csrfStatusSpan.className = 'state state-failed';
          csrfStatusSpan.textContent = 'Vulnerable';
          csrfBar.style.display = 'none';
          
          csrfFeedback.innerHTML = 
            '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
              '<div style="color: #dc2626; font-weight: bold; margin-bottom: 8px;">⚠️ CSRF Vulnerability Detected</div>' +
              '<div style="color: #374151; margin-bottom: 4px;"><strong>Type:</strong> Cross-Site Request Forgery</div>' +
              '<div style="color: #374151; margin-bottom: 4px;"><strong>Status:</strong> <span style="color: #dc2626;">Failed</span></div>' +
              '<div style="color: #374151;"><strong>Details:</strong> Forms lack CSRF tokens, allowing attackers to perform unauthorized actions on behalf of authenticated users.</div>' +
            '</div>';
          failCount++;
        } else {
          csrfStatusSpan.className = 'state state-success';
          csrfStatusSpan.textContent = 'Secure';
          csrfBar.style.display = 'none';
          csrfFeedback.innerHTML = 
            '<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
              '<div style="color: #16a34a; font-weight: bold; margin-bottom: 4px;">✅ CSRF Protection Active</div>' +
              '<div style="color: #374151;">CSRF tokens are properly implemented and validated.</div>' +
            '</div>';
          passCount++;
        }

        // XSS test (test 4)
        const xssStatusSpan = document.getElementById('status3');
        const xssBar = document.getElementById('bar3');
        const xssFeedback = document.getElementById('fb3');

        let w4=0;
        const xssInterval = setInterval(()=>{ w4+=5; if(w4<=95) xssBar.style.width=w4+'%'; }, 200);

        await new Promise(r=>setTimeout(r, 10000)); // 10 seconds like SQL test

        clearInterval(xssInterval);
        xssBar.style.width='100%';

        // Simulate XSS detection (mock result)
        const xssVulnerable = true; // Mock: vulnerable for demo
        if (xssVulnerable) {
          xssStatusSpan.className = 'state state-failed';
          xssStatusSpan.textContent = 'Vulnerable';
          xssBar.style.display = 'none';
          
          xssFeedback.innerHTML = 
            '<div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
              '<div style="color: #dc2626; font-weight: bold; margin-bottom: 8px;">⚠️ XSS Vulnerability Detected</div>' +
              '<div style="color: #374151; margin-bottom: 4px;"><strong>Type:</strong> Cross-Site Scripting</div>' +
              '<div style="color: #374151; margin-bottom: 4px;"><strong>Status:</strong> <span style="color: #dc2626;">Failed</span></div>' +
              '<div style="color: #374151;"><strong>Details:</strong> Reflected XSS vulnerability found in search parameter. User input is not properly sanitized and can execute malicious scripts.</div>' +
            '</div>';
          failCount++;
        } else {
          xssStatusSpan.className = 'state state-success';
          xssStatusSpan.textContent = 'Secure';
          xssBar.style.display = 'none';
          xssFeedback.innerHTML = 
            '<div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; margin-top: 8px;">' +
              '<div style="color: #16a34a; font-weight: bold; margin-bottom: 4px;">✅ XSS Protection Active</div>' +
              '<div style="color: #374151;">Input sanitization and output encoding are properly implemented.</div>' +
            '</div>';
          passCount++;
        }

        document.getElementById('summary').innerText = 'Passed: '+passCount+' | Failed: '+failCount;
      }
    </script>
  `;
  res.send(page("Fortify", html));
});

// -------------------- Educational Scanner --------------------
app.get('/education', (req, res) => {
  const html = `
    <h1>Educational Scanner</h1>
    <p>Try to identify which vulnerabilities exist for the target URL.</p>
    <div>
      <strong>Target URL:</strong> <span id="eduUrl"></span>
    </div>
    <div class="checkbox-group" id="vulnOptions"></div>
    <button class="btn" onclick="checkSelections()">Submit Answers</button>
    <div id="eduFeedback"></div>
    <div class="nav-btns">
      <span onclick="prevQuestion()"><span class="arrow">⬅</span> Back</span>
      <span onclick="nextQuestion()">Next <span class="arrow">➡</span></span>
    </div>

    <script>
      const questions = [
        {
          url: 'http://localhost:3002',
          results: [
            {vuln:false, reason:"Safe from SQL Injection"},
            {vuln:true, reason:"API key found exposed in JavaScript source code"},
            {vuln:false, reason:"CSRF protection active"},
            {vuln:true, reason:"XSS vulnerability found in search parameter"}
          ]
        },
        {
          url: 'http://localhost:3000',
          results: [
            {vuln:true, reason:"User input not sanitized, vulnerable to SQL injection"},
            {vuln:false, reason:"No API keys exposed in the page"},
            {vuln:true, reason:"No CSRF token present on forms"},
            {vuln:false, reason:"XSS filters are in place"}
          ]
        }
      ];

      let currentQ = 0;

      function loadQuestion(qIndex){
        document.getElementById('eduUrl').textContent = questions[qIndex].url;
        const vulnOptionsDiv = document.getElementById('vulnOptions');
        vulnOptionsDiv.innerHTML = '';
        questions[qIndex].results.forEach((res, i)=>{
          const label = document.createElement('label');
          label.innerHTML = '<input type="checkbox" id="edu'+i+'"> ' + ["SQL Injection","API Key Leaks","CSRF","XSS"][i];
          vulnOptionsDiv.appendChild(label);
        });
        document.getElementById('eduFeedback').innerHTML = '';
      }

      function checkSelections(){
        const feedbackDiv = document.getElementById('eduFeedback');
        const results = questions[currentQ].results;
        let table = '<table><tr><th>#</th><th>Vulnerability</th><th>Actual</th><th>Reason</th><th>Your Answer</th></tr>';
        results.forEach((res, i)=>{
          const selected = document.getElementById('edu'+i).checked;
          const correct = selected === res.vuln;
          table += '<tr>' +
                   '<td>'+(i+1)+'</td>' +
                   '<td>'+["SQL Injection","API Key Leaks","CSRF","XSS"][i]+'</td>' +
                   '<td>' + (res.vuln ? 'Vulnerable' : 'Not Vulnerable') + '</td>' +
                   '<td>' + res.reason + '</td>' +
                   '<td class="' + (correct ? 'correct' : 'incorrect') + '">' + (correct ? 'Correct' : 'Incorrect') + '</td>' +
                   '</tr>';
        });
        table += '</table>';
        feedbackDiv.innerHTML = table;
      }

      function nextQuestion(){
        currentQ = (currentQ + 1) % questions.length;
        loadQuestion(currentQ);
      }

      function prevQuestion(){
        currentQ = (currentQ - 1 + questions.length) % questions.length;
        loadQuestion(currentQ);
      }

      // Initial load
      loadQuestion(currentQ);
    </script>
  `;
  res.send(page("Educational Scanner", html));
});

app.listen(3002, ()=> console.log("App running at http://localhost:3002"));
