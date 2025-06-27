import { DatePicker } from "@mui/x-date-pickers";
import dayjs from "dayjs";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import {
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Select,
  Button,
} from "@mui/material";
import { useAppSelector } from "../redux/hooks";
import { DeleteOutline } from "@mui/icons-material";
import toast from "react-hot-toast";
import { useEffect, useMemo } from "react";
import { DATE_FORMAT, paymentColors } from "../utils/utils";

dayjs.locale("en-gb");

const PendingJamaTable = ({ pendingJamaRows, setPendingJamaRows }) => {
  const { entries, unpaidEntries } = useAppSelector((state) => state.entry);
  // Helper to build empty rows
  const initializePendingJamaRows = (startId = 1, count = 10) => {
    return Array.from({ length: count }, (_, idx) => ({
      id: startId + idx,
      date: "",
      roomNo: 0,
      fullname: "",
      mobileNumber: 0,
      rate: 0,
      modeOfPayment: "",
      period: "UnPaid",
      createDate: "",
      cost: 0,
      roomType: "",
      type: "",
      checkInTime: "10:00 AM",
      checkOutTime: "10:00 AM",
      noOfPeople: 0,
      discount: 0,
      paidDate: "",
      isPaid: true,
    }));
  };

  const handleAddRow = () => {
    setPendingJamaRows((prevRows) => {
      const nextId =
        prevRows.length > 0 ? prevRows[prevRows.length - 1].id + 1 : 1;
      const newRow = initializePendingJamaRows(nextId, 1)[0];
      return [...prevRows, newRow];
    });
  };

  // Sync pendingJamaRows when entries change
  useEffect(() => {
    if (!entries || entries.length === 0) {
      setPendingJamaRows(initializePendingJamaRows());
      return;
    }

    const filteredEntries = entries.filter(
      (entry) => entry?.period === "UnPaid"
    );
    const maxId = Math.max(...filteredEntries.map((e) => Number(e.id)));
    const initialRows = initializePendingJamaRows(1, maxId);

    const updatedRows = initialRows.map((row) => {
      const entry = filteredEntries.find((e) => e.id === String(row.id));
      if (entry) {
        return {
          ...row,
          id: entry.id,
          date: entry.date,
          roomNo: String(entry.roomNo),
          fullname: entry.fullname,
          mobileNumber: String(entry.mobileNumber),
          rate: String(entry.rate),
          modeOfPayment: entry.modeOfPayment,
          period: entry.period,
          createDate: entry.createDate,
          cost: entry.cost,
          roomType: entry.roomType,
          type: entry.type,
          paidDate: entry.paidDate,
          noOfPeople: entry.noOfPeople,
          discount: entry.discount || 0,
          isPaid: entry.isPaid,
          checkInTime: entry.checkInTime,
          checkOutTime: entry.checkOutTime,
        };
      }
      return row;
    });

    setPendingJamaRows(updatedRows);
  }, [entries, setPendingJamaRows]);

  const getRoomNoList = useMemo(() => {
    const map = new Map();
    unpaidEntries.forEach((entry) => {
      if (!map.has(entry.date)) {
        map.set(entry.date, new Set());
      }
      map.get(entry.date).add(String(entry.roomNo));
    });
    return map;
  }, [unpaidEntries]);

  const getFullNameList = (date, roomNo) =>
    unpaidEntries
      .filter(
        (entry) =>
          entry.date === date && String(entry.roomNo) === String(roomNo)
      )
      .map((entry) => entry.fullname);

  const getMobileNumberList = (date, roomNo, fullname) =>
    unpaidEntries
      .filter(
        (entry) =>
          entry.date === date &&
          String(entry.roomNo) === String(roomNo) &&
          entry.fullname?.toLowerCase() === fullname?.toLowerCase()
      )
      .map((entry) => String(entry.mobileNumber));

  const getRateList = (date, roomNo, fullname, mobileNumber) =>
    unpaidEntries
      .filter(
        (entry) =>
          entry.date === date &&
          String(entry.roomNo) === String(roomNo) &&
          entry.fullname?.toLowerCase() === fullname?.toLowerCase() &&
          String(entry.mobileNumber) === String(mobileNumber)
      )
      .map((entry) => String(entry.rate));

  const getOtherFields = (date, roomNo, fullname, mobileNumber, rate) => {
    return unpaidEntries.find(
      (entry) =>
        entry.date === date &&
        String(entry.roomNo) === String(roomNo) &&
        entry.fullname?.toLowerCase() === fullname?.toLowerCase() &&
        String(entry.mobileNumber) === String(mobileNumber) &&
        String(entry.rate) === String(rate)
    );
  };

  const handleRowEdit = (id, field, value) => {
    setPendingJamaRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== id) return row;
        const updatedRow = { ...row, [field]: value };
        const { date, roomNo, fullname, mobileNumber, rate } = updatedRow;

        if (date && roomNo && fullname && mobileNumber && rate) {
          const details = getOtherFields(
            date,
            roomNo,
            fullname,
            mobileNumber,
            rate
          );
          if (details) {
            return {
              ...updatedRow,
              cost: details.cost,
              roomType: details.roomType,
              type: details.type,
              paidDate: dayjs().format(DATE_FORMAT),
              noOfPeople: details.noOfPeople,
              discount: details.discount,
              date: details.date,
              entryCreateDate: details.entryCreateDate,
              createDate: details.createDate,
            };
          }
        }

        return updatedRow;
      })
    );
  };

  console.log("Pending Jama Rows:", pendingJamaRows);

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600, boxShadow: 3 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow sx={{ border: "1px solid #000" }}>
            {[
              "ID",
              "Date",
              "Room No",
              "Full Name",
              "Mobile No",
              "Rate",
              "Discount",
              "Mode of Payment",
              "Action",
            ].map((header, index) => (
              <TableCell
                key={index}
                sx={{
                  fontWeight: "bold",
                  backgroundColor: "#eefcc8",
                  textAlign: "center",
                  border: "1px solid #fff",
                  height: "24px",
                  padding: "0px",
                  fontSize: "12px",
                }}
              >
                {header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {pendingJamaRows.map((row) => (
            <TableRow
              key={row.id}
              hover
              sx={{
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
                  textAlign: "center",
                },
              }}
            >
              <TableCell
                width={"3%"}
                sx={{
                  fontSize: "12px",
                }}
              >
                {row.id}
              </TableCell>
              <TableCell width={"17%"}>
                <LocalizationProvider
                  dateAdapter={AdapterDayjs}
                  adapterLocale="en-gb"
                >
                  <DatePicker
                    value={row.date ? dayjs(row.date, "DD-MM-YYYY") : null}
                    onChange={(newDate) => {
                      const formattedDate = dayjs(newDate).format("DD-MM-YYYY");
                      handleRowEdit(row.id, "date", formattedDate);
                    }}
                    slots={{
                      textField: (params) => (
                        <TextField {...params} size="small" fullWidth />
                      ),
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        height: "24px",
                        fontSize: "12px",
                        textAlign: "center",
                      },
                      "& .MuiSvgIcon-root": {
                        fontSize: "12px",
                      },
                    }}
                  />
                </LocalizationProvider>
              </TableCell>
              <TableCell width={"5%"}>
                <Select
                  value={row.roomNo ? row.roomNo : ""}
                  onChange={(e) =>
                    handleRowEdit(row.id, "roomNo", e.target.value)
                  }
                  fullWidth
                  renderValue={(value) => value || "Select"}
                  sx={{
                    "& .MuiTableCell-root": {
                      // padding: "0px",
                    },
                    "& .MuiInputBase-input": {
                      fontSize: "12px",
                    },
                  }}
                >
                  {[...(getRoomNoList.get(row.date) || [])].map((roomNo) => (
                    <MenuItem
                      key={roomNo}
                      value={roomNo}
                      sx={{
                        fontSize: "12px",
                        // padding: "0px",
                      }}
                    >
                      {roomNo}
                    </MenuItem>
                  ))}
                </Select>
              </TableCell>
              <TableCell width={"15%"}>
                <Select
                  value={row.fullname ? row.fullname : ""}
                  onChange={(e) =>
                    handleRowEdit(row.id, "fullname", e.target.value)
                  }
                  fullWidth
                  renderValue={(value) => value || "Select"}
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "12px",
                    },
                  }}
                >
                  {getFullNameList(row.date, row.roomNo).map((fullname) => (
                    <MenuItem
                      key={fullname}
                      value={fullname}
                      sx={{
                        fontSize: "12px",
                      }}
                    >
                      {fullname}
                    </MenuItem>
                  ))}
                </Select>
              </TableCell>
              <TableCell width={"15%"}>
                <Select
                  value={row.mobileNumber ? row.mobileNumber : ""}
                  onChange={(e) =>
                    handleRowEdit(row.id, "mobileNumber", e.target.value)
                  }
                  fullWidth
                  renderValue={(value) => value || "Select"}
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "12px",
                    },
                  }}
                >
                  {getMobileNumberList(row.date, row.roomNo, row.fullname).map(
                    (mobileNumber) => (
                      <MenuItem
                        key={mobileNumber}
                        value={mobileNumber}
                        sx={{
                          fontSize: "12px",
                        }}
                      >
                        {mobileNumber}
                      </MenuItem>
                    )
                  )}
                </Select>
              </TableCell>
              <TableCell width={"15%"}>
                <Select
                  value={row.rate ? row.rate : ""}
                  onChange={(e) =>
                    handleRowEdit(row.id, "rate", e.target.value)
                  }
                  fullWidth
                  renderValue={(value) => value}
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "12px",
                    },
                  }}
                >
                  {getRateList(
                    row.date,
                    row.roomNo,
                    row.fullname,
                    row.mobileNumber
                  ).map((rate) => (
                    <MenuItem
                      key={rate}
                      value={rate}
                      sx={{
                        fontSize: "12px",
                      }}
                    >
                      {rate}
                    </MenuItem>
                  ))}
                </Select>
              </TableCell>
              <TableCell width={"10%"}>
                <TextField
                  variant="outlined"
                  type="number"
                  size="small"
                  value={row.discount || ""}
                  onChange={(e) =>
                    handleRowEdit(row.id, "discount", e.target.value)
                  }
                  fullWidth
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "12px",
                    },
                  }}
                />
              </TableCell>
              <TableCell width={"15%"}>
                <Select
                  value={row.modeOfPayment ? row.modeOfPayment : "Select"}
                  onChange={(e) =>
                    handleRowEdit(row.id, "modeOfPayment", e.target.value)
                  }
                  fullWidth
                  renderValue={(value) => value}
                  sx={{
                    backgroundColor:
                      paymentColors[row.modeOfPayment] || "transparent",
                    "& .MuiInputBase-input": {
                      fontSize: "12px",
                    },
                  }}
                >
                  {["Select", "Cash", "Card", "PPS", "PPC"].map((mode) => (
                    <MenuItem
                      key={mode}
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
                  ))}
                </Select>
              </TableCell>
              <TableCell width={"5%"}>
                <Button
                  onClick={() => {
                    setPendingJamaRows((prevRows) =>
                      prevRows.map((prevRow) =>
                        prevRow.id === row.id
                          ? {
                              id: prevRow.id,
                              date: "",
                              roomNo: "",
                              fullname: "",
                              mobileNumber: "",
                              rate: 0,
                              modeOfPayment: "",
                              discount: 0,
                              period: "UnPaid",
                              createDate: "",
                              cost: 0,
                              roomType: "",
                              type: "",
                              checkInTime: "10:00 AM",
                              checkOutTime: "10:00 AM",
                              noOfPeople: 0,
                              paidDate: "",
                            }
                          : prevRow
                      )
                    );
                    toast.success("Row Cleared Successfully");
                  }}
                  sx={{ fontSize: "12px" }}
                >
                  <DeleteOutline fontSize="small" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
            <TableCell colSpan={8} align="center" sx={{ fontSize: "12px" }}>
              <Button
                variant="contained"
                onClick={handleAddRow}
                sx={{ fontSize: "12px" }}
              >
                Add Row
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PendingJamaTable;
