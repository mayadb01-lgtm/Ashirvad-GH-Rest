import { useCallback, useEffect, useMemo, useState } from "react";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs from "dayjs";
import { MobileTimePicker } from "@mui/x-date-pickers";
import { useAppSelector } from "../redux/hooks";
import { initializeRows, paymentColors, typeColors } from "../utils/utils";
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  MenuItem,
  Select,
  Box,
  CircularProgress,
} from "@mui/material";
import "./TableComponent.css";

const TableComponent = ({
  period,
  rowsLength,
  onSubmit,
}) => {
  const { entries } = useAppSelector((state) => state.entry);

  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (entries && entries.length === 0) {
      setRows(initializeRows(period, rowsLength));
    }
    if (entries && entries.length > 0) {
      // Reset rows to initial state before updating
      let initialRows = initializeRows(period, rowsLength);

      const dayEntries = entries.filter((entry) => entry?.period === "day");
      const nightEntries = entries.filter((entry) => entry?.period === "night");
      const extraDayEntries = entries.filter(
        (entry) => entry?.period === "extraDay"
      );
      const extraNightEntries = entries.filter(
        (entry) => entry?.period === "extraNight"
      );

      const updateRowsWithEntries = (rows, entryList) => {
        return rows.map((row) => {
          const entry = entryList.find((entry) => entry.roomNo === row.roomNo);
          return entry
            ? {
                ...row,
                id: entry.id,
                roomNo: entry.roomNo,
                cost: entry.cost,
                roomType: entry.roomType,
                rate: entry.rate,
                noOfPeople: entry.noOfPeople,
                checkInTime: entry.checkInTime,
                checkOutTime: entry.checkOutTime,
                type: entry.type,
                modeOfPayment: entry.modeOfPayment,
                fullname: entry.fullname,
                mobileNumber: entry.mobileNumber,
                createDate: entry.createDate,
                period: entry.period,
              }
            : row;
        });
      };

      let updatedRows = initialRows;
      if (period.toLowerCase() === "day") {
        updatedRows = updateRowsWithEntries(initialRows, dayEntries);
      } else if (period.toLowerCase() === "night") {
        updatedRows = updateRowsWithEntries(initialRows, nightEntries);
      } else if (period.toLowerCase() === "extraday") {
        updatedRows = updateRowsWithEntries(initialRows, extraDayEntries);
      } else if (period.toLowerCase() === "extranight") {
        updatedRows = updateRowsWithEntries(initialRows, extraNightEntries);
      }

      setRows(updatedRows);
    }
  }, [entries]);

  const totalsRow = useMemo(() => {
    return {
      // id: `${period}-totals`,
      roomNo: "Totals",
      cost: "",
      roomType: "",
      rate: rows.reduce(
        (sum, row) => sum + (isNaN(row.rate) ? 0 : Number(row.rate)),
        0
      ),
      noOfPeople: rows.reduce(
        (sum, row) =>
          sum + (isNaN(row.noOfPeople) ? 0 : Number(row.noOfPeople)),
        0
      ),
      checkInTime: "",
      checkOutTime: "",
      type: "",
      modeOfPayment: "",
      fullname: "",
      mobileNumber: "",
    };
  }, [rows]);

  useEffect(() => {
    if (onSubmit) {
      onSubmit(rows);
    }
  }, [onSubmit, rows]);

  const handleRowEdit = useCallback(
    (updatedRow) => {
      setRows((prevRows) =>
        prevRows.map((row) =>
          row.id === updatedRow.id ? { ...row, ...updatedRow } : row
        )
      );
    },
    [setRows]
  );

  const tableComponentColumns = [
    "Room",
    "Price",
    "Room Type",
    "Rate",
    "People",
    "Check In",
    "Check Out",
    "Type",
    "Payment",
    "Full Name",
    "Mobile",
  ];

  const updateRowHighlight = (row) => {
    if (
      row.modeOfPayment &&
      row.type &&
      row.cost &&
      row.rate &&
      row.noOfPeople &&
      row.checkInTime &&
      row.checkOutTime &&
      row.fullname &&
      row.mobileNumber
    ) {
      return true;
    } else {
      return false;
    }
  };

  if (rows.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", margin: 0, padding: 0 }}>
      <TableContainer component={Paper} sx={{ maxHeight: 600, boxShadow: 3 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ border: "1px solid #000" }}>
              {tableComponentColumns.map((column, index) => (
                <TableCell
                  key={index}
                  sx={{
                    fontWeight: "bold",
                    textAlign: "center",
                    border: "1px solid #fff",
                    backgroundColor:
                      period?.includes("Day") || period?.includes("extraDay")
                        ? "#fdf6ee"
                        : "#eafcf9",
                    height: "24px",
                    padding: "0px",
                    fontSize: "12px",
                  }}
                >
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={index}
                hover
                sx={{
                  width: "100%",
                  "& .MuiTableRow-root": {
                    hight: "24px",
                    padding: "0px",
                    fontSize: "12px",
                  },
                  "& .MuiInputBase-input": {
                    padding: "2px 8px",
                  },
                  "& .MuiTableCell-root": {
                    padding: "2px 8px",
                  },
                }}
              >
                <TableCell
                  width={"5%"}
                  className={
                    updateRowHighlight(row) ? "highlight" : "cell-white"
                  }
                >
                  <TextField
                    type="number"
                    value={row.roomNo}
                    fullWidth
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell
                  width={"7%"}
                  className={
                    updateRowHighlight(row) ? "highlight" : "cell-white"
                  }
                >
                  <TextField
                    type="number"
                    value={row.cost}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell
                  width={"8%"}
                  className={
                    updateRowHighlight(row) ? "highlight" : "cell-white"
                  }
                >
                  <TextField
                    type="text"
                    value={row.roomType}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell
                  width={"7%"}
                  className={
                    updateRowHighlight(row)
                      ? "highlight"
                      : period?.includes("Day") || period?.includes("extraDay")
                        ? "orange"
                        : "green"
                  }
                >
                  <TextField
                    type="number"
                    value={row.rate}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value >= 0) {
                        handleRowEdit({ ...row, rate: value });
                      }
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell
                  width={"6%"}
                  className={
                    updateRowHighlight(row)
                      ? "highlight"
                      : period?.includes("Day") || period?.includes("extraDay")
                        ? "orange"
                        : "green"
                  }
                >
                  <TextField
                    type="number"
                    value={row.noOfPeople}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value >= 0) {
                        handleRowEdit({ ...row, noOfPeople: value });
                      }
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell
                  width={"11%"}
                  className={
                    updateRowHighlight(row)
                      ? "highlight"
                      : period?.includes("Day") || period?.includes("extraDay")
                        ? "light-orange"
                        : "light-green"
                  }
                >
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <MobileTimePicker
                      value={
                        row.checkInTime
                          ? dayjs(row.checkInTime, "hh:mm A")
                          : null
                      }
                      onChange={(newValue) => {
                        const formattedTime = newValue
                          ? dayjs(newValue).format("hh:mm A")
                          : null;
                        handleRowEdit({ ...row, checkInTime: formattedTime });
                      }}
                      slots={{
                        textField: (params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            placeholder="Select Time"
                            className="light-orange"
                          />
                        ),
                      }}
                      sx={{
                        "& .MuiInputBase-root": {
                          height: "24px",
                          fontSize: "12px",
                          textAlign: "center",
                        },
                      }}
                      ampm
                    />
                  </LocalizationProvider>
                </TableCell>
                <TableCell
                  width={"11%"}
                  className={
                    updateRowHighlight(row)
                      ? "highlight"
                      : period?.includes("Day") || period?.includes("extraDay")
                        ? "light-orange"
                        : "light-green"
                  }
                >
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <MobileTimePicker
                      value={
                        row.checkOutTime
                          ? dayjs(row.checkOutTime, "hh:mm A")
                          : null
                      }
                      onChange={(newValue) => {
                        const formattedTime = newValue
                          ? dayjs(newValue).format("hh:mm A")
                          : null;
                        handleRowEdit({ ...row, checkOutTime: formattedTime });
                      }}
                      slots={{
                        textField: (params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                            placeholder="Select Time"
                            className="light-orange"
                          />
                        ),
                      }}
                      sx={{
                        "& .MuiInputBase-root": {
                          height: "24px",
                          fontSize: "12px",
                          padding: "0px",
                        },
                      }}
                      ampm
                    />
                  </LocalizationProvider>
                </TableCell>
                <TableCell
                  width={"9%"}
                  className={
                    period?.includes("Day") || period?.includes("extraDay")
                      ? "orange"
                      : "green"
                  }
                >
                  <Select
                    value={row.type ? row.type : "Select"}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleRowEdit({ ...row, type: value });
                    }}
                    sx={{
                      width: "100%",
                      color:
                        row.type && row.type !== "Select" ? "white" : "black",
                      backgroundColor:
                        typeColors[row.type] || typeColors["Select"], // Default color for 'Select'
                      "& .MuiInputBase-input": {
                        fontSize: "12px",
                      },
                    }}
                  >
                    {[
                      "Select",
                      "Single",
                      "Couple",
                      "Family",
                      "Employee",
                      "NRI",
                      "Foreigner",
                      "Group",
                      "Other",
                    ].map((type, index) => (
                      <MenuItem
                        key={index}
                        value={type}
                        sx={{
                          fontSize: "12px",
                          backgroundColor: typeColors[type],
                          color: "#fff",
                          ":hover": {
                            backgroundColor: "#b6b6b6",
                            color: "#000",
                          },
                        }}
                      >
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell
                  width={"9%"}
                  className={
                    period?.includes("Day") || period?.includes("extraDay")
                      ? "orange"
                      : "green"
                  }
                >
                  <Select
                    value={row.modeOfPayment ? row.modeOfPayment : "Select"}
                    defaultValue="Select"
                    onChange={(e) => {
                      const value = e.target.value;
                      handleRowEdit({ ...row, modeOfPayment: value });
                    }}
                    sx={{
                      width: "100%",
                      backgroundColor:
                        paymentColors[row.modeOfPayment] || "transparent",
                      "& .MuiInputBase-input": {
                        fontSize: "12px",
                      },
                      color:
                        row.modeOfPayment && row.modeOfPayment !== "Select"
                          ? "white"
                          : "black",
                    }}
                  >
                    {["Select", "Cash", "Card", "PPS", "PPC", "UnPaid"].map(
                      (mode, index) => (
                        <MenuItem
                          key={index}
                          value={mode}
                          sx={{
                            fontSize: "12px",
                            backgroundColor: paymentColors[mode],
                            color: "#fff",
                            ":hover": {
                              backgroundColor: "#b6b6b6",
                              color: "#000",
                            },
                          }}
                        >
                          {mode}
                        </MenuItem>
                      )
                    )}
                  </Select>
                </TableCell>
                <TableCell
                  width={"15%"}
                  className={
                    updateRowHighlight(row)
                      ? "highlight"
                      : period?.includes("Day") || period?.includes("extraDay")
                        ? "light-orange"
                        : "light-green"
                  }
                >
                  <TextField
                    type="text"
                    value={row.fullname}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleRowEdit({ ...row, fullname: value });
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell
                  width={"12%"}
                  className={
                    updateRowHighlight(row)
                      ? "highlight"
                      : period?.includes("Day") || period?.includes("extraDay")
                        ? "light-orange"
                        : "light-green"
                  }
                >
                  <TextField
                    type="number"
                    value={row.mobileNumber}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 10) {
                        handleRowEdit({ ...row, mobileNumber: value });
                      }
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
            {/* Totals Row */}
            <TableRow
              sx={{
                width: "100%",
                backgroundColor: "#c8fad6",
                fontSize: "12px",
                "& .MuiTableRow-root": {
                  hight: "24px",
                  padding: "0px",
                },
                "& .MuiInputBase-input": {
                  padding: "2px 8px",
                },
                "& .MuiTableCell-root": {
                  padding: "2px 8px",
                },
              }}
            >
              <TableCell
                sx={{
                  fontWeight: "bold",
                }}
              >
                {totalsRow.roomNo}
              </TableCell>
              <TableCell>{totalsRow.cost}</TableCell>
              <TableCell>{totalsRow.roomType}</TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={totalsRow.rate}
                  sx={{
                    "& .MuiInputBase-input": {
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "600",
                    },
                  }}
                >
                  {totalsRow.rate}
                </TextField>
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={totalsRow.noOfPeople}
                  sx={{
                    "& .MuiInputBase-input": {
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "600",
                    },
                  }}
                >
                  {totalsRow.noOfPeople}
                </TextField>
              </TableCell>
              <TableCell>{totalsRow.checkInTime}</TableCell>
              <TableCell>{totalsRow.checkOutTime}</TableCell>
              <TableCell>{totalsRow.type}</TableCell>
              <TableCell>{totalsRow.modeOfPayment}</TableCell>
              <TableCell>{totalsRow.fullname}</TableCell>
              <TableCell>{totalsRow.mobileNumber}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default TableComponent;
