# Safe Changes Guide: live data ko bina chhede naye features kaise daalein

Ye guide teen cheezon ke liye hai:
- naya **Owner Monthly Report** (sirf data padhta hai)
- **Excel/CSV Import** (data likhta hai, isliye sabse zyada dhyan chahiye)
- backup/restore scripts

Basic rule: **code ka backup Git mein, data ka backup `npm run backup` se, aur pehle testing staging pe, live pe baad mein.**

---

## Phase 0: Kuch bhi badalne se pehle (10 min)

**0.1 Live code ka "restore point" banao**
```bash
cd Ashirvad-GH-Rest-main
git checkout main
git pull
git tag v1-before-owner-report        # purana version yahi tag hai
git push origin v1-before-owner-report
```

**0.2 Live database ka full backup lo**
```bash
cd server
npm install
npm run backup
```
Ye `server/backups/<dbname>_<date>/` folder banayega. Is folder ko zip karke Google Drive / pen drive pe bhi rakho (laptop kharab ho jaye to bhi safe rahe).

> MongoDB Atlas use kar rahe ho to: Atlas → Cluster → Backup → "Take snapshot now" bhi kar lo (paid tier pe). Ye extra safety hai.

**0.3 Backup check karo:** `manifest.json` kholo, har collection ka count dekho (entries, restentries, officebooks...). Count 0 nahi hona chahiye.

---

## Phase 1: Alag branch pe kaam (code safety)

```bash
git checkout -b feature/owner-report-import
```
Zip ki files project root pe extract karo (same folder structure). Phir:
```bash
git add .
git commit -m "Owner monthly report, Excel/CSV import, backup/restore scripts"
git push origin feature/owner-report-import
```
`main` branch abhi bhi purana hi hai, isliye live site pe koi asar nahi hai.

---

## Phase 2: Staging database (data safety)

Testing kabhi live DB pe nahi karni. Ek alag copy banao:

1. MongoDB Atlas → same cluster mein naya database naam use karo, ya ek free M0 cluster banao.
   Staging URI example: `mongodb+srv://user:pass@cluster.mongodb.net/ashirvad_staging`
2. Live backup ko staging mein daalo:
   ```bash
   cd server
   npm run restore -- --from backups/<live-backup-folder> --to "<STAGING_URI>"
   # "RESTORE" type karke confirm karo
   ```
   Script live URI pe bina `--yes-production` ke chalti hi nahi, isliye galti ka darr nahi hai.
3. Local `.env` mein temporarily `DB_URL=<STAGING_URI>` kar do.

---

## Phase 3: Local testing

```bash
# Terminal 1
cd server && npm run dev
# Terminal 2 (project root)
npm install && npm start
```
`.env` (frontend) mein `VITE_REACT_APP_SERVER_URL=http://localhost:8080/api/v1` hona chahiye.

**Checklist:**
- [ ] Admin login → Dashboard → **Owner Monthly Report** khulta hai
- [ ] Mahina badalne pe numbers aate hain. Kisi ek mahine ka GH total purane "GH - Sales Report" se match karo
- [ ] Restaurant total "Rest - Sales" se match kare
- [ ] Print / PDF aur Excel download kaam kare
- [ ] **Import**: sample CSV upload → galat row lal dikhe → "Check with server" → Import
- [ ] Import ke baad `/hotel` page pe us date ki entry dikhe
- [ ] Purane pages (entry, dashboards) pehle jaise chalein

Kuch galat dikhe to staging pe restore karke dobara test karo, live safe hai.

---

## Phase 4: Live pe daalna (deploy)

1. **Deploy se theek pehle** ek aur fresh live backup lo: `npm run backup` (`.env` wapas LIVE URI pe karke).
2. Branch ko main mein merge karo:
   ```bash
   git checkout main
   git merge feature/owner-report-import
   git tag v2-owner-report
   git push origin main --tags
   ```
3. Vercel frontend auto-deploy karega. Backend jahan host hai (Render/VPS) wahan redeploy karo.
4. Live pe sirf Owner Report kholke dekho. Ye read-only hai, isse data badalta nahi.
5. **Import ko live pe pehli baar**: ek chhoti file (2–3 rows) se karo, "Check with server" ke baad. Phir bade import se pehle `npm run backup`.

---

## Phase 5: Kuch gadbad ho jaye to wapas kaise jaayein (rollback)

**A) Sirf code purana chahiye (data theek hai)**
```bash
git checkout main
git revert -m 1 <merge-commit-id>     # ya
git reset --hard v1-before-owner-report && git push --force origin main
```
Vercel → Deployments → purana deployment → "Promote to Production" (1 click, sabse fast).

