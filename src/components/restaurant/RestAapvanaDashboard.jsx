import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Stack,
  TextField,
  Autocomplete,
  Button,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import dayjs from "dayjs";
import { getAapvanaByDateRange } from "../../redux/actions/restEntryAction";
import { getPendingUser } from "../../redux/actions/restPendingAction";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
dayjs.locale("en-gb");

const RestAapvanaDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restEntries } = useAppSelector((state) => state.restEntry);
  const { restPending } = useAppSelector((state) => state.restPending);

  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isCombinedView, setIsCombinedView] = useState(false);
  const fileNameRef = useRef(null);

  useEffect(() => {
    dispatch(getPendingUser());
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      getAapvanaByDateRange(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  const columns = [
    {
      field: "id",
      headerName: "Index",
      width: 100,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "createDate",
      headerName: "Date",
      width: 150,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "fullname",
      headerName: "Name",
      width: 300,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "amount",
      headerName: "Amount",
      width: 150,
      headerAlign: "center",
      align: "center",
    },
  ];

  const safeRestEntries = Array.isArray(restEntries) ? restEntries : [];

  const sortedEntries = useMemo(
    () =>
      [...safeRestEntries].sort((a, b) =>
        dayjs(a.entryCreateDate).diff(dayjs(b.entryCreateDate))
      ),
    [safeRestEntries]
  );

  const filteredEntries = selectedStaff
    ? sortedEntries.filter((entry) => entry.fullname === selectedStaff.fullname)
    : sortedEntries;

  const preparedEntries = useMemo(() => {
    if (isCombinedView) {
      // Group by date + fullname
      const grouped = filteredEntries.reduce((acc, entry) => {
        const key = `${entry.createDate}-${entry.fullname}`;
        acc[key] = acc[key] || {
          createDate: entry.createDate,
          fullname: entry.fullname,
          amount: 0,
        };
        acc[key].amount += entry.amount;
        return acc;
      }, {});
      const combinedArray = Object.values(grouped).map((entry, index) => ({
        id: index + 1,
        createDate: entry.createDate,
        fullname: entry.fullname,
        amount: entry.amount,
      }));
      const totalAmount = combinedArray.reduce((sum, e) => sum + e.amount, 0);
      return [
        ...combinedArray,
        { id: "Total", createDate: "", fullname: "", amount: totalAmount },
      ];
    } else {
      // Original behavior
      const totalRow = {
        id: "Total",
        createDate: "",
        fullname: "",
        amount: filteredEntries.reduce((sum, e) => sum + e.amount, 0),
      };
      return filteredEntries
        .map((entry, index) => ({
          id: index + 1,
          createDate: entry.createDate,
          fullname: entry.fullname,
          amount: entry.amount,
        }))
        .concat(totalRow);
    }
  }, [filteredEntries, isCombinedView]);

  const headerMap = {
    createDate: "Date",
    fullname: "Staff Name",
    amount: "Amount",
  };
  const handleExportToExcel = () => {
    if (preparedEntries.length <= 1) {
      toast.error("No data available to export for selected date range.");
      return;
    }
    const headingText = fileNameRef.current?.innerText || "";
    let prefix = "Export";
    if (headingText.includes("Guest House")) prefix = "GH";
    else if (headingText.includes("Restaurant")) prefix = "R";
    else if (headingText.includes("Office")) prefix = "OB";

    const fileName = `${prefix} Aapvana Report - ${startDate.format(
      "DD-MM-YYYY"
    )} to ${endDate.format("DD-MM-YYYY")}.xlsx`;

    const exportData = preparedEntries
      .filter((row) => row.id !== "Total")
      .map((row) =>
        Object.keys(headerMap).reduce((obj, key) => {
          obj[headerMap[key]] = row[key];
          return obj;
        }, {})
      );
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Aapvana Report");
    XLSX.writeFile(workbook, fileName);
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
      <Box sx={{ alignItems: "center", py: 3 }}>
        <Typography ref={fileNameRef} variant="h5" fontWeight={600}>
          Restaurant Aapvana Dashboard
        </Typography>
      </Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="subtitle2" fontWeight={500}>
          Select Date Range
        </Typography>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="en-gb">
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            format="DD-MM-YYYY"
            textField={(params) => <TextField {...params} size="small" />}
            views={["year", "month", "day"]}
          />
          <Typography>-</Typography>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            format="DD-MM-YYYY"
            textField={(params) => <TextField {...params} size="small" />}
            views={["year", "month", "day"]}
          />
        </LocalizationProvider>
        <Autocomplete
          disablePortal
          id="fullname"
          options={restPending}
          getOptionLabel={(opt) => opt.fullname}
          style={{ width: 300 }}
          renderInput={(params) => <TextField {...params} label="Select" />}
          onChange={(_, val) => setSelectedStaff(val)}
          size="small"
        />
        <FormControlLabel
          control={
            <Switch
              checked={isCombinedView}
              onChange={(e) => setIsCombinedView(e.target.checked)}
              color="primary"
            />
          }
          label="Combined View"
        />
        <Button
          variant="outlined"
          color="primary"
          sx={{ mt: 2 }}
          onClick={handleExportToExcel}
        >
          Export to Excel
        </Button>
      </Stack>
      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <DataGrid
          getRowId={(row) => row.id}
          rows={preparedEntries}
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
        />
      )}
    </Box>
  );
};

export default RestAapvanaDashboard;
