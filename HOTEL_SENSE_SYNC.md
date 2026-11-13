# Hotel PC data in Rad Shiva: Import from cashier PC (pull)

The hotel PC never sends anything to Rad Shiva and holds no Rad Shiva key or login. Only the **Super Admin** brings
its data in: Owner dashboard > Settings > **Import from cashier PC**. Rad Shiva's server then fetches the days from
the hotel PC and adds only what is not here yet.

The old inbound routes `POST /api/v1/pos-sync` and `POST /api/v1/hotel-sense-sync` are **removed** (404, and 401
without login). Their apply logic is kept as functions (`applyPosReports` in `controller/posSync.js`,
`applyPosDays` in `controller/hotelSenseSync.js`) and is used by the pull.

## Set up (once)

1. On the Rad Shiva server, in the `server` folder: `node scripts/make-pull-key.js`.
   It writes `HOTEL_PC_PULL_KEY=<plain key>` into `server/.env` and prints the key's SHA-256.
2. Also in `server/.env`: `HOTEL_PC_PULL_URL=https://<vps>/shop/api/radshiva/pull` (just `https://<vps>` also works).
   Restart the server.
3. On the hotel PC: `bin/rails runner script/radshiva_pull_setup.rb <sha256>`. Only the SHA-256 goes there.
   The plain key never goes to the hotel PC, into git, a chat or a message.
4. Optional: `HOTEL_SENSE_SYNC_FROM=DD-MM-YYYY` in `server/.env` = no POS day before this is ever written.
   Without it, the first day of the first import is the start date (kept in `hotel_pc_pulls` `_id: "state"`).

## What the import does

`POST /api/v1/hotel-pc/pull { from, to }` (Super Admin only, not view-only, behind the dashboard password; at most
62 days). The server calls `GET <HOTEL_PC_PULL_URL>?from=&to=` with header `x-pull-key`, then applies, in order:

1. **docs** (Rad Shiva-shaped records of the hotel PC back office), only these collections: restentries entries
   officebooks roomcharges ghduereceipts restduereceipts restdueadjusts cashhandovers guestregisters stays bookings
   roomblocks roommoves banquetbookings invoices purchasebills staffsalaries restcategories reststaffs restpendings
   rooms roomgroups officetypes banquethalls banquetpackages banquetitems banquetaddons. Anything else (logins,
   settings, secrets) is ignored.
   - Added only when neither the `_id` nor the natural key is here yet. Natural keys: restentries `createDate`;
     entries / officebooks `date`; staffsalaries month + year; rooms `roomNumber`; guestregisters and stays
     date + period + room; roomblocks room; invoices series + fy + seq; officetypes side + category + expense;
     restcategories / banquet lists by name.
   - A record that does not pass this server's model checks is skipped (listed with the reason).
   - Already here and equal: **same**. Already here but the hotel PC copy is different and newer: **different**,
     listed for the Super Admin, never overwritten on its own. Rad Shiva copy newer: **skipped** (kept).
   - Ticked "different" rows: `POST /api/v1/hotel-pc/pull { from, to, replace: ["<coll>:<hotel id>"] }`.
     Rad Shiva's own `_id` is kept; the old copy goes to `hotel_pc_pull_backups` first.
   - POS room bills (roomcharges with source "pos") are not taken as records; they come through step 2.
2. **pos_days**: the POS side of each restaurant day (shape below), same rules as before.
3. **pos_reports**: dish / table / footfall numbers for Manager (same bundle the old POS Sync program sent).

Every added record is also written to `hotel_pc_pull_backups` (kind "added"). Each import is logged in
`hotel_pc_pulls` (kind "log"); the screen remembers the last good import and suggests the next dates.
Running the same import twice changes nothing.

## Automatic import every 2 minutes

Switch "Automatic every 2 min" next to the Import button (Super Admin only; `POST /api/v1/hotel-pc/pull/auto
{ on: true|false }`, kept in `hotel_pc_pulls` `_id: "state"`). It is still a pull: Rad Shiva's server asks, the
hotel PC sends nothing on its own.

- Each run asks for yesterday..today, or from the last good import when the PC was off (at most 62 days back).
- Same safe apply as the button: add only; "different" records wait for the Super Admin (the status line says how
  many). POS days and POS reports of those days are refreshed every run (idempotent).
- One run at a time, also against the button and a second server process (lease `_id: "lock"`, 5 minutes).
  60-second timeout per run.
- PC off: one console line, then quiet until it works again (one more line). The status line shows "Cashier PC not
  reachable since HH:mm". A run that changed nothing writes no log line.
- 7.5 requests per 15 minutes from the timer; the hotel PC allows 20, so manual clicks still fit.
- The timer starts with the server (server.js) and does nothing while the switch is off.

`GET /api/v1/hotel-pc/pull/status` gives: set up or not, last good import, suggested dates, start date.

## pos_days

The hotel PC reply carries `pos_days`: a list of days like this (the hotel PC builds it in
`RadshivaPullController.pos_day`):

