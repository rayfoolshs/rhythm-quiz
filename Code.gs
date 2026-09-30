/************************  CONFIG  ************************/
const SHEET_ID   = '1J3nfQiID9LS0f2seNd1YsulmA5Mqum-mV1pMrl1azlE';   // your spreadsheet
const SHEET_NAME = 'Results';
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
// Health check, OR a submit via top-level navigation (works with restricted
// deployments, since the browser sends the signed-in Google session cookies).
function doGet(e){
  const p = (e && e.parameter) ? e.parameter : {};
  if(p.action === 'submit'){
    try{
      const responses = String(p.responses || '').split(',').filter(function(x){ return x !== ''; });
      const row = [new Date(), Session.getActiveUser().getEmail() || '(not signed in)',
                   String(p.name || ''), String(p.year || ''), String(p.score || '')]
                   .concat(responses, [ String(p.wrong || '') ]);
      while(row.length < HEADERS.length) row.push('');   // pad to table width
      getSheet_().appendRow(row.slice(0, HEADERS.length));
      return HtmlService.createHtmlOutput(
        '<html><body style="font:16px/1.5 system-ui,sans-serif;padding:28px">' +
        '<b>Saved to the class sheet ✓</b><br>You can close this tab.' +
        '</body><script>setTimeout(function(){window.close();},900);</script></html>');
    }catch(err){
      return HtmlService.createHtmlOutput(
        '<html><body style="font:16px/1.5 system-ui,sans-serif;padding:28px">' +
        'Error: ' + err + '</body></html>');
    }
  }
  return json_({ ok:true, service:'rhythm-quiz-append' });
}
