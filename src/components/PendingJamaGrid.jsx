import { DataGrid } from "@mui/x-data-grid";
import { useEffect, useState } from "react";
import { useAppSelector } from "../redux/hooks";

const PendingJamaGrid = () => {
  const { unpaidEntries } = useAppSelector((state) => state.entry);
  const [pendingJamaGridRows, setPendingJamaGridRows] = useState([]);

  const setPeriod = {
    day: "Day",
    night: "Night",
    extraDay: "Extra Day",
    extraNight: "Extra Night",
  };

  useEffect(() => {
    if (unpaidEntries.length > 0) {
      const rows = unpaidEntries.map((entry, index) => {
        return {
          id: index + 1,
          createDate: entry.createDate,
          roomNo: entry.roomNo,
          fullname: entry.fullname,
          mobileNumber: entry.mobileNumber,
          rate: entry.rate,
          modeOfPayment: entry.modeOfPayment,
          period: setPeriod[entry.period],
        };
      });
      setPendingJamaGridRows(rows);
    }
  }, [unpaidEntries]);

  const totalRow = {
    id: "Total",
    createDate: "",
    roomNo: "",
    fullname: "",
    mobileNumber: "",
    rate: pendingJamaGridRows.reduce((acc, curr) => acc + curr.rate, 0),
    modeOfPayment: "",
  };

  if (pendingJamaGridRows.length === 0) {
    return (
      <div style={{ textAlign: "center", marginTop: "20px" }}>
        <p>No Pending Jama Entries</p>
      </div>
    );
  } else {
    return (
      <div>
        <DataGrid
          rows={[...pendingJamaGridRows, totalRow]}
          columns={[
            { field: "id", headerName: "Index", width: 80 },
            { field: "createDate", headerName: "Created Date", width: 100 },
            { field: "roomNo", headerName: "Room No", width: 80 },
            { field: "fullname", headerName: "Full Name", width: 180 },
            { field: "mobileNumber", headerName: "Mobile No", width: 150 },
            { field: "rate", headerName: "Rate", width: 80 },
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
            "& .MuiDataGrid-footerContainer": {
              display: "none",
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