**B) Import se galat data aa gaya**
```bash
cd server
# poora DB deploy-se-pehle wale backup pe:
npm run restore -- --from backups/<pre-deploy-folder> --to "<LIVE_URI>" --yes-production
# ya sirf ek collection (jaise guest house entries):
npm run restore -- --from backups/<folder> --to "<LIVE_URI>" --only entries --yes-production
```
Restore se pehle script khud ek `pre-restore` backup leti hai, isliye restore bhi undo ho sakta hai.

⚠️ Restore karne pe backup ke **baad** ki nayi entries us collection se hat jaayengi. Isliye backup bade import ke **theek pehle** lena hai, aur restore karne se pehle staff se pooch lo ki beech mein koi entry toh nahi hui.

---

## Hamesha ki aadat

- Har bade import / deploy se pehle: `npm run backup`
- Har hafte ek backup Drive pe
- `backups/` folder Git mein nahi jaata (`.gitignore` mein hai), kyunki usme customer data hai
- Live DB ka URI sirf server `.env` mein rakho, kisi ko share mat karo

---

# Update 2: Login lock + Automatic backup + WhatsApp reminders

## Kya badla
| Feature | Files |
|---|---|
| Har API pe login zaroori, DELETE sirf Admin/Super User, login/reset pe brute-force rok | `server/middleware/security.js` (naya), `server/middleware/auth.js`, `server/app.js` |
| User signup ke liye signup code | `server/controller/user.js`, `src/pages/SignupPage.jsx` |
| Frontend har request ke saath login cookie bheje | `src/main.jsx` (`axios.defaults.withCredentials = true`) |
| Roz raat 2 baje full backup email (saare collections, restore-ready) | `server/utils/autoBackup.js`, `server/model/backupLog.js`, `server/controller/backup.js` (naye), `server/server.js`, `server/controller/admin.js` |
| Home pe "Last backup" card + Backup now | `src/components/BackupStatusCard.jsx` (naya), `src/components/HomeDashboard.jsx` |
| Guest dues page + WhatsApp reminder | `src/components/owner/GuestDuesReminders.jsx` (naya), `server/controller/owner.js` (`GET /owner/dues`), `src/pages/DashboardPage.jsx`, Owner report dues table |

Koi naya npm package nahi chahiye.

## Server `.env` mein naye variables
```
USER_SIGNUP_CODE=koi-lamba-code        # staff signup ke liye; sirf owner ke paas
BACKUP_CRON_KEY=kam-se-kam-16-akshar-ka-random-secret
AUTO_BACKUP=on                         # band karna ho to off
BACKUP_HOUR_IST=2                      # raat kitne baje (India time)
```
Pehle se zaroori: `SMPT_HOST, SMPT_PORT, SMPT_SERVICE, SMPT_MAIL, SMPT_PASSWORD, SMPT_MAIL_RECEIVER` (backup isi email pe jaata hai).
`USER_SIGNUP_CODE` set nahi kiya to koi naya staff account nahi ban payega (jaan-boojh ke).

## Free hosting (server so jaata hai) ke liye
cron-job.org pe free account → roz 2:15 AM (Asia/Kolkata) ye URL:
```
https://<backend-url>/api/v1/backup/run-scheduled?key=<BACKUP_CRON_KEY>
```
6 ghante mein ek se zyada backup nahi banega, isliye dono (andar wala timer + cron-job) saath chal sakte hain.

## Test checklist (staging pe)
- [ ] Incognito window mein `https://<backend-url>/api/v1/room` kholo → "Please login" aana chahiye
- [ ] Staff login → entry save/edit chalta hai; din delete karne pe "Only admin can delete data"
- [ ] Admin login → saare dashboards pehle jaise chalte hain
- [ ] Signup bina code ke → error; sahi code se → account banta hai
- [ ] Login pe 11 baar galat password → "Too many attempts" (15 min baad phir chalega)
- [ ] Home → "Backup now" → email aaye, card hara ho jaaye
- [ ] Email ki backup.zip extract karke `npm run restore -- --from <folder> --to "<staging-uri>"` chal jaaye
- [ ] Dashboard → Guest Dues & Reminders → "Remind" WhatsApp kholta hai message ke saath

## Dhyan do
- Frontend aur backend alag domain pe hain, isliye cookie `sameSite: none; secure` pe chalti hai (pehle se set hai). `CLIENT_URL` env sahi hona chahiye warna login ke baad bhi 401 aayega.
- Purani `server/cron/monthlyBackup.js` ab use nahi hoti (wo kabhi chal hi nahi rahi thi); chaho to delete kar do.

---

# Update 3: PC + Mobile Entry system (/entry) + phone app (PWA)

