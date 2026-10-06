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
