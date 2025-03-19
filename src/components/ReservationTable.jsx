import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  MenuItem,
  Select,
  Button,
} from "@mui/material";
import dayjs from "dayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DeleteOutline } from "@mui/icons-material";
import { useEffect } from "react";
import { useAppSelector } from "../redux/hooks";
import { initializeReservationData } from "../utils/utils";
dayjs.locale("en-gb");

const ReservationTable = ({ reservationData, setReservationData }) => {
  const { entries } = useAppSelector((state) => state.entry);

  useEffect(() => {
    if (!entries || entries.length === 0) {
      setReservationData(initializeReservationData());
      return;
    }

    const initialRows = initializeReservationData();
    const filteredResEntries = entries.filter(
      (entry) => entry?.period === "reservation"
    );

    const updatedRows = initialRows.map((row) => {
      const matchedEntry = filteredResEntries.find(
        (entry) => entry.id == row.id
      );
      return matchedEntry ? { ...row, ...matchedEntry } : row;
    });

    setReservationData(updatedRows);
  }, [entries, setReservationData]);

  const handleRowEdit = (updatedRow) => {
    setReservationData((prevRows) =>
      prevRows.map((row) => (row.id === updatedRow.id ? updatedRow : row))
    );
  };

  return (
    <div>
      <TableContainer component={Paper} sx={{ maxHeight: 600, boxShadow: 3 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow sx={{ border: "1px solid #000" }}>
              {[
                "ID",
                "Reservation ID",
                "Full Name",
                "Mobile No",
                "No of People",
                "Check In Date Time",
                "Check Out Date Time",
                "Rate",
                "Advance",
                "Advance Date",
                "Mode of Payment",
                "Action",
              ].map((header, index) => (
                <TableCell
                  key={index}
                  sx={{
                    fontWeight: "bold",
                    backgroundColor: "#cce5ff",
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
            {reservationData.map((row, index) => (
              <TableRow
                key={index}
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
                <TableCell width={"12%"}>
                  <TextField
                    type="text"
                    value={row.reservationId}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell width={"20%"}>
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
                <TableCell width={"12%"} type="number">
                  <TextField
                    type="number"
                    value={row.mobileNumber ? row.mobileNumber : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleRowEdit({ ...row, mobileNumber: value });
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell width={"12%"} type="number">
                  <TextField
                    type="number"
                    value={row.noOfPeople ? row.noOfPeople : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleRowEdit({ ...row, noOfPeople: value });
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell width={"12%"}>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale="en-gb"
                  >
                    <DateTimePicker
                      value={
                        row.checkInDateTime
                          ? dayjs(row.checkInDateTime, "DD-MM-YYYY HH:mm:ss")
                          : null
                      }
                      onChange={(newValue) => {
                        const formattedDateTime = newValue.format(
                          "DD-MM-YYYY HH:mm:ss"
                        );
                        handleRowEdit({
                          ...row,
                          checkInDateTime: formattedDateTime,
                        });
                      }}
                      slots={{
                        textField: (params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                          />
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
                <TableCell width={"12%"}>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale="en-gb"
                  >
                    <DateTimePicker
                      value={
                        row.checkOutDateTime
                          ? dayjs(row.checkOutDateTime, "DD-MM-YYYY HH:mm:ss")
                          : null
                      }
                      onChange={(newValue) => {
                        const formattedDateTime = newValue.format(
                          "DD-MM-YYYY HH:mm:ss"
                        );
                        handleRowEdit({
                          ...row,
                          checkOutDateTime: formattedDateTime,
                        });
                      }}
                      slots={{
                        textField: (params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                          />
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
                <TableCell width={"12%"} type="number">
                  <TextField
                    type="number"
                    value={row.rate ? row.rate : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleRowEdit({ ...row, rate: value });
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell width={"12%"} type="number">
                  <TextField
                    type="number"
                    value={row.advancePayment ? row.advancePayment : ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleRowEdit({ ...row, advancePayment: value });
                    }}
                    sx={{
                      "& .MuiInputBase-input": {
                        textAlign: "center",
                        fontSize: "12px",
                      },
                    }}
                  />
                </TableCell>
                <TableCell width={"12%"}>
                  <LocalizationProvider
                    dateAdapter={AdapterDayjs}
                    adapterLocale="en-gb"
                  >
                    <DateTimePicker
                      value={
                        row.advancePaymentDate
                          ? dayjs(row.advancePaymentDate, "DD-MM-YYYY")
                          : null
                      }
                      onChange={(newValue) => {
                        const formattedDateTime = newValue.format("DD-MM-YYYY");
                        handleRowEdit({
                          ...row,
                          advancePaymentDate: formattedDateTime,
                        });
                      }}
                      slots={{
                        textField: (params) => (
                          <TextField
                            {...params}
                            variant="outlined"
                            size="small"
                          />
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
                <TableCell width={"10%"}>
                  <Select
                    value={row.modeOfPayment ? row.modeOfPayment : "Select"}
                    onChange={(e) => {
                      const value = e.target.value;
                      handleRowEdit({ ...row, modeOfPayment: value });
                    }}
                    sx={{
                      width: "100%",
                      fontSize: "12px",
                    }}
                  >
                    {["Select", "Cash", "Card", "PPS", "PPC", "UnPaid"].map(
                      (mode, index) => (
                        <MenuItem
                          key={index}
                          value={mode}
                          sx={{
                            fontSize: "12px",
                            color: "#000",
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
                <TableCell width={"2%"}>
                  <Button
                    onClick={() => {
                      setReservationData((prevRows) =>
                        prevRows.map((prevRow) =>
                          prevRow.id === row.id
                            ? {
                                ...prevRow,
                                reservationId: Date.now() + row.id,
                                fullname: "",
                                mobileNumber: "",
                                noOfPeople: "",
                                checkInDateTime: "",
                                checkOutDateTime: "",
                                rate: "",
                                advancePayment: "",
                                advancePaymentDate: "",
                                modeOfPayment: "",
                              }
                            : prevRow
                        )
                      );
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
    </div>
  );
};

export default ReservationTable;
