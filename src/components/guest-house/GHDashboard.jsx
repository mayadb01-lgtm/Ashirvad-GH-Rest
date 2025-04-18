import { useEffect, useState, useCallback, useMemo } from "react";
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

  // Memoized table columns
  const columns = useMemo(
    () => [
      {
        field: "id",
        headerName: "ID",
        width: 70,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "roomNo",
        headerName: "Room No",
        width: 130,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "cost",
        headerName: "Price",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "roomType",
        headerName: "Room Type",
        width: 130,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "rate",
        headerName: "Rate",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "noOfPeople",
        headerName: "People",
        width: 100,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "type",
        headerName: "Type",
        width: 120,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "modeOfPayment",
        headerName: "Payment Mode",
        width: 140,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "checkInTime",
        headerName: "Check In",
        width: 130,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "checkOutTime",
        headerName: "Check Out",
        width: 130,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "date",
        headerName: "Date",
        width: 130,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "period",
        headerName: "Period",
        width: 110,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "createDate",
        headerName: "Created At",
        width: 140,
        headerAlign: "center",
        align: "center",
      },
    ],
    []
  );

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
        Guest House Sales Dashboard
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
      </Stack>

      {/* Table & Loading State */}
      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : entries?.length > 0 ? (
        <DataGrid
          rows={entries}
          columns={columns}
          pageSize={5}
          sx={{
            mt: 2,
            height: 400,
            width: "95%",
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
          }}
          disableSelectionOnClick
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
