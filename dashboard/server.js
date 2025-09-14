const express = require('express');
const bodyParser = require('body-parser');

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
    .wrap { display:flex; justify-content:center; padding:40px; }
    .card { background:white; padding:32px; border-radius:16px; width:100%; max-width:820px;
            box-shadow:0 8px 28px rgba(0,0,0,0.1); }
    h1 { margin-top:0; font-size:24px; }
    p { margin-bottom:20px; color:#4b5563; }
    .btn { padding:12px 20px; border:none; border-radius:10px; background:#2563eb; color:white; 
           cursor:pointer; font-weight:600; transition:background 0.2s; }
    .btn:hover { background:#1e40af; }
    .input { padding:12px; border:1px solid #d1d5db; border-radius:10px; width:100%; 
             box-sizing:border-box; margin-bottom:24px; }
    table { width:100%; border-collapse:collapse; margin-top:24px; }
    th, td { padding:12px; border-bottom:1px solid #eee; text-align:left; font-size:14px; vertical-align:middle; }
    th { background:#f9fafb; font-weight:600; }
    .state { font-weight:600; display:flex; align-items:center; gap:6px; }
    .state-running { color:orange; }
    .state-success { color:green; }
    .state-failed { color:red; }
    .bar { height:6px; width:100px; background:#e5e7eb; border-radius:4px; overflow:hidden; display:inline-block; vertical-align:middle; }
    .bar-fill { height:100%; width:0%; background:#2563eb; transition:width 0.4s ease; }
    .summary { margin-top:24px; font-weight:bold; font-size:15px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      ${bodyHtml}
    </div>
  </div>
</body>
</html>`;
}

app.get('/', (req, res) => {
  const html = `
    <h1>Security Scanner</h1>
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

        for(let i=0;i<vulnTypes.length;i++){
          const statusSpan = document.getElementById('status'+i);
          const bar = document.getElementById('bar'+i);

          // Animate progress bar
          let w=0;
          const interval = setInterval(()=>{ w+=10; if(w<=100) bar.style.width=w+'%'; }, 200);

          // Fake scan delay
          await new Promise(r=>setTimeout(r,1500));

          clearInterval(interval);
          bar.style.width='100%';

          // Mock result: alternate pass/fail
          const passed = (i % 2 === 0);

          if(passed){
            statusSpan.className = 'state state-success';
            statusSpan.textContent = 'Success';
            bar.style.display = 'none';
            passCount++;
          } else {
            statusSpan.className = 'state state-failed';
            statusSpan.textContent = 'Failed';
            bar.style.display = 'none';
            document.getElementById('fb'+i).innerText = 'Example issue detected in '+vulnTypes[i];
            failCount++;
          }
        }

        document.getElementById('summary').innerText = 'Passed: '+passCount+' | Failed: '+failCount;
      }
    </script>
  `;
  res.send(page("Security Scanner", html));
});

app.listen(3000, ()=> console.log("Scanner UI running at http://localhost:3000"));
