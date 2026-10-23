import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useMemo, useState } from "react";
import { TextField } from "@mui/material";
import { useAppSelector } from "../redux/hooks";

const PendingJamaGrid = () => {
  const { unpaidEntries } = useAppSelector((state) => state.entry);
  const [allRows, setAllRows] = useState([]);
  const [q, setQ] = useState("");

  const setPeriod = {
    day: "Day",
    night: "Night",
    extraDay: "Extra Day",
    extraNight: "Extra Night",
  };

  // Naya din upar (DD-MM-YYYY ko sahi tarah sort), phir room no.
  const dkey = (d) => String(d || "").split("-").reverse().join("");
  useEffect(() => {
    {
      const rows = [...(unpaidEntries || [])]
        .sort((a, b) => dkey(b.createDate || b.date).localeCompare(dkey(a.createDate || a.date)) || Number(a.roomNo) - Number(b.roomNo))
        .map((entry, index) => {
        return {
          id: index + 1,
          createDate: entry.createDate,
          roomNo: entry.roomNo,
          fullname: entry.fullname,
          mobileNumber: entry.mobileNumber,
          rate: entry.rate,
          modeOfPayment: entry.modeOfPayment,
          period: setPeriod[entry.period],
          roomType: entry.roomType,
          discount: entry?.discount || 0,
        };
      });
      setAllRows(rows);
    }
  }, [unpaidEntries]);
  // Khojo: date / room / naam / mobile
  const pendingJamaGridRows = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return allRows;
    return allRows.filter((r) => `${r.createDate} ${r.roomNo} ${r.fullname} ${r.mobileNumber}`.toLowerCase().includes(t));
  }, [allRows, q]);

  const totalRow = {
    id: "Total",
    createDate: "",
    roomNo: "",
    fullname: "",
    mobileNumber: "",
    rate: pendingJamaGridRows.reduce((acc, curr) => acc + curr.rate, 0),
    modeOfPayment: "",
    roomType: "",
  };

  if (allRows.length === 0) {
    return (
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <p>No Pending Jama Entries</p>
      </div>
    );
  } else {
    return (
      <div>
        <TextField size="small" placeholder="Search: date (04-10-2026) / room / name / mobile" value={q} onChange={(e) => setQ(e.target.value)} sx={{ mb: 1, width: { xs: "100%", sm: 380 } }} />
        <DataGrid
          autoHeight
          initialState={{ pagination: { paginationModel: { pageSize: 100 } } }}
          pageSizeOptions={[25, 50, 100]}
          rows={[...pendingJamaGridRows, totalRow]}
          columns={[
            { field: "id", headerName: "Index", width: 80 },
            { field: "createDate", headerName: "Created Date", width: 100 },
            { field: "roomNo", headerName: "Room No", width: 80 },
            { field: "roomType", headerName: "Room Type", width: 100 },
            { field: "fullname", headerName: "Full Name", width: 180 },
            { field: "mobileNumber", headerName: "Mobile No", width: 150 },
            { field: "rate", headerName: "Rate", width: 80 },
            { field: "discount", headerName: "Discount", width: 80 },
            {
              field: "modeOfPayment",
              headerName: "Mode of Payment",
              width: 100,
            },
            { field: "period", headerName: "Period", width: 100 },
          ]}
          rowHeight={35}
          sx={{
            fontSize: "12px",
            "& .MuiDataGrid-root": {
              border: "none",
            },
            "& .MuiDataGrid-columnHeaderTitleContainer": {
              display: "flex",
              justifyContent: "center",
            },
            "& .MuiDataGrid-columnHeader": {
              maxHeight: "35px",
              fontWeight: "bold",
              border: "0.5px solid #f0f0f0",
              backgroundColor: "#f1f1f1",
            },
            "& .MuiDataGrid-row": {
              maxHeight: "35px",
            },
            "& .MuiDataGrid-cell": {
              maxHeight: "35px",
              textAlign: "center",
              border: "0.5px solid #f0f0f0",
            },
            "& .total-row": {
              fontWeight: "bold",
            },
          }}
          getRowClassName={(params) =>
            params.row.id === "Total" ? "total-row" : ""
          }
          disableColumnSorting
        />
      </div>
    );
  }
};

export default PendingJamaGrid;
