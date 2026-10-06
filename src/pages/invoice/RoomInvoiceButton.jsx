// GH room editor ke andar: "Invoice banao" — room, food bill, extra charges, govt details se auto bhara.
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Alert, Button, Stack } from "@mui/material";
import InvoiceEditor from "./InvoiceEditor";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const BROWN = "#5B2222";

const RoomInvoiceButton = ({ date, period, roomNo, isAdmin, guestName, row, roomType }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);
  const [existing, setExisting] = useState([]);
  const [made, setMade] = useState(null);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await axios.get(`${API}/invoice/room-prefill/${date}/${period}/${roomNo}`);
      const dr = data.data.draft;
      // GH entry abhi submit nahi hui → screen pe bhara data use karo
      if (!data.data.found && row) {
        dr.customer.name = dr.customer.name || guestName || "";
        const m = String(row.mobileNumber || "").replace(/\D/g, "");
        if (m && m !== "0") dr.customer.mobile = dr.customer.mobile || m;
        dr.stay.guests = dr.stay.guests || Number(row.noOfPeople) || 0;
        const rate = Math.max(0, (Number(row.rate) || 0) - (Number(row.discount) || 0));
        if (rate > 0) dr.items = [{ desc: `Room rent — Room ${roomNo}${roomType ? ` (${roomType})` : ""}`, sac: "996311", qty: 1, rate, taxRate: 5 }, ...dr.items];
      }
      if (!dr.items.length) dr.items = [{ desc: `Room rent — Room ${roomNo}`, sac: "996311", qty: 1, rate: 0, taxRate: 5 }];
      setDraft(dr);
      setExisting(data.data.existing || []);
      setOpen(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not load invoice details");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1}>
      <Button
        variant="outlined"
        onClick={start}
        disabled={busy || !roomNo}
        sx={{ borderColor: BROWN, color: BROWN, fontWeight: 800, py: 1.1, borderStyle: "dashed" }}
      >
        🧾 Create invoice (GST / Non-GST)
      </Button>
      {made && (
        <Alert severity="success" action={<Button href={`/invoice/${made._id}`} target="_blank" rel="noopener" sx={{ fontWeight: 800 }}>Open PDF</Button>}>
          {made.invoiceNo} created
        </Alert>
      )}
      <InvoiceEditor
        open={open}
        draft={draft}
        existing={existing}
        lockDate={!isAdmin}
        onClose={() => setOpen(false)}
        onCreated={(inv) => {
          setMade(inv);
          setOpen(false);
          window.open(`/invoice/${inv._id}`, "_blank");
        }}
      />
    </Stack>
  );
};

export default RoomInvoiceButton;