## Kya bana
Naya page `/entry`: Guest House, Restaurant aur Office ki entry ek jagah. Phone pe neeche tabs, PC pe upar.
Purane pages (`/hotel`, `/restaurant`, `/office`) **waise hi hain**, kuch nahi hataya.

| Hissa | Files |
|---|---|
| Naya entry page | `src/pages/quick/` (QuickEntryPage, GhQuickEntry, RestQuickEntry, OfficeQuickEntry, shared) |
| Route + Home pe button | `src/App.jsx` (`/entry`), `src/pages/Home.jsx` |
| "Purana guest" + din ka status (read-only API) | `server/controller/quickEntry.js`, `server/app.js` (`/api/v1/quick`) |
| Kisne/kab entry bhari | `server/model/entry.js`, `restEntry.js`, `officeBook.js` (naye fields: enteredBy, enteredAt, updatedBy) + teeno controllers |
| Phone pe install (PWA) | `public/manifest.webmanifest`, `public/sw.js`, `public/icons/*`, `index.html`, `src/main.jsx` |

Koi naya npm package nahi.

## Data format
Naya page **wahi purane APIs** use karta hai aur bilkul wahi data bhejta hai:
- GH: `POST /entry/create-entry`, admin ke liye `PUT /entry/update-entry/:date` (staff ek baar submit karta hai, phir sirf admin; purane jaisa)
- Restaurant: `POST /restEntry/create-entry`, `PUT /restEntry/update-entry/:date`
- Office: `POST /officeBook/create-entry`, `PUT /officeBook/update-entry/:date`
GH admin edit mein reservation jaise dusre rows bhi bina chhede wapas bheje jaate hain.

## Raste mein theek ki gayi purani galtiyan
1. **Restaurant edit pe computer amount save nahi hota tha** (`restEntry.js` update mein field hi nahi tha).
2. **Restaurant aur Office mein ek din ki do entry ban sakti thi** (create pe check nahi tha). Ab 400 error: "pehle se hai, Edit karo".
3. **Office edit pe `entryCreateDate` khaali ho sakta tha** (client na bheje to ""), jisse wo din date-range reports se gayab ho jaata. Ab date se khud banta hai.

## Test checklist (staging pe, staff ke phone se)
- [ ] Staff login → Home pe "Nayi Entry (Mobile + PC)" → `/entry` khulta hai
- [ ] GH: rooms bharo → page refresh karo → data bacha rehta hai (draft) → Submit → purane `/hotel` page pe wahi entry dikhe
- [ ] GH: submit ke baad staff ke liye lock; admin login se edit + update
- [ ] GH Jama: pending guest → "Paisa aaya" → submit → wo guest pending list se hat jaaye
- [ ] Mobile number daalo jo pehle aaya ho → "Purana guest" box
- [ ] Restaurant: farak manfi ho to submit band; theek ho to submit → purane `/restaurant` page pe totals same
- [ ] Restaurant edit: computer amount badlo → save → reload pe naya amount dikhe
- [ ] Office: In/Out rows → submit → `/office` aur Office reports mein dikhe
- [ ] Ek hi din dobara submit (do phone se) → "pehle se hai" error aaye, duplicate na bane
- [ ] Owner dashboard / GH Sales / Rest Sales ke totals pehle jaise
- [ ] **Production build** pe phone Chrome → menu → "Add to Home screen" → icon se app khule
      (PWA sirf `npm run build` wale live/staging site pe chalta hai, `npm run dev` pe nahi; HTTPS zaroori)

## Rollback
Sirf naya page band karna ho: `src/App.jsx` se `/entry` route hata do. Purane pages par koi asar nahi.
Service worker hatana ho: `public/sw.js` ki jagah ye daal ke deploy karo:
`self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",()=>self.registration.unregister());`

---

# Update 4: Staff privacy (sirf apna business, sirf aaj)

## Niyam
- **Admin / Super User:** sab pehle jaisa.
- **Staff:** sirf apne department (GH / Restaurant / Office) ki, **sirf aaj ki** entry. Reports, dashboards, purani dates, dusra business: **server pe band** (link se seedha kholne pe bhi 403).
- Raat ki late entry: subah `STAFF_GRACE_HOURS` (default 3) baje tak "kal" ki entry bhi kar sakte hain. `0` karo to bilkul nahi.
- Staff ke liye Home page nahi. Login → seedha `/entry`. Purane `/hotel`, `/restaurant`, `/office`, `/staff-salary` → `/entry` pe bhej dete hain.
- Staff list mein dusre staff ki per-day salary ab staff ko nahi jaati.

