# Security Review & Remediation — Rhythm Quiz

**Site:** https://rayfoolshs.github.io/rhythm-quiz/
**Repo:** https://github.com/rayfoolshs/rhythm-quiz
**Reviewed:** 25 October 2026
**Status:** 🟢 Front end deployed and live (`v1.5.1`) — `Code.gs` still needs a manual redeploy in the Apps Script editor (§8)

---

## 1. Executive summary

| # | Finding | Severity | Status |
| --- | --- | --- | --- |
| S1 | Spreadsheet formula (CSV) injection via name/year | 🔴 Critical | ✅ **Fixed server-side** (`sanitizeInput`, `cleanName_`); the typed-name field no longer exists |
| S2 | Google Sheet publicly readable/writable | 🔴 Critical | ✅ **Already mitigated** — verified 401 |
| S3 | No identity required to write rows | 🔴 Critical | ✅ **Already mitigated by Google**; hardened further |
| S4 | No rate limiting | 🟠 High | ⬜ Open |
| S5 | No CAPTCHA / bot mitigation | 🟠 High | ⬜ Open |
| S6 | Sign-in enforcement lives only in the browser | 🟠 High | ✅ Client guard added; server already enforced |
| S7 | Student names in `localStorage` in clear text | 🟡 Medium | ⬜ Open (mitigations documented) |
| S8 | Site is indexable | 🟡 Medium | ✅ **Fixed** — `noindex` meta on both HTML files |
| S9 | No CSP / security headers | 🟡 Medium | ⬜ Open |
| S10 | Source is readable | 🔵 Low | Accepted (not a control) |
| **L1** | **Google access token carried over between students** | 🔴 Critical | ✅ **Fixed in code** |
| **L2** | **OAuth token audience never validated** | 🟠 High | ✅ **Fixed in code** |
| **L3** | **`?action=submit` GET path is CSRF-able and bypasses OAuth** | 🟡 Medium | ⚠️ Documented, open |
| **L4** | Student name/score placed in URL query string | 🟡 Medium | ⚠️ Documented, open |
| **L9** | **Access token sent as a query parameter on the profile-lookup retry** | 🟡 Medium | ⚠️ Accepted, documented (§4.2) |

> **Deployment state (26 Oct 2026).** The front end is live and matches release `v1.5.1`: the Pages workflow run for that code succeeded (`b6a970a`, run `40300584655`; build and deploy both green), and the served `index.html` is byte-identical to the committed `rhythm-quiz-package/index.html` (compared with LF-normalised SHA-256, since the Windows checkout stores CRLF). `Code.gs` is **not** deployed by the Pages workflow — it must still be pasted into the Apps Script editor and **redeployed as a new version** (§8), then confirmed with one real row.

---

## 2. Verification of the original report

The feedback contained several accurate findings and two that do not hold against the live deployment. Measured, not assumed:

| Claim | Verdict | Evidence |
| --- | --- | --- |
| "Your Google Sheet is a completely public link" | ❌ **Not reproducible** | `GET /spreadsheets/d/1J3nf…/export?format=csv` → **401**; `/edit` → **401** anonymously |
| "Anyone who finds the URL can submit arbitrary rows" | ❌ **Not anonymously** | `POST` to the `/exec` URL without a Google session → **401**; `GET` → **302** to `accounts.google.com` |
| "No rate limiting, CAPTCHA or shared secret" | ✅ True | `Code.gs` had none |
| "Student names kept in localStorage" | ✅ True | `REC_KEY = 'rq_results_v1'`, plain JSON |
| "Google emails recorded; data leakage / MITM" | ⚠️ Partly | Emails are recorded by design; traffic is HTTPS-only, so MITM is not a realistic vector. The real exposure was token handling and client-side data |
| "Google sign-in optional and not mandatory" | ⚠️ Partly | Google itself required a session to reach the script; the *app* never enforced identity or domain |
| "Anyone can override the sign-in button in page source" | ⚠️ Partly | Editing the DOM grants no write access — Google's layer still answers 401 — but a signed-in student can still forge *score* fields |
| "`=` in a name injects a formula" | ✅ **True** | `Code.gs:48` wrote raw `String(d.name)` into the sheet |

