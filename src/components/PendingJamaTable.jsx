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
import { initializePendingJamaRows, paymentColors } from "../utils/utils";

dayjs.locale("en-gb");

const PendingJamaTable = ({ pendingJamaRows, setPendingJamaRows }) => {
  const { entries, unpaidEntries } = useAppSelector((state) => state.entry);

  useEffect(() => {
    if (entries && entries.length === 0) {
      setPendingJamaRows(initializePendingJamaRows());
    }
    if (entries && entries.length > 0) {
      let initialRows = initializePendingJamaRows();
      const filteredEntries = entries.filter(
        (entry) => entry?.period && entry.period === "UnPaid"
      );
      const updateRowsWithEntries = (rows, entries) => {
        return rows.map((row) => {
          const entry = entries.find((entry) => entry.id == row.id);
          if (entry) {
            return {
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
              entryCreateDate: entry.entryCreateDate,
              date: entry.date,
              discount: entry?.discount || 0,
            };
          }
          return row;
        });
      };
      let updatedRows = initialRows;
      if (filteredEntries.length > 0) {
        updatedRows = updateRowsWithEntries(initialRows, filteredEntries);
      }
      setPendingJamaRows(updatedRows);
    }
  }, [entries, setPendingJamaRows]);

  const getRoomNoList = useMemo(() => {
    const map = new Map();
    unpaidEntries.forEach((entry) => {
      if (!map.has(entry.date)) {
        map.set(entry.date, new Set());
      }
      map.get(entry.date).add(entry.roomNo);
    });
    return map;
  }, [unpaidEntries]);

  const getFullNameList = (date, roomNo) => {
    return unpaidEntries
      .filter((entry) => entry.date === date && entry.roomNo === roomNo)
      .map((entry) => entry.fullname);
  };

  const getMobileNumberList = (date, roomNo, fullname) => {
    return unpaidEntries
      .filter(
        (entry) =>
          entry.date === date &&
          entry.roomNo === roomNo &&
          entry.fullname.toLowerCase() === fullname.toLowerCase()
      )
      .map((entry) => entry.mobileNumber);
  };

  const getRateList = (date, roomNo, fullname, mobileNumber) => {
    return unpaidEntries
      .filter(
        (entry) =>
          entry.date === date &&
          entry.roomNo === roomNo &&
          entry.fullname.toLowerCase() === fullname.toLowerCase() &&
          entry.mobileNumber === mobileNumber
      )
      .map((entry) => entry.rate);
  };

  const getOtherFields = (
    date,
    roomNo,
    fullname,
    mobileNumber,
    rate,
    discount
  ) => {
    return unpaidEntries.find((entry) =>
      entry.date === date &&
      entry.roomNo === roomNo &&
      entry.fullname.toLowerCase() === fullname.toLowerCase() &&
      entry.mobileNumber === mobileNumber &&
      entry.rate === rate &&
      entry?.discount === discount
        ? entry
        : 0
    );
  };

  // Set Other Fields from date, roomNo, fullname, mobileNumber, rate

  const getCreateDate = (
    date,
    roomNo,
    fullname,
    mobileNumber,
    rate,
    discount
  ) => {
    const entry = getOtherFields(
      date,
      roomNo,
      fullname,
      mobileNumber,
      rate,
      discount || 0
    );
    return entry?.createDate;
  };

  // const get_id = (date, roomNo, fullname, mobileNumber, rate) => {
  //   const entry = getOtherFields(date, roomNo, fullname, mobileNumber, rate);
  //   return entry?._id;
  // };
  const handleRowEdit = (id, field, value) => {
    setPendingJamaRows((prevRows) =>
      prevRows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
    const row = pendingJamaRows.find((row) => row.id === id);
    if (
      entries.length === 0 &&
      row.date &&
      row.roomNo &&
      row.fullname &&
      row.mobileNumber &&
      row.rate
    ) {
      const createDateFound = getCreateDate(
        row.date,
        row.roomNo,
        row.fullname,
        row.mobileNumber,
        row.rate,
        row?.discount || 0
      );
      // const _id = get_id(
      //   row.date,
      //   row.roomNo,
      //   row.fullname,
      //   row.mobileNumber,
      //   row.rate
      // );
      setPendingJamaRows((prevRows) =>
        prevRows.map((prevRow) =>
          prevRow.id === id
            ? {
                ...prevRow,
                createDate: prevRow.createDate
                  ? prevRow.createDate
                  : createDateFound,
              }
            : prevRow
        )
      );
    }
  };

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
                  renderValue={(value) => value}
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
                  renderValue={(value) => value}
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
                  renderValue={(value) => value}
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
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PendingJamaTable;
