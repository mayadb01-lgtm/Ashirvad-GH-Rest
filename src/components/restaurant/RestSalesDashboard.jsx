import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import dayjs from "dayjs";
import { getRestEntriesByDateRange } from "../../redux/actions/restEntryAction";

dayjs.locale("en-gb");

const RestSalesDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  useEffect(() => {
    dispatch(
      getRestEntriesByDateRange(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  const columns = [
    { field: "id", headerName: "Index", width: 150 },
    { field: "date", headerName: "Date", width: 150 },
    { field: "total", headerName: "Total", width: 150 },
  ];

  const totalRow = {
    id: "Total",
    date: "Total",
    total:
      restEntries &&
      restEntries.reduce((total, entry) => total + entry.grandTotal, 0),
  };

  const preparedEntries = restEntries
    .map((entry, index) => ({
      id: index + 1,
      date: entry.createDate,
      total: entry.grandTotal,
    }))
    .concat(totalRow);

  //   const setQuickDateRange = (days) => {
  //     setStartDate(dayjs().subtract(days, "days"));
  //     setEndDate(dayjs());
  //   };

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
          Restaurant Sales Dashboard
        </Typography>
      </Box>
      <Stack direction="row" spacing={2} alignItems="center">
        {/* Header */}
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
        {/* Quick Date Range Selection */}
        {/* <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setQuickDateRange(7)}
          >
            Last 7 Days
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setQuickDateRange(30)}
          >
            Last 30 Days
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setQuickDateRange(90)}
          >
            Last 90 Days
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setQuickDateRange(365)}
          >
            Last 12 Months
          </Button>
        </Stack> */}
      </Stack>
      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <DataGrid
          rows={preparedEntries}
          columns={columns}
          pageSize={5}
          sx={{
            mt: 2,
            height: 400,
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
          }}
        />
      )}
    </Box>
  );
};

export default RestSalesDashboard;