**Practical reading:** the sheet was never world-readable, but anyone **with any Google account** could append rows, and the formula-injection path was real.

---

## 3. What was changed (this pass)

### 3.1 `Code.gs`

| Change | Detail |
| --- | --- |
| `sanitizeInput()` | Trims, prefixes `'` on leading `= + - @`, collapses tabs/newlines, caps at 100 chars |
| `looksLikeFormulaAttempt()` | Rejects `HYPERLINK`, `IMPORTXML`, `IMPORTHTML`, `IMPORTDATA`, `IMPORTFEED`, `IMPORTRANGE`, `WEBSERVICE`, `GOOGLETRANSLATE` anywhere in name/year |
| `cleanName_()` | Reject-or-sanitise helper used by both handlers |
| `identity_()` | Single auth path for POST **and** GET: verified token → session email → reject |
| `emailFromAccessToken()` | Switched to `oauth2.googleapis.com/tokeninfo`; now checks `email_verified`, `expires_in > 0`, and **`aud === CLIENT_ID`** |
| `ALLOWED_DOMAIN` | Domain restriction — currently set to `lakelandshs.wa.edu.au` (see §5) |
| `buildRow_()` | Caps responses to 10, trims each to 4 chars, pads to `HEADERS.length` |
| `doGet()` | Applies the same identity + sanitisation rules; documents the CSRF caveat |

### 3.2 `rhythm-quiz-package/index.html` and `rhythm-quiz-standalone.html`

| Change | Detail |
| --- | --- |
| `resolveProfile()` | Reads `{name,email}` from `oauth2/v3/userinfo` after sign-in (Bearer header, then query-string fallback — see L9), so the student never types a name |
| `openTest()` | Sets `test.name` from the signed-in account; the page has no name field at all |
| `beginTest()` | Refuses to start without an account name — online sign-in is required |
| `closeTest()` | Clears `gsiToken` **and** `gsiProfile` — **fixes L1** |
| `exitTest()` | Single results action: waits for any in-flight submit, signs in again if the token expired, then closes |
| `submitToSheet()` | Refuses to submit when a client ID is configured but no token is held |

Both files carry identical logic; only the bundled VexFlow differs (external vs inline).

---

## 4. Google sign-in security review

### 4.1 Live OAuth configuration (observed)

Opening *Start 10-question test* issues a real GIS token request. Decoded from the Google popup URL:

| Parameter | Value | Assessment |
| --- | --- | --- |
| `client_id` | `277062244479-…apps.googleusercontent.com` | Public by design for a browser client ✅ |
| `origin` | `https://rayfoolshs.github.io` | Registered — Google served the account chooser, not `origin_mismatch` ✅ |
| `scope` | `openid email profile` | Minimal; no Drive/Sheets/Gmail scopes ✅ |
| `response_type` | `token` | Implicit token model — no PKCE, no refresh token, ~1 h lifetime ✅ acceptable here |
| `prompt` | `select_account` | Forces the chooser; good for shared devices ✅ |
| `include_granted_scopes` | `true` | Harmless for these scopes ✅ |
| App name | "Rhythm Quiz Google" | Shown on consent ✅ |
| Client secret in page | none | Correct for a public spa client ✅ |

### 4.2 Findings and dispositions

**L1 — Token carried over between students (Critical, fixed).**
`startTestFlow()` short-circuited when `gsiToken` was already set, and `closeTest()` never cleared it. On a shared classroom PC, student B would answer the test and have the row attributed to student A's Google email. `closeTest()` now nulls the token, forcing the account chooser for the next student.

**L2 — Audience not validated (High, fixed).**
`emailFromAccessToken()` called `/oauth2/v3/userinfo`, which proves *who* the token belongs to but not *which app* it was issued to. Any Google access token bearing the `email` scope — including one minted for an unrelated client — would be accepted. Now validated via `tokeninfo` (`aud`, `email_verified`, `expires_in`).

**L3 — GET submit path is CSRF-able and bypasses OAuth (Medium, open).**
The endpoint answers `401` to a cookie-less `POST`, so in practice writes go through `doGet(?action=submit)` via top-level navigation, authenticated only by the Google session cookie. Consequences:

