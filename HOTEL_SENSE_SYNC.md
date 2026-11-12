# Hotel PC → Rad Shiva: POS room bills, pay later and old dues

The hotel PC (hotel-sense POS) sends the POS side of each restaurant day to Rad Shiva.
Rad Shiva shows it on the Restaurant day screen, the Guest House room bills, the print slip and the receivables report.

## Endpoint

```
POST /api/v1/hotel-sense-sync
Content-Type: application/json      (text/plain with the same JSON also works)
x-sync-key: <the POS sync key>      (or "key" in the body)
```

- **Key:** the same sync key as `POST /api/v1/pos-sync` (stored as a hash in `kitchen_docs` `secret/possync`).
- **Rate limit:** at most 10 requests per 15 minutes from one IP. Send every 15 minutes, with all days in one request.
- **Days per request:** at most 62.

## Body

```json
{
  "pc": "HOTEL-PC",
  "days": [
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

| Field | What to send (Rails) |
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
- Only days from the **start date** onward are taken. The start date is `HOTEL_SENSE_SYNC_FROM=DD-MM-YYYY` in the server `.env`. If that is not set, it is the first day this endpoint received data. Future days are refused.
- Before any change or removal, a copy goes to the `hotel_sense_sync_backups` collection.
- Sending the same data again changes nothing.

## Reply

```json
{ "success": true, "daysChanged": 1, "created": 2, "updated": 0, "same": 0, "kept": 0, "removed": 0,
  "skipped": ["11-11-2026: before the start date 12-11-2026"], "from": "12-11-2026" }
```

`401` means a wrong key; `400` means bad JSON, no `days`, or more than 62 days. Treat any reply with `success: true` as delivered; for catch-up after the PC was off, resend from the last day that got `success: true`.

## Restaurant day after the POS data arrives

If the cashier submitted the day before the POS data reached Rad Shiva, the restaurant screen says the POS figures changed. Press **Update** to save the new grand total.
