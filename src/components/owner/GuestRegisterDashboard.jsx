// Govt / Police guest register: jo details staff ne entry ke saath bhari, unki list + CSV download.
// Sirf padhta hai (photo delete entry ke andar se hota hai).
import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogContent, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import { API, PageTitle, Section, MonthStepBar } from "../insights/shared";

const F = "DD-MM-YYYY";
const fullName = (r) => [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ");
const missing = (r) => {
  const need = { "Name": r.firstName, Mobile: r.mobile, Address: r.address, State: r.state, City: r.city, "Doc type": r.documentType, "Doc no.": r.documentNumber, "Coming from": r.comingFrom, "Going to": r.goingTo };
  return Object.entries(need).filter(([, v]) => !String(v || "").trim()).map(([k]) => k);
};

const GuestRegisterDashboard = () => {
  const [start, setStart] = useState(dayjs());
  const [end, setEnd] = useState(dayjs());
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/guest-register/range/${start.format(F)}/${end.format(F)}`)
      .then(({ data }) => !off && setList(data.data || []))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load list"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [start, end]);

  const downloadCsv = async () => {
    try {
      const { data } = await axios.get(`${API}/guest-register/csv/${start.format(F)}/${end.format(F)}`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = start.isSame(end, "day") ? `Guest_Register_${start.format(F)}.csv` : `Guest_Register_${start.format(F)}_to_${end.format(F)}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast.error("Could not download CSV");
    }
  };

  const showPhoto = async (name) => {
    try {
      const { data } = await axios.get(`${API}/guest-register/photo/${name}`, { responseType: "blob" });
      setPhoto(URL.createObjectURL(data));
    } catch {
      toast.error("Could not load photo");
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Guest Register (Govt)" sub="Govt/Police details entered by staff with room entries. Download the CSV here and upload it to the govt website." />
      <MonthStepBar start={start} end={end} setStart={setStart} setEnd={setEnd} format={F}>
        <Button size="small" variant="outlined" onClick={() => { setStart(dayjs()); setEnd(dayjs()); }}>
          Today
        </Button>
        <Button size="small" variant="outlined" onClick={() => { const y = dayjs().subtract(1, "day"); setStart(y); setEnd(y); }}>
          Yesterday
        </Button>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={downloadCsv} disabled={!list.length}>
          CSV download
        </Button>
      </MonthStepBar>

      <Alert severity="info" sx={{ mb: 2 }}>
        These details are stored separately and do not affect GH entries or accounts. Guests without registration details are not shown here. The CSV column order matches the govt form.
      </Alert>
      {loading && <Typography color="text.secondary">Loading…</Typography>}

      <Section title={`Guests — ${list.length}`}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Date", "Room", "Name", "Mobile", "City / State", "Document", "Guests", "Photo", "Missing"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((r) => {
                const miss = missing(r);
                return (
                  <TableRow key={r._id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {r.date} <Typography component="span" variant="caption" color="text.secondary">{({ day: "Day", night: "Night", extraDay: "Extra Day", extraNight: "Extra Night" })[r.period] || r.period}</Typography>
                    </TableCell>
                    <TableCell>{r.roomNo}</TableCell>
                    <TableCell>
                      {fullName(r)}
                      {r.companyName ? <Typography variant="caption" display="block" color="text.secondary">{r.companyName}</Typography> : null}
                    </TableCell>
                    <TableCell>{r.mobile}</TableCell>
                    <TableCell>{[r.city, r.state].filter(Boolean).join(", ")}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {r.documentType} {r.documentNumber}
                    </TableCell>
                    <TableCell>
                      {(Number(r.adults) || 0) + (Number(r.children) || 0) || ""}
                      {r.otherGuests?.length ? ` (+${r.otherGuests.length} names)` : ""}
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {(r.documentImages || []).map((n, i) => (
                          <Chip key={n} size="small" label={`📷 ${i + 1}`} onClick={() => showPhoto(n)} />
                        ))}
                      </Stack>
                    </TableCell>
                    <TableCell>{miss.length ? <Typography variant="caption" color="error">{miss.join(", ")}</Typography> : <Chip size="small" color="success" label="Complete" />}</TableCell>
                  </TableRow>
                );
              })}
              {!loading && !list.length && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Typography color="text.secondary">No Govt details entered in this date range.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Dialog open={!!photo} onClose={() => setPhoto(null)} maxWidth="md">
        <DialogContent sx={{ p: 1 }}>{photo && <img src={photo} alt="Document" style={{ maxWidth: "100%", display: "block" }} />}</DialogContent>
      </Dialog>
    </Box>
  );
};

export default GuestRegisterDashboard;
