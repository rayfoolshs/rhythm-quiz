# Submitting test results to a shared Google Sheet

This is an **additive** feature sketch. It does **not** change any existing quiz
behaviour: the `localStorage` class list and the CSV export keep working exactly as
they do now. It only adds one button on the results screen plus a small config/logic
block, and it only does anything when a student clicks the button.

Because it talks to Google, it **requires internet**. It therefore breaks the
project's "no internet / no server" hard constraint (BUILD-PROMPT §7, BUILD-PLAN §1),
which is why the CSV path remains the offline fallback.

It implements **Option B** from the discussion: a Google Apps Script Web App bound to
the spreadsheet acts as the write backend, so there is no server to run and no secret
to embed. Two identity modes are supported:

- **Mode 1 (simplest, same Workspace domain):** no client ID. Apps Script identifies
  the student from their signed-in Google session via
  `Session.getActiveUser().getEmail()`.
- **Mode 2 (any Google account):** set a client ID; the button performs a real
  "Sign in with Google" and sends a verifiable ID token that the script checks
  server-side.

The net effect: every student who signs in with their own Google account appends a
row (keyed by their email) to the **same** shared spreadsheet.

---

## 1. `Code.gs` — the full Apps Script

```js
/************************  CONFIG  ************************/
const SHEET_ID   = 'PASTE_YOUR_SPREADSHEET_ID';   // from the sheet URL
const SHEET_NAME = 'Results';
const CLIENT_ID  = '';                            // optional: set only for Mode 2
const HEADERS = ['Timestamp','Email','Name','Year','Score',
                 'Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10','Wrong'];

/**********************  HELPERS  *************************/
// Mode 2: verify a Google OAuth access token the browser sent us.
function emailFromAccessToken(accessToken){
  if(!accessToken) return null;
  const res = UrlFetchApp.fetch(
    'https://www.googleapis.com/oauth2/v3/userinfo',
    { headers: { Authorization: 'Bearer ' + accessToken }, muteHttpExceptions: true });
  if(res.getResponseCode() !== 200) return null;
  const info = JSON.parse(res.getContentText());
  if(info.email_verified === false || info.email_verified === 'false') return null;
  return info.email || null;
}

function getSheet_(){
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if(sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

/************************  POST  **************************/
function doPost(e){
  try{
    if(!e || !e.postData || !e.postData.contents) throw new Error('empty body');
    const d = JSON.parse(e.postData.contents);

    // Identity: verified access token first (Mode 2), else the signed-in user (Mode 1).
    let email = emailFromAccessToken(d.accessToken);
    if(!email){
      try { email = Session.getActiveUser().getEmail(); } catch(err){ email = ''; }
    }
    if(!email) email = '(not signed in)';

    const row = [
      new Date(),                 // server timestamp
      email,
      String(d.name  || ''),
      String(d.year  || ''),
      String(d.score || '')
    ].concat(d.responses || [], [ String(d.wrong || '') ]);
    while(row.length < HEADERS.length) row.push('');   // pad to table width

    getSheet_().appendRow(row.slice(0, HEADERS.length));
    return json_({ ok:true, email:email });
  }catch(err){
    return json_({ ok:false, error:String(err) });
  }
}

/************************  GET  ***************************/
function doGet(){
  return json_({ ok:true, service:'rhythm-quiz-append' });
}
```

---

## 2. HTML hook — one button + one status line

Inside the existing results block, in the `.modalbtns` (right after the
**Save & download CSV** button in `#testResult`):

```html
<div class="modalbtns">
  <button class="btn primary" id="saveCsv">Save &amp; download CSV</button>

  <!-- ↓↓↓ ADD THIS ↓↓↓ -->
  <button class="btn google" id="sheetSubmit">Sign in with Google &amp; submit</button>
  <!-- ↑↑↑ ADD THIS ↑↑↑ -->

  <button class="btn" id="retake">Retake test</button>
  <button class="btn" id="closeResult">Back to practice</button>
</div>

<!-- ↓↓↓ ADD THIS, just below the .modalbtns inside #testResult ↓↓↓ -->
<p class="tiny" id="sheetStatus" style="margin-top:8px"></p>
```

Optional CSS (add anywhere in the `<style>` block) for a Google-styled button:

```css
.btn.google{background:#fff;border:1px solid #dadce0;color:#3c4043}
.btn.google:hover{border-color:#bdc1c6;background:#f8f9fa}
.btn.google:disabled{opacity:.6;cursor:default}
```

---

## 3. Client JS — insert just before the `/* boot */` section (before `buildTabs();`)