```json
{
  "pos_days": [
    {
      "date": "12-11-2026",
      "complete": true,
      "room_bills": [
        { "posOrderId": "1001", "billNo": "ORD-121126-04", "roomNo": 104, "amount": 850,
          "guestName": "", "mobile": "", "enteredBy": "Ravi",
          "isPaid": false, "paidMode": "", "paidDate": "" }
      ],
      "pay_later": {
        "rows": [ { "id": "1005", "billNo": "ORD-121126-11", "name": "Mehta", "amount": 700 } ]
      },
      "today_paid": { "cash": 15000, "upi": 8000, "card": 2000, "other": 0 },
      "old_paid": {
        "rows": [ { "id": "980", "billNo": "ORD-101126-03", "name": "Shah Traders", "amount": 500,
                    "method": "CASH", "bill_date": "10-11-2026" } ]
      },
      "banquet_cash": [
        { "id": "77", "bookingNo": "BQ-12", "party": "Patel wedding", "eventDate": "11-11-2026",
          "amount": 5000, "mode": "Cash", "by": "Cashier" }
      ]
    }
  ]
}
```

All dates are `DD-MM-YYYY`. Amounts are whole rupees.

| Field | What the hotel PC puts in (Rails) |
|---|---|
| `date` | The restaurant day (when the bills were made). |
| `complete` | `true` when `room_bills` is the full list for that day. Rad Shiva then removes its unpaid POS room bills for that day that are no longer in the list (a cancelled bill, or one changed to another payment). Send `false` or leave it out if the list may be partial. |
| `room_bills` | Every order **made that day** with `pending_reason == "PAY_AT_GUEST_HOUSE"` (same as `Rs::PosRoomBill.to_room?`), still pending **or** paid later. `posOrderId` = `order.id` (required, the key). `roomNo` = `PosRoomBill.room_of(order)` (required). `billNo` = the printed daily order number. `isPaid: true` only when the POS bill was later paid at the restaurant counter, with `paidMode` `CASH` / `UPI` / `CARD` and `paidDate` = the day it was paid. Rad Shiva fills in the guest name from its own Guest House data. |
| `pay_later` | `Rs::PosDay.call(date)[:pay_later]`: bills made that day left "Pay later". Send `rows` (`id`, `billNo`, `name`, `amount`); `count` / `amount` are worked out from the rows. |
| `today_paid` | `Rs::PosDay.call(date)[:today_paid]`: what the counter took for that day's own bills, by method. Owner check only. |
| `old_paid` | `Rs::PosDay.call(date)[:old_paid][:rows]`: bills of an **earlier** day paid that day (`method` = `CASH` / `UPI` / `CARD`, `bill_date` = the day the bill was made). Leave out bills that were room bills (`PAY_AT_GUEST_HOUSE`); their payment comes through `room_bills.isPaid`. Rad Shiva also drops any it already has as a POS room bill. |
| `banquet_cash` | Optional. Banquet payments the cashier took at the POS counter that day (`counter == "rest"`). Rad Shiva only shows them on the restaurant day screen as a reminder; they are not added to any banquet booking. |

## What Rad Shiva does with it

- **Room bills** go to `roomcharges` with `source: "pos"`, matched by `posOrderId`. They show on the Guest House room bill and in the restaurant's "Room food bills (POS)" section, and they count in the day's grand total.
- **Pay later** bills count in the day's grand total and appear in the receivables report under the customer's name. **Old bills paid** count as money received there.
- Everything else goes to the `pos_day_extras` collection, one document per day.

## Safety rules (on the Rad Shiva side)

- Only records that came from the POS are written. Staff-typed data (restaurant entries, Receivables, GH entries, room bills typed by staff) is never changed.
- A POS room bill that staff collected in Rad Shiva (GH, restaurant or office counter) is never changed or removed again. An amount change from the POS is reported in `skipped`.
- Only days from the **start date** onward are taken. The start date is `HOTEL_SENSE_SYNC_FROM=DD-MM-YYYY` in the server `.env`. If that is not set, it is the first day of the first import. Future days are refused.
- Before any change or removal, a copy goes to the `hotel_sense_sync_backups` collection.
- Importing the same days again changes nothing.

## Reply of the import

```json
{ "success": true, "from": "01-11-2026", "to": "13-11-2026", "pc": "Hotel Ashirvad POS",
  "collections": { "restentries": { "added": 1, "same": 0, "different": 1, "replaced": 0, "skipped": 0 } },
  "different": [ { "tag": "restentries:<hotel id>", "key": "10-11-2026", "fields": ["grandTotal"], ... } ],
  "skipped": [ { "coll": "guestregisters", "id": "...", "why": "not valid here: roomNo, period" } ],
  "ignored": ["appsettings"],
  "posDays": { "daysChanged": 13, "created": 1, "updated": 0, "same": 0, "kept": 0, "removed": 0, "skipped": [] },
  "posReports": { "saved": true, "days": 13 } }
```

`403` not the Super Admin; `400` bad dates or more than 62 days; `502` the cashier PC could not be reached or
refused the key; `503` HOTEL_PC_PULL_URL / HOTEL_PC_PULL_KEY not set.

## Restaurant day after the POS data arrives

If the cashier submitted the day before the Super Admin imported the POS data, the restaurant screen says the POS figures changed. Press **Update** to save the new grand total.
