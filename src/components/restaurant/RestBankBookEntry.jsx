import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  TextField,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import dayjs from "dayjs";
import { getRestEntryByPaymentMethod } from "../../redux/actions/restEntryAction";

dayjs.locale("en-gb");

const BankBooksDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [selectedMethod, setSelectedMethod] = useState(null);
  const optionsForMethod = ["Cash", "Card", "PP"];

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  useEffect(() => {
    dispatch(
      getRestEntryByPaymentMethod(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  const columns = useMemo(() => {
    if (selectedMethod) {
      return [
        { field: "id", headerName: "Index", width: 150 },
        { field: "createDate", headerName: "Date", width: 150 },
        { field: selectedMethod, headerName: selectedMethod, width: 150 },
      ];
    } else {
      return [
        { field: "id", headerName: "Index", width: 150 },
        { field: "createDate", headerName: "Date", width: 150 },
        { field: "Cash", headerName: "Cash", width: 150 },
        { field: "Card", headerName: "Card", width: 150 },
        { field: "PP", headerName: "PP", width: 150 },
        { field: "grandTotal", headerName: "Grand Total", width: 150 },
      ];
    }
  }, [selectedMethod]);

  const preparedEntries = useMemo(() => {
    const totalRow = {
      id: "Total",
      Cash: restEntries
        .map((entry) => entry.Cash)
        .reduce((total, number) => total + number, 0),
      Card: restEntries
        .map((entry) => entry.Card)
        .reduce((total, number) => total + number, 0),
      PP: restEntries
        .map((entry) => entry.PP)
        .reduce((total, number) => total + number, 0),
      grandTotal: restEntries
        .map((entry) => entry.grandTotal)
        .reduce((total, number) => total + number, 0),
    };

    if (selectedMethod) {
      const rows = restEntries.map((entry, index) => ({
        id: index + 1,
        createDate: entry.createDate,
        [selectedMethod]: entry[selectedMethod],
      }));
      return [...rows, totalRow];
    } else {
      const rows = restEntries.map((entry, index) => ({
        id: index + 1,
        createDate: entry.createDate,
        Cash: entry.Cash,
        Card: entry.Card,
        PP: entry.PP,
        grandTotal: entry.grandTotal,
      }));
      return [...rows, totalRow];
    }
  }, [restEntries, selectedMethod]);

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
      <Box
        sx={{
          alignItems: "center",
          py: 3,
        }}
      >
        <Typography variant="h5" fontWeight={600} color="text.primary">
          Bank Book
        </Typography>
      </Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="subtitle2" fontWeight={500} color="text.secondary">
          Select Date Range
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            value={startDate}
            onChange={handleStartDateChange}
            format="DD-MM-YYYY"
            renderInput={(params) => <TextField {...params} size="small" />}
            views={["year", "month", "day"]}
          />
          <Typography>-</Typography>
          <DatePicker
            value={endDate}
            onChange={handleEndDateChange}
            format="DD-MM-YYYY"
            renderInput={(params) => <TextField {...params} size="small" />}
            views={["year", "month", "day"]}
          />
        </LocalizationProvider>
        <Autocomplete
          disablePortal
          id="Method"
          options={optionsForMethod}
          sx={{ width: 300 }}
          value={selectedMethod}
          onChange={(event, newValue) => {
            setSelectedMethod(newValue);
          }}
          renderInput={(params) => <TextField {...params} label="Method" />}
        />
      </Stack>
      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <DataGrid
          rows={preparedEntries}
          columns={columns}
          pageSize={5}
          sx={{ mt: 2, height: 400 }}
        />
      )}
    </Box>
  );
};

export default BankBooksDashboard;