```js
/* ============================================================
   6b. SUBMIT TO CLASS GOOGLE SHEET (additive, internet only)
   ============================================================ */
const SHEET_SUBMIT = {
  url: 'https://script.google.com/macros/s/AKfycb.../exec', // your Web app /exec URL
  clientId: ''   // leave '' for Mode 1; set to 'xxxx.apps.googleusercontent.com' for Mode 2
};
let gsiToken = null;   // holds a Google OAuth access token after sign-in

function loadGsi(cb){
  if(!SHEET_SUBMIT.clientId || (window.google && google.accounts)) return cb();
  const s = document.createElement('script');
  s.src = 'https://accounts.google.com/gsi/client';
  s.async = s.defer = true; s.onload = cb;
  document.head.appendChild(s);
}
function googleSignInThenSubmit(){
  loadGsi(()=>{
    const st = $('sheetStatus');
    if(!(window.google && google.accounts && google.accounts.oauth2)){
      st.textContent = 'Could not load Google sign-in'; submitToSheet(); return;
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: SHEET_SUBMIT.clientId,
      scope: 'openid email profile',
      prompt: 'select_account',   // always show the Google account chooser
      callback: resp=>{ gsiToken = resp.access_token || ''; submitToSheet(); },
      error_callback: err=>{ st.textContent = 'Google sign-in cancelled' + (err && err.type ? ' (' + err.type + ')' : ''); }
    });
    client.requestAccessToken();
  });
}
function submitToSheet(){
  if(!test || test.score == null) return;
  const payload = {
    accessToken: gsiToken || '',
    name:     test.name,
    year:     yearLabel(test.yearIdx),
    date:     new Date().toISOString(),
    score:    test.score + '/10',
    responses: test.answers.map(a => LETTERS[a]),
    wrong:    test.wrong.map(i => 'Q' + (i+1)).join(', ')
  };
  const btn = $('sheetSubmit'), st = $('sheetStatus');
  btn.disabled = true; st.textContent = 'Submitting…';
  fetch(SHEET_SUBMIT.url, {
    method : 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain avoids a CORS preflight
    body   : JSON.stringify(payload)
  })
  .then(r => r.json())
  .then(res=>{
    if(res && res.ok){
      st.textContent = 'Saved to class sheet' + (res.email ? ' as ' + res.email : '');
      btn.textContent = 'Submitted ✓';
    } else {
      st.textContent = 'Could not save: ' + ((res && res.error) || 'unknown error');
      btn.disabled = false;
    }
  })
  .catch(()=>{
    st.textContent = 'Could not reach the sheet (offline?). CSV still works.';
    btn.disabled = false;
  });
}
// Wire the button (place with the other test/result events)
$('sheetSubmit').onclick = ()=> SHEET_SUBMIT.clientId ? googleSignInThenSubmit() : submitToSheet();

// OPTIONAL: sign in BEFORE the test starts instead of at the results screen.
// Point the "Start 10-question test" button at this instead of openTest:
function startTestFlow(){
  if(!SHEET_SUBMIT.clientId || gsiToken){ openTest(); return; }
  loadGsi(()=>{
    if(!(window.google && google.accounts && google.accounts.oauth2)){ openTest(); return; }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: SHEET_SUBMIT.clientId,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: resp=>{ gsiToken = resp.access_token || ''; openTest(); },
      error_callback: err=>{ toast('Google sign-in cancelled' + (err && err.type ? ' (' + err.type + ')' : '')); }
    });
    client.requestAccessToken();
  });
}
$('startTestBtn').onclick = startTestFlow;
```

> **Note:** the shipped `index.html` uses this start-of-test flow. `gsiToken` is
> captured once at the start, so the results-screen button submits directly without
> asking again.

The payload's `responses` are the option letters in Q1→Q10 order (e.g.
`D,B,A,A,C,B,D,B,B,B`), matching the sheet's columns.

---

## 4. Deployment (5 minutes)

1. Create the spreadsheet, copy its **ID** from the URL (`.../d/<ID>/edit`).
2. In the sheet: **Extensions → Apps Script**, paste `Code.gs`, set `SHEET_ID`.
3. **Deploy → New deployment → Web app**:
   - *Execute as:* **Me** (the teacher)
   - *Who has access:* **Anyone with Google account** (or **Anyone within [your domain]**
     to lock it to the school)
4. Authorise when prompted; copy the **`/exec`** URL into `SHEET_SUBMIT.url`.
5. *(Mode 2 only)* Create an OAuth client, add your Pages origin to
   **Authorised JavaScript origins**, paste the client ID into
   `SHEET_SUBMIT.clientId` **and** `CLIENT_ID` in the script.
6. Hard-refresh the quiz, sit a test, and click the button.

After editing `Code.gs` later, use **Manage deployments → edit → New version**, or
changes won't go live.

---

## Notes / caveats

- **Identity:** in Mode 1, `Session.getActiveUser().getEmail()` returns the student's
  email only when the script owner and students are in the **same Workspace domain**,
  and the deployment is *Execute as: Me*. Mode 2 works for any Google account and is
  tamper-resistant because the script verifies the ID token server-side.
- **Access control:** *Anyone with Google account* means anyone holding the URL can
  post (their email is still recorded). Use *Anyone within domain* to restrict it.
- **CORS:** sending `Content-Type: text/plain` keeps it a "simple" request so no
  preflight is needed; Apps Script `/exec` returns readable JSON. If you ever get an
  opaque response, switch to `mode:'no-cors'` and treat "sent" as success.
- **Privacy:** rows contain student name + email in a teacher-owned sheet — fine for
  classroom use, but check your school's policy for minors.
- **Constraint:** this needs internet, which is why the existing CSV path remains the
  offline fallback. The button simply reports a failure if the sheet is unreachable.