- The OAuth token is **not used at all** on the path that actually writes rows.
- A crafted link (`…/exec?action=submit&name=…&score=10/10`) clicked by a signed-in student inserts a row under that student's email.
- Rate limiting (S4) is the practical mitigation; a per-session nonce would close it properly.

**L4 — Payload in the URL (Medium, open).** Names and scores land in browser history, bookmarks and Google's request logs. Moving to a form POST or keeping POST-only would remove this.

**L5 — XSS could steal the token (Low, accepted).** `gsiToken` lives in a page variable. Its scope is only `email profile`, so theft yields identity assertion, not sheet access. A CSP (S9) is the mitigation.

**L6 — Consent-screen publishing status (verify).** If the OAuth app is still in **Testing**, only listed test users can sign in and students will hit *"Access blocked"*. Confirm **APIs & Services → OAuth consent screen → Publishing status: In production** before a class sits the quiz.

**L7 — Authorised origins (verify).** Confirm the client lists **only** `https://rayfoolshs.github.io` — no `localhost` leftovers and no wildcard.

**L8 — Score trustworthiness (out of scope).** Questions and answer keys are generated in the browser, so a signed-in student can forge a score in the request body. Server-side grading would be required to prevent this; see §9.

**L9 — Profile-lookup fallback puts the token in a URL (Medium, accepted).** `resolveProfile()` asks `oauth2/v3/userinfo` with an `Authorization: Bearer` header first. If that request fails — typically a deployment that blocks the CORS preflight — it repeats the GET with `?access_token=…`, which is a "simple" request and therefore needs no preflight. The token then appears in devtools, in any intermediary proxy log, and in Google's request logs. Accepted because the token carries only `openid email profile`, lives about an hour, is held in a page variable and never persisted, and dropping the fallback would block the test outright for affected deployments. If the header form works, the query-string form never runs.

---

## 5. Domain restriction (currently enabled)

`Code.gs` now has:

```javascript
const ALLOWED_DOMAIN = 'lakelandshs.wa.edu.au';   // '' = any authenticated Google account
```

Writes are accepted only from verified `@lakelandshs.wa.edu.au` Google Workspace accounts. Matching is an exact suffix on `@` + domain, so `@lakelandshs.wa.edu.au.evil.com` and `@sub.lakelandshs.wa.edu.au` are both rejected.

⚠️ **Test before a class sits the quiz.** On an *Anyone with Google account* deployment, `Session.getActiveUser().getEmail()` returns an **empty string for consumer (gmail.com) accounts**, and the browser path that actually writes rows relies on that session. If your students sign in with personal Google accounts rather than school Workspace accounts, every submission will be refused with *"Only @lakelandshs.wa.edu.au accounts may submit."* In that case set the constant back to `''` and redeploy.

Verification, in order:

1. Sign in with a school account → submit a test result → row appears with the school email.
2. Sign in with a personal Gmail account → submission is refused with the domain message.
3. If step 1 fails, the session identity is unavailable: revert to `''`.

---

## 6. Test results

### 6.1 Server logic (`Code.gs`, run under Node with Apps Script stubs)

```
PASS  plain name untouched                    "Jane Smith"
PASS  =1+1 prefixed                           "'=1+1"
PASS  +HYPERLINK prefixed                     "'+HYPERLINK(...)"
PASS  -5 prefixed                             "'-5"
PASS  @SUM prefixed                           "'@SUM(A1:A10)"
PASS  mid-string = kept                       "Jane=Doe"
PASS  leading spaces then =                   "'=cmd"
PASS  tab and newline collapsed               "A B C"
PASS  length capped at 100
PASS  formula attempt detected / clean not flagged
PASS  valid school token accepted              kid@lakelandshs.wa.edu.au
PASS  wrong audience rejected
PASS  expired token rejected
PASS  unverified email rejected
PASS  invalid token rejected
PASS  no session + no token rejected
PASS  session fallback accepted
PASS  personal gmail rejected by default       "Only @lakelandshs.wa.edu.au accounts may submit."
PASS  suffix-spoof rejected                    kid@lakelandshs.wa.edu.au.evil.com
PASS  subdomain rejected                       kid@sub.lakelandshs.wa.edu.au
PASS  case-insensitive accept
PASS  restriction disabled accepts any account
PASS  injection rejected, nothing written (0 rows)
PASS  =1+1 accepted and stored as text
PASS  gmail doPost rejected, no row
PASS  row padded to 16 columns, responses capped at 10
PASS  GET path sanitises name and records school email
PASS  GET path rejects foreign domain
ALL 38 ASSERTIONS PASSED
```

