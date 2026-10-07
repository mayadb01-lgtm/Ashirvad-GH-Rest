// Purchase bills ka hissa (list + bill dekhna + hatana) — Restaurant aur Office dono mein
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Box, Button, ButtonBase, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PurchaseBillDialog from "./PurchaseBillDialog";
import { API, EditorDialog, Q, Section, StatusPill, apiError, inr, num } from "./shared";

const PurchaseBillsSection = ({ date, book = "rest", modes, color = Q.rest, subtitle, vendors, expenses, bills, onSaved, onDeleted, deleteNote }) => {
  const [billOpen, setBillOpen] = useState(false);
  const [billView, setBillView] = useState(null); // { bill, photos: [url] }
  const saved = (bill, v) => {
    setBillOpen(false);
    onSaved?.(bill, v);
  };
  const viewBill = async (bill) => {
    setBillView({ bill, photos: [] });
    const urls = [];
    for (const n of bill.photos || []) {
      try {
        const { data } = await axios.get(`${API}/purchase/photo/${n}`, { responseType: "blob" });
        urls.push(URL.createObjectURL(data));
      } catch {
        /* photo nahi mili */
      }
    }
    setBillView({ bill, photos: urls });
  };
  const deleteBill = async (bill) => {
    if (!window.confirm(`Remove this bill (${inr(bill.amount)})?${deleteNote ? ` ${deleteNote(bill)}` : ""}`)) return;
    try {
      await axios.delete(`${API}/purchase/${bill._id}`);
      setBillView(null);
      onDeleted?.(bill);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  return (
    <>
      <Section
        title="🧾 Purchase bills"
        subtitle={subtitle}
        total={bills.reduce((t, b) => t + num(b.amount), 0)}
        color={color}
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={() => setBillOpen(true)} sx={{ fontWeight: 800, color }}>
            Add bill
          </Button>
        }
      >
        {bills.length === 0 && (
          <Typography variant="body2" color={Q.muted} sx={{ py: 1 }}>
            No purchase bill today.
          </Typography>
        )}
        {bills.map((b) => (
          <ButtonBase key={b._id} onClick={() => viewBill(b)} sx={{ width: "100%", textAlign: "left", display: "block" }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 1, borderTop: `1px solid ${Q.line}` }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>
                  {b.vendor?.name || b.vendor?.expenseName}
                </Typography>
                <Typography variant="caption" color={Q.muted}>
                  {[b.billNo && `Bill ${b.billNo}`, b.billDate, b.photos?.length ? `📷 ${b.photos.length}` : "", b.source === "scan" ? "scanned" : "manual"].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
              <StatusPill tone={b.mode === "Payable" ? "warn" : "good"}>{b.mode}</StatusPill>
              <Typography fontWeight={800}>{inr(b.amount)}</Typography>
            </Stack>
          </ButtonBase>
        ))}
      </Section>
      <PurchaseBillDialog open={billOpen} onClose={() => setBillOpen(false)} date={date} vendors={vendors} expenses={expenses} modes={modes} book={book} color={color} onSaved={saved} />
      <EditorDialog
        open={!!billView}
        onClose={() => setBillView(null)}
        subtitle={billView ? `${billView.bill.mode} · ${billView.bill.billDate || date}` : ""}
        title={billView ? `${billView.bill.vendor?.name || billView.bill.vendor?.expenseName} · ${inr(billView.bill.amount)}` : ""}
        actions={
          <Button fullWidth color="error" variant="outlined" onClick={() => deleteBill(billView.bill)}>
            Remove bill
          </Button>
        }
      >
        {billView && (
          <Stack spacing={1.5}>
            {billView.bill.billNo && <Typography>Bill no.: {billView.bill.billNo}</Typography>}
            {billView.bill.note && <Typography color={Q.muted}>{billView.bill.note}</Typography>}
            {(billView.bill.items || []).length > 0 && (
              <Box sx={{ border: `1px solid ${Q.line}`, borderRadius: 2, p: 1.25, bgcolor: "#fff" }}>
                <Stack direction="row" sx={{ pb: 0.5, borderBottom: `1px solid ${Q.line}` }}>
                  {[["Item", 3], ["Qty", 1.6], ["Rate", 1.4], ["Total", 1.4]].map(([h, w]) => (
                    <Typography key={h} variant="caption" fontWeight={800} color={Q.muted} sx={{ flex: w, textAlign: h === "Item" ? "left" : "right" }}>
                      {h}
                    </Typography>
                  ))}
                </Stack>
                {billView.bill.items.map((it, i) => (
                  <Stack key={i} direction="row" sx={{ py: 0.4 }}>
                    <Typography variant="body2" sx={{ flex: 3 }} noWrap>
                      {it.name}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1.6, textAlign: "right" }}>
                      {it.qty} {it.unit}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1.4, textAlign: "right" }}>
                      {inr(it.rate)}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ flex: 1.4, textAlign: "right" }}>
                      {inr(it.amount)}
                    </Typography>
                  </Stack>
                ))}
                <Stack direction="row" justifyContent="space-between" sx={{ pt: 0.5, borderTop: `1px solid ${Q.line}` }}>
                  <Typography variant="body2" color={Q.muted}>Items total</Typography>
                  <Typography variant="body2">{inr(billView.bill.itemsTotal)}</Typography>
                </Stack>
                {!!billView.bill.extra && (
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color={Q.muted}>Tax / round-off / transport</Typography>
                    <Typography variant="body2">{inr(billView.bill.extra)}</Typography>
                  </Stack>
                )}
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight={800}>Grand total</Typography>
                  <Typography fontWeight={800}>{inr(billView.bill.amount)}</Typography>
                </Stack>
              </Box>
            )}
            {billView.photos.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noopener noreferrer">
                <img src={u} alt="bill" style={{ width: "100%", borderRadius: 8, border: `1px solid ${Q.line}` }} />
              </a>
            ))}
            {billView.bill.photos?.length > 0 && billView.photos.length === 0 && <Typography color={Q.muted}>Loading photo…</Typography>}
            <Typography variant="caption" color={Q.muted}>
              Saved by {billView.bill.enteredBy || "—"}
            </Typography>
          </Stack>
        )}
      </EditorDialog>
    </>
  );
};

export default PurchaseBillsSection;
