import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  TextField,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { getEntriesByDate } from "../../redux/actions/entryAction";
import dayjs from "dayjs";

dayjs.locale("en-gb");

const GHDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, entries } = useAppSelector((state) => state.entry);

  // Set default date to today
  const [selectedDate, setSelectedDate] = useState(
    dayjs().format("DD-MM-YYYY")
  );

  const [selectedExtras, setSelectedExtras] = useState([]);

  // Handle Date Change
  const handleDateChange = useCallback(
    (newDate) => {
      if (newDate) {
        const formattedDate = newDate.format("DD-MM-YYYY");
        if (formattedDate !== selectedDate) {
          setSelectedDate(formattedDate);
        }
      }
    },
    [selectedDate]
  );

  // Fetch data on date change
  useEffect(() => {
    dispatch(getEntriesByDate(selectedDate));
  }, [dispatch, selectedDate]);

  const defaultFields = useMemo(
    () => [
      { field: "id", headerName: "ID", width: 100 },
      { field: "period", headerName: "D/N/UnPaid", width: 110 },
      { field: "roomNo", headerName: "Room No", width: 130 },
      { field: "cost", headerName: "Price", width: 100 },
      { field: "roomType", headerName: "Room Type", width: 130 },
      { field: "rate", headerName: "Rate", width: 100 },
      { field: "noOfPeople", headerName: "People", width: 100 },
      { field: "fullname", headerName: "Full Name", width: 150 },
      { field: "type", headerName: "Type", width: 120 },
      { field: "modeOfPayment", headerName: "Payment Mode", width: 140 },
      { field: "date", headerName: "Date", width: 130 },
      { field: "discount", headerName: "Discount", width: 100 },
      { field: "isPaid", headerName: "Paid", width: 90 },
      { field: "createDate", headerName: "Created At", width: 140 },
    ],
    []
  );

  const extraFields = useMemo(
    () => ({
      mobileNumber: { field: "mobileNumber", headerName: "Mobile", width: 130 },
      advancePayment: {
        field: "advancePayment",
        headerName: "Advance",
        width: 120,
      },
      // advancePaymentDate: {
      //   field: "advancePaymentDate",
      //   headerName: "Advance Date",
      //   width: 140,
      // },
      // reservationId: {
      //   field: "reservationId",
      //   headerName: "Reservation ID",
      //   width: 160,
      // },
      paidDate: {
        field: "paidDate",
        headerName: "Paid Date",
        width: 130,
      },
      updatedDateTime: {
        field: "updatedDateTime",
        headerName: "Updated At",
        width: 150,
      },
      checkInTime: {
        field: "checkInTime",
        headerName: "Check In",
        width: 130,
      },
      checkOutTime: {
        field: "checkOutTime",
        headerName: "Check Out",
        width: 130,
      },
    }),
    []
  );

  const columns = useMemo(() => {
    const extras = selectedExtras.map((key) => extraFields[key]);
    return [...defaultFields, ...extras].map((col) => ({
      ...col,
      headerAlign: "center",
      align: "center",
    }));
  }, [defaultFields, extraFields, selectedExtras]);

  const handleExtraToggle = (field) => {
    setSelectedExtras((prev) =>
      prev.includes(field)
        ? prev.filter((item) => item !== field)
        : [...prev, field]
    );
  };

  console.log("Entries", entries);

  const totalRow = {
    id: "Total",
    _id: "Total",
    period: "",
    roomNo: "",
    cost: "",
    roomType: "",
    rate:
      entries &&
      entries.length > 0 &&
      entries?.reduce((sum, row) => Number(sum) + Number(row.rate), 0),
    discount:
      entries &&
      entries.length > 0 &&
      entries?.reduce((sum, row) => Number(sum) + Number(row.discount), 0),
    noOfPeople: "",
    fullname: "",
    type: "",
    modeOfPayment: "",
    date: "",
    isPaid: "",
    createDate: "",
    mobileNumber: "",
    advancePayment: "",
    // advancePaymentDate: "",
    // reservationId: "",
    paidDate: "",
    updatedDateTime: "",
    checkInTime: "",
    checkOutTime: "",
  };

  return (
    <Box
      sx={{
        py: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
      }}
    >
      <Typography variant="h5" fontWeight={600} color="text.primary" mb={2}>
        Guest House - Detailed Dashboard
      </Typography>

      {/* Date Selection */}
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <Typography variant="subtitle2" fontWeight={500} color="text.secondary">
          Select Date:
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            value={dayjs(selectedDate, "DD-MM-YYYY")}
            onChange={handleDateChange}
            format="DD-MM-YYYY"
            renderInput={(params) => (
              <TextField {...params} variant="outlined" size="small" />
            )}
          />
        </LocalizationProvider>

        {/* Extra Fields Checkboxes */}
        <FormGroup row sx={{ ml: 2 }}>
          {Object.keys(extraFields).map((key) => (
            <FormControlLabel
              key={key}
              control={
                <Checkbox
                  checked={selectedExtras.includes(key)}
                  onChange={() => handleExtraToggle(key)}
                />
              }
              label={extraFields[key].headerName}
            />
          ))}
        </FormGroup>
      </Stack>

      {/* Table & Loading State */}
      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : entries?.length > 0 ? (
        <DataGrid
          rows={[...entries, totalRow]}
          columns={columns}
          pageSize={5}
          WebkitFontSmoothing="auto"
          letterSpacing={"normal"}
          sx={{
            mt: 2,
            height: 400,
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
            "& .MuiDataGrid-cell:hover": {
              color: "primary.main",
            },
            "& .MuiDataGrid-columnHeader, .MuiDataGrid-cell": {
              border: "1px solid #f0f0f0",
            },
            "& .MuiDataGrid-row[data-id='Total'] .MuiDataGrid-cell": {
              fontWeight: "bold",
            },
          }}
          getRowId={(row) => row._id}
        />
      ) : (
        <Typography variant="subtitle1" color="text.secondary" mt={2}>
          No Data Available for the selected date.
        </Typography>
      )}
    </Box>
  );
};

export default GHDashboard;