### 6.2 Client-side name handling (both HTML files)

The `validateStudentName()` input validator has been **removed**: there is no name
field any more. The name now comes from the signed-in Google account via
`resolveProfile()` (`oauth2/v3/userinfo`), so the client never constructs it from
user input. Formula-injection defence therefore rests entirely on the server's
`sanitizeInput()` / `cleanName_()`, which remains the real control.

```
PASS  signed in: name taken from account
PASS  signed in: Begin enabled, no retry button
PASS  online without a profile: Begin disabled, retry offered, no row possible
PASS  file://: test runs, rows marked (offline), CSV only
PASS  no sheet configured: test runs, CSV only
PASS  closeTest() clears token + profile + test
PASS  no studentName input and no validateStudentName left in either file
```

Both HTML files parse cleanly (`new Function()` over every inline script block), and
token clearing, the sign-in gate and the submit guard are present in both.

### 6.3 Live probes (read-only; no test rows written)

| Probe | Result |
| --- | --- |
| Sheet CSV export, anonymous | `401` |
| Sheet edit page, anonymous | `401` |
| `/exec` GET, anonymous | `302 → accounts.google.com` |
| `/exec` POST, anonymous | `401` |
| GIS popup from the live page | Account chooser rendered for origin `rayfoolshs.github.io` |

---

## 7. Remaining work

### S4 — Rate limiting (High)

Not yet implemented. Minimal version, using Apps Script's cache:

```javascript
const RATE_LIMIT = { perHour: 5, perDay: 20 };

function checkRateLimit_(email){
  const cache = CacheService.getScriptCache();
  const hourKey = 'rl:h:' + email, dayKey = 'rl:d:' + email;
  const hour = Number(cache.get(hourKey) || 0);
  const day  = Number(cache.get(dayKey)  || 0);
  if (hour >= RATE_LIMIT.perHour) return 'Too many submissions this hour.';
  if (day  >= RATE_LIMIT.perDay)  return 'Daily submission limit reached.';
  cache.put(hourKey, String(hour + 1), 3600);
  cache.put(dayKey,  String(day  + 1), 86400);
  return null;
}
```

Call it after `identity_()` in both handlers. A sheet-scanning variant is available if per-day limits must survive cache eviction.

### S5 — reCAPTCHA v3 (High)

Create keys for `rayfoolshs.github.io`, add the script tag, send `recaptchaToken` alongside `accessToken`, and verify with `https://www.google.com/recaptcha/api/siteverify` (score ≥ 0.5). The **secret** stays only in `Code.gs` — the Pages workflow ships `index.html` alone, so the site key must be inlined there.

### S7 — `localStorage` minimisation (Medium)

Store initials instead of full names; keep the authoritative record in the Sheet. Do **not** bother with in-page "encryption" — a key shipped in the page is obfuscation, not protection. Clear the local list after a successful submission.

### S8 — Indexing (Medium) — fixed

Both HTML files now carry:

```html
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="googlebot" content="noindex, nofollow, noarchive">
```

The standalone file is generated from `index.html`, so it inherits the tags.

**Why not `robots.txt`:** crawlers only read `/robots.txt` at the host root
(`https://rayfoolshs.github.io/robots.txt`), not in a project subdirectory. A file at
`/rhythm-quiz/robots.txt` would be published but ignored, so the meta tag is the
control that actually applies. (`noindex` in a directory-level robots.txt is also
ignored by Google, so there is nothing to gain there either.)

**Still to do by hand:** if the site was crawled before this change, request removal
in **Google Search Console → Removals** for `https://rayfoolshs.github.io/rhythm-quiz/`.
The `noindex` tag keeps it out once recrawled, but removal is immediate.

### S9 — CSP (Medium)

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://accounts.google.com https://www.gstatic.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'self' https://script.google.com https://oauth2.googleapis.com https://www.googleapis.com https://accounts.google.com;
  frame-src https://accounts.google.com;
  base-uri 'none'; object-src 'none'; form-action 'none';">
