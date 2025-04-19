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
import { getEntriesByDateRange } from "../../redux/actions/entryAction";
import dayjs from "dayjs";

dayjs.locale("en-gb");

const GHSalesDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, entries } = useAppSelector((state) => state.entry);
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
      getEntriesByDateRange(
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
      entries &&
      entries.length > 0 &&
      entries
        ?.map((entry) =>
          entry?.entry?.map((item) => item.rate).reduce((a, b) => a + b, 0)
        )
        .reduce((a, b) => a + b, 0),
  };

  const preparedEntries =
    entries &&
    entries.length > 0 &&
    entries
      ?.map((entry, index) => ({
        id: index + 1,
        date: entry.date,
        total: entry?.entry
          ?.map((item) => item.rate)
          .reduce((a, b) => a + b, 0),
      }))
      .concat(totalRow);

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
          Guest House Sales Dashboard
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

export default GHSalesDashboard;
