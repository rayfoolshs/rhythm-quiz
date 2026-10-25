/************************  CONFIG  ************************/
const SHEET_ID   = '1J3nfQiID9LS0f2seNd1YsulmA5Mqum-mV1pMrl1azlE';   // your spreadsheet
const SHEET_NAME = 'Results';
const CLIENT_ID  = '277062244479-7sdej9i2ands0rvs79q6g70kgjbflh52.apps.googleusercontent.com';

// --- Domain restriction (security hardening) -------------------------------
// ''            = any *authenticated* Google account may submit.
// 'school.edu'  = only accounts on that Google Workspace domain.
//
// NOTE: only set this if your students sign in with SCHOOL Workspace accounts.
// Session.getActiveUser().getEmail() returns '' for consumer (gmail.com)
// accounts on an "Anyone with Google account" deployment, so enabling this
// while students use personal Gmail will reject every submission.
// If students report "Only @… accounts may submit", set this back to ''.
const ALLOWED_DOMAIN = 'lakelandshs.wa.edu.au';

const HEADERS = ['Timestamp','Email','Name','Year','Score',
                 'Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8','Q9','Q10','Wrong'];

/**********************  HELPERS  *************************/
// Mode 2: verify a Google OAuth access token the browser sent us.
// Checks the token is live, verified, and (when CLIENT_ID is set) was issued
// to *this* application — otherwise a token minted for any other app would be
// accepted here.
function emailFromAccessToken(accessToken){
  if(!accessToken) return null;
  const res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(accessToken),
    { muteHttpExceptions: true });
  if(res.getResponseCode() !== 200) return null;
  const info = JSON.parse(res.getContentText());

  if(info.email_verified !== true && info.email_verified !== 'true') return null;
  if(Number(info.expires_in) <= 0) return null;                    // expired
  if(CLIENT_ID && info.aud !== CLIENT_ID) return null;             // wrong audience

  return info.email || null;
}

// Resolve and authorise the caller's identity. Returns {email} or {error}.
function identity_(d){
  let email = emailFromAccessToken(d && d.accessToken);
  if(!email){
    try { email = Session.getActiveUser().getEmail(); } catch(err){ email = ''; }
  }
  if(!email) return { error: 'Sign in with Google to submit.' };

  if(ALLOWED_DOMAIN &&
     email.toLowerCase().slice(-(ALLOWED_DOMAIN.length + 1)) !== '@' + ALLOWED_DOMAIN.toLowerCase()){
    return { error: 'Only @' + ALLOWED_DOMAIN + ' accounts may submit.' };
  }
  return { email: email };
}

/*********************  INPUT SANITIZATION  *********************/
// Blocks spreadsheet formula injection (leading = + - @), collapses control
// characters, and caps length.
function sanitizeInput(input){
  if(input === null || input === undefined) return '';
  let str = String(input).trim();
  if(str === '') return '';
  if(/^[=+\-@]/.test(str)) str = "'" + str;      // leading ' forces text in Sheets
  str = str.replace(/[\t\r\n]+/g, ' ');
  return str.substring(0, 100);
}

// Reject rather than store strings that look like deliberate formula attacks.
function looksLikeFormulaAttempt(str){
  return /HYPERLINK|IMPORTXML|IMPORTHTML|IMPORTDATA|IMPORTFEED|IMPORTRANGE|WEBSERVICE|GOOGLETRANSLATE/i
    .test(String(str || ''));
}

function cleanName_(value){
  if(looksLikeFormulaAttempt(value)) return null;
  return sanitizeInput(value);
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

function buildRow_(email, name, year, score, responses, wrong){
  const row = [
    new Date(),                 // server timestamp
    email,
    name,
    year,
    sanitizeInput(score)
  ].concat(
    (responses || []).slice(0, 10).map(function(x){ return sanitizeInput(x).substring(0, 4); }),
    [ sanitizeInput(wrong) ]
  );
  while(row.length < HEADERS.length) row.push('');   // pad to table width
  return row.slice(0, HEADERS.length);
}

/************************  POST  **************************/
function doPost(e){
  try{
    if(!e || !e.postData || !e.postData.contents) throw new Error('empty body');
    const d = JSON.parse(e.postData.contents);

    const id = identity_(d);
    if(id.error) return json_({ ok:false, error:id.error });

    const name = cleanName_(d.name);
    const year = cleanName_(d.year);
    if(name === null || year === null){
      return json_({ ok:false, error:'Invalid characters in name or year.' });
    }

    getSheet_().appendRow(buildRow_(id.email, name, year, d.score, d.responses, d.wrong));
    return json_({ ok:true, email:id.email });
  }catch(err){
    return json_({ ok:false, error:String(err) });
  }
}

/************************  GET  ***************************/
// Health check, OR a submit via top-level navigation (works with restricted
// deployments, since the browser sends the signed-in Google session cookies).
// ===== GOOGLE LOGIN SECURITY NOTE ==========================================
// This branch is authenticated ONLY by the Google session cookie, and it
// accepts its whole payload from the query string. Consequences:
//   1. The "Sign in with Google" access token is not used here at all.
//   2. A crafted link to ?action=submit&... clicked by a signed-in student
//      inserts a row (cross-site request forgery).
//   3. Name/score end up in browser history and in Google's request logs.
// Mitigations applied: same identity() and sanitisation rules as POST, plus
// strict 10-field limits. If you can live without offline-safe fallback,
// delete this branch and rely on doPost() only.
// ==========================================================================
function doGet(e){
  const p = (e && e.parameter) ? e.parameter : {};
  if(p.action === 'submit'){
    try{
      const id = identity_(p);
      if(id.error){
        return HtmlService.createHtmlOutput(
          '<html><body style="font:16px/1.5 system-ui,sans-serif;padding:28px">' +
          '<b>Not saved</b><br>' + id.error +
          '</body></html>');
      }

      const name = cleanName_(p.name);
      if(name === null){
        return HtmlService.createHtmlOutput(
          '<html><body style="font:16px/1.5 system-ui,sans-serif;padding:28px">' +
          '<b>Not saved</b><br>Invalid characters in name.' +
          '</body></html>');
      }

      const responses = String(p.responses || '').split(',')
        .filter(function(x){ return x !== ''; })
        .slice(0, 10)
        .map(function(x){ return sanitizeInput(x).substring(0, 4); });

      getSheet_().appendRow(buildRow_(id.email, name, cleanName_(p.year), p.score, responses, p.wrong));

      return HtmlService.createHtmlOutput(
        '<html><body style="font:16px/1.5 system-ui,sans-serif;padding:28px">' +
        '<b>Saved to the class sheet ✓</b><br>Submitted as: ' + id.email +
        '<br>You can close this tab.' +
        '</body><script>setTimeout(function(){window.close();},900);</script></html>');
    }catch(err){
      return HtmlService.createHtmlOutput(
        '<html><body style="font:16px/1.5 system-ui,sans-serif;padding:28px">' +
        'Error: ' + err + '</body></html>');
    }
  }
  return json_({ ok:true, service:'rhythm-quiz-append' });
}