```

Verify sign-in, notation rendering and submission afterwards. GitHub Pages cannot send real headers, so `frame-ancestors` is not enforceable here.

### Housekeeping

- No zip is committed, and none is attached to releases: the withdrawn `rhythm-quiz-package.zip` assets were removed from `v1.3.0`, `v1.3.1` and `v1.4.0`. The name stays in `.gitignore` so a locally made archive is never committed. To share the package by email, zip the folder yourself (`git archive --format=zip -o rhythm-quiz-package.zip HEAD rhythm-quiz-package` or `Compress-Archive rhythm-quiz-package rhythm-quiz-package.zip`).
- No `favicon.ico` (404 on every visit) — cosmetic.

---

## 8. Deployment

### Apps Script

1. Sheet → **Extensions → Apps Script**.
2. Replace the editor contents with this repo's `Code.gs`.
3. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy.**
   *Editing the file without a new version leaves the old code live.*
4. Keep the same `/exec` URL — `SHEET_SUBMIT.url` in `index.html` stays valid.
5. Verify: submit one real result; confirm the row appears and the email is the signed-in account.

> The Pages workflow never deploys `Code.gs`. It is a copy that must be pasted manually.

### Front end

```bash
git add -A
git commit -m "…"
git push origin HEAD:main      # Pages builds and deploys on push to main
```

Verify the deployed file is the one you just committed:

```bash
# A Windows checkout stores CRLF while Pages serves LF, so normalise line endings
# before comparing - a plain diff reports every line as different.
curl -s https://rayfoolshs.github.io/rhythm-quiz/ | tr -d '\r' | diff - <(tr -d '\r' < rhythm-quiz-package/index.html) && echo "live == committed"
gh run list -R rayfoolshs/rhythm-quiz -L 1
```

When the front end changes, tag a release. **Bump the version in two places first** — the header badge
in `rhythm-quiz-package/index.html` (and its `rhythm-quiz-standalone.html` copy) — then tag, so the
badge never disagrees with the tag:

```bash
# 1. bump <span class="ver">vX.Y.Z</span> in both HTML files, commit and push
# 2. tag and release (no zip asset: none is shipped)
git tag -a vX.Y.Z -m "vX.Y.Z: ..." && git push origin vX.Y.Z
gh release create vX.Y.Z --title "vX.Y.Z - ..." --notes-file notes.md
```

Semver in use so far: minor (`v1.3.0`, `v1.4.0`) for features, patch (`v1.3.1`) for fixes.

**Rollback:** keep the previous `Code.gs`; redeploy it as a new version. The `/exec` URL does not change. For the front end, revert the commit on `main`; Pages redeploys automatically.

---

## 9. Residual risks

- **Score integrity.** The answer key is generated client-side; a signed-in student can forge a score. Closing this requires server-side question delivery and grading.
- **GET CSRF (L3)** lets a signed-in student insert one bogus row via a crafted link. Rate limiting is the pragmatic mitigation.
- **Shared-device hygiene.** Token clearing reduces, but does not eliminate, cross-student attribution; students should sign out of Google in the browser.
- **Token in a URL on the lookup retry (L9).** The fallback that survives a blocked CORS preflight exposes a short-lived, email-scope token in the query string. It is never persisted, but it is visible to devtools and any proxy log.
- **Quota.** Apps Script limits are generous but finite; there is no DDoS protection beyond Google's own.
- **No audit trail.** A Sheet is not a records system — no retention policy, no per-row access log, no leaver workflow.

---

## 10. References

- OWASP — CSV Injection: https://owasp.org/www-community/attacks/CSV_Injection
- OWASP Top 10 (2021) — A01 Broken Access Control, A03 Injection, A04 Insecure Design, A07 Auth Failures
- Google Identity Services — token model: https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Google token info endpoint: https://cloud.google.com/apigee/docs/api-platform/reference/policies/oauthv2-policy#tokeninfo
- Apps Script web apps: https://developers.google.com/apps-script/guides/web
- reCAPTCHA v3: https://developers.google.com/recaptcha/docs/v3