## Files
| Kaam | File |
|---|---|
| Staff ke allowed raaste + aaj ki date ka check | `server/middleware/staffAccess.js` (naya), `server/middleware/security.js` |
| User mein department + chalu/band | `server/model/user.js` (`department`: none/gh/rest/office, `isActive`) |
| Owner: department set karna | `server/controller/staffAccounts.js` (naya, `/api/v1/staff-accounts`), `src/components/owner/StaffAccessDashboard.jsx`, `DashboardPage.jsx` ("Staff Access") |
| App ko permission batana | `server/controller/quickEntry.js` (`GET /quick/me`) |
| Salary chhupana | `server/controller/restStaff.js` |
| Staff ke liye Home/purane pages band | `src/routes/StaffGate.jsx` (naya), `src/App.jsx`, `src/pages/quick/QuickEntryPage.jsx` |

## ⚠️ Live karne se PEHLE zaroori
Purane saare staff accounts ka department **"none"** hoga, yani live hote hi wo kuch nahi bhar payenge.
**Isliye deploy ke turant baad:** Admin dashboard → **Staff Access** → har staff ka department chuno.
(Behtar: test copy pe pehle hi set kar lo, ya deploy subah karo jab entry kam ho.)

## Naya env (optional)
```
STAFF_GRACE_HOURS=3   # raat 12 ke baad kitne ghante tak kal ki entry allowed
```

## Test checklist
- [ ] GH staff login → seedha GH entry, sirf aaj ki date, koi date picker nahi, Restaurant/Office tab nahi
- [ ] GH staff browser mein `/dashboard`, `/hotel`, `/` kholo → wapas `/entry`
- [ ] GH staff ke login se API link `.../api/v1/entry/get-entries/01-09-2026/30-09-2026` → 403
- [ ] Restaurant staff → sirf Restaurant, aaj ka edit chalta hai
- [ ] Department "Koi access nahi" wala staff → "Owner se department set karwao" screen
- [ ] "Band" kiya staff → "account band hai" screen
- [ ] Admin → sab pehle jaisa (koi bhi date, saare reports)
- [ ] Super user staff → sab access (purane pages bhi)

Server rules ki jaanch (bina database) ke liye: 19 alag cases chalaye gaye, sab sahi (allowed/blocked) aaye.

---

# Update 5: Naya look (poore app ka theme, chhota menu, "Aaj ka hisaab", naya login)

## Kya badla
| Kaam | File |
|---|---|
| Poore app ka ek theme (Inter font, rang, buttons, tables, inputs, cards, DataGrid) | `src/theme.js` (naya), `src/main.jsx` (ThemeProvider + CssBaseline), `index.html` (Inter font) |
| Admin menu 39 → 16 items, purane reports tabs mein | `src/pages/DashboardPage.jsx`, `src/components/TabbedPage.jsx` (naya) |
| Admin Home: "Aaj ka hisaab" (aaj ke 3 business, rooms abhi, kisne entry bhari, mahina ab tak + andaza, alerts, jaldi kaam) | `src/components/owner/TodayHome.jsx` (naya). Purana links-wala Home: `/dashboard/home-classic` |
| Naya login page (staff + admin) | `src/components/AuthShell.jsx` (naya), `src/pages/LoginPage.jsx`, `src/pages/AdminLoginPage.jsx` |
| Upar ki patti (purane pages) dark | `src/components/Navbar.jsx` |
| Purani galti: Office Book export pe crash (`toast` import nahi tha) | `src/components/office/OfficeBookDashboard.jsx` |

**Koi logic / data nahi badla.** Purane saare report pages wahi hain, bas menu mein tabs ke andar. Purane URLs (`/dashboard/gh-reports/sales-report` waghera) bhi chalte rahenge.

## Naya menu → purane pages
- Guest House → Reports: Date range, Sales, Bank books, Baaki
- Restaurant → Reports: Sales, Upaad, Kharch, Bank books, Levana, Aapvana, Pending balance
- Restaurant → Staff & Setup: Staff, Categories & kharch, Levana/Aapvana log
- Office → Office Book: Book, Categories
- Merged Reports: Graph, Report, Vendor
- Sales Goals: GH, Restaurant, Banquet, Bakery Baada, Moti Baada

## Test checklist
- [ ] Har purana page ek baar kholo (naye menu ke tabs se) → data pehle jaisa, layout toota nahi
- [ ] Admin Home: aaj ke totals purane one-day view se match
- [ ] Login / Admin login phone aur PC dono pe
- [ ] Purane pages ke rangeen headers (jaise Upaad ka jamuni) waise hi rahenge; theme sirf buttons/tables/inputs/cards ko saaf karta hai

## Rollback (sirf look)
`src/main.jsx` se `<ThemeProvider>` aur `<CssBaseline />` hata do → purana look. Menu: `DashboardPage.jsx` purana version.
