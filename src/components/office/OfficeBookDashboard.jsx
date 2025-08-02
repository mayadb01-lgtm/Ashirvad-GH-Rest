import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  FormGroup,
  Autocomplete,
  Button,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import dayjs from "dayjs";
import { getOfficeBookByDateRange } from "../../redux/actions/officeBookAction";
import ModernLoader from "../../utils/util";
import { MODE_OF_PAYMENT_OPTIONS } from "../../utils/utils";
import * as XLSX from "xlsx";

// Set locale if needed
dayjs.locale("en-gb");

const OfficeBookDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, officeBook } = useAppSelector((state) => state.officeBook);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [paymentMethod, setPaymentMethod] = useState("");
  const [officeInOut, setOfficeInOut] = useState("");
  const [category, setCategory] = useState("");
  const [expenss, setExpense] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await dispatch(
          getOfficeBookByDateRange(
            startDate.format("DD-MM-YYYY"),
            endDate.format("DD-MM-YYYY")
          )
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [dispatch, startDate, endDate]);

  const categoryOptions = useMemo(() => {
    const allData =
      officeBook?.flatMap((entry) => [
        ...(entry.officeIn || []),
        ...(entry.officeOut || []),
      ]) || [];
    return Array.from(
      new Set(allData.map((item) => item.categoryName).filter(Boolean))
    ).sort();
  }, [officeBook]);

  const expenssOptions = useMemo(() => {
    const allData =
      officeBook?.flatMap((entry) => [
        ...(entry.officeIn || []),
        ...(entry.officeOut || []),
      ]) || [];
    return Array.from(
      new Set(allData.map((item) => item.expenseName).filter(Boolean))
    ).sort();
  }, [officeBook]);

  const staffOptions = useMemo(() => {
    const allData =
      officeBook?.flatMap((entry) => [
        ...(entry.officeIn || []),
        ...(entry.officeOut || []),
      ]) || [];
    return Array.from(
      new Set(allData.map((item) => item.fullname).filter(Boolean))
    ).sort();
  }, [officeBook]);

  // Base columns
  const defaultFields = useMemo(
    () => [
      { field: "inOrOut", headerName: "In/Out", width: 100 },
      { field: "amount", headerName: "Amount", width: 120 },
      { field: "modeOfPayment", headerName: "Mode", width: 120 },
      { field: "fullname", headerName: "Full Name", width: 180 },
      { field: "categoryName", headerName: "Category", width: 140 },
      { field: "expenseName", headerName: "Expense", width: 140 },
      { field: "remark", headerName: "Remark", width: 200 },
      { field: "createDate", headerName: "Date", width: 130 },
    ],
    []
  );

  const columns = useMemo(() => {
    const indexColumn = {
      field: "id",
      headerName: "No.",
      width: 80,
      headerAlign: "center",
      align: "center",
    };

    return [
      indexColumn,
      ...defaultFields.map((col) => ({
        ...col,
        headerAlign: "center",
        align: "center",
      })),
    ];
  }, [defaultFields]);

  const filteredOfficeBook = useMemo(() => {
    let rowCounter = 1;

    const officeIn =
      officeBook?.flatMap((entry) =>
        (entry.officeIn || []).map((item) => ({
          ...item,
          id: rowCounter++,
          inOrOut: "IN",
        }))
      ) || [];

    const officeOut =
      officeBook?.flatMap((entry) =>
        (entry.officeOut || []).map((item) => ({
          ...item,
          id: rowCounter++,
          inOrOut: "OUT",
        }))
      ) || [];

    const combined = [...officeIn, ...officeOut];

    // Get the correct base data
    let baseData = combined?.sort((a, b) => {
      return (
        dayjs(a.createDate, "DD-MM-YYYY").unix() -
        dayjs(b.createDate, "DD-MM-YYYY").unix()
      );
    });
    if (officeInOut === "in") baseData = officeIn;
    if (officeInOut === "out") baseData = officeOut;

    // ✅ Single filter pass for all criteria
    const filteredData = baseData.filter((item) => {
      const matchesPayment = paymentMethod
        ? item.modeOfPayment === paymentMethod
        : true;
      const matchesCategory = category ? item.categoryName === category : true;
      const matchesExpense = expenss ? item.expenseName === expenss : true;
      const matchesStaff = selectedStaff
        ? item.fullname === selectedStaff
        : true;
      return (
        matchesPayment && matchesCategory && matchesExpense && matchesStaff
      );
    });

    // ✅ Compute total
    const totalAmount = filteredData.reduce(
      (sum, curr) => sum + (curr.amount || 0),
      0
    );

    const totalRow = {
      id: "Total",
      inOrOut: officeInOut,
      amount: totalAmount,
      modeOfPayment: "",
      fullname: "",
      categoryName: "",
      expenseName: "",
      remark: "",
      createDate: "",
    };

    return [...filteredData, totalRow];
  }, [
    officeBook,
    officeInOut,
    paymentMethod,
    category,
    expenss,
    selectedStaff,
  ]);

  const headerMap = {
    id: "No.",
    inOrOut: "In/Out",
    amount: "Amount",
    modeOfPayment: "Mode of Payment",
    fullname: "Full Name",
    categoryName: "Category",
    expenseName: "Expense",
    remark: "Remark",
    createDate: "Date",
  };

  const handleExportToExcel = () => {
    if (!Array.isArray(filteredOfficeBook) || filteredOfficeBook.length === 0) {
      toast.error("No data available to export for selected date range.");
      return;
    }

    const exportData = filteredOfficeBook.map(({ ...item }) => {
      const transformed = {};
      Object.keys(headerMap).forEach((key) => {
        transformed[headerMap[key]] = item[key];
      });
      return transformed;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Guest Entries");

    XLSX.writeFile(workbook, "GuestHouseEntries.xlsx");
  };

  if (loading) {
    return <ModernLoader />;
  } else {
    return (
      <Box
        sx={{
          py: 2,
          px: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Typography variant="h5" fontWeight={600} mb={2}>
          Office Book Dashboard
        </Typography>

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          mb={2}
          flex
          gap={1}
          flexWrap={"wrap"}
        >
          <Typography
            variant="subtitle2"
            fontWeight={500}
            color="text.secondary"
          >
            Select Date:
          </Typography>
          <LocalizationProvider
            dateAdapter={AdapterDayjs}
            adapterLocale="en-gb"
          >
            <DatePicker
              value={startDate}
              onChange={handleStartDateChange}
              format="DD-MM-YYYY"
              slotProps={{
                textField: {
                  size: "small",
                },
              }}
              views={["year", "month", "day"]}
            />
            <Typography>-</Typography>
            <DatePicker
              value={endDate}
              onChange={handleEndDateChange}
              format="DD-MM-YYYY"
              slotProps={{
                textField: {
                  size: "small",
                },
              }}
              views={["year", "month", "day"]}
            />
          </LocalizationProvider>
          <Button
            variant="outlined"
            color="primary"
            sx={{ mt: 2 }}
            onClick={handleExportToExcel}
          >
            Export to Excel
          </Button>
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          mb={2}
          flex
          gap={1}
          flexWrap={"wrap"}
        >
          <Autocomplete
            options={MODE_OF_PAYMENT_OPTIONS}
            sx={{ width: 200 }}
            value={paymentMethod}
            onChange={(e, value) => setPaymentMethod(value)}
            size="small"
            renderInput={(params) => (
              <TextField {...params} label="Payment Method" />
            )}
          />
          <Autocomplete
            options={[
              { label: "Office In", value: "in" },
              { label: "Office Out", value: "out" },
            ]}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(opt, val) => opt.value === val?.value}
            sx={{ width: 200 }}
            value={
              ["in", "out"].includes(officeInOut)
                ? {
                    label: `Office ${officeInOut === "in" ? "In" : "Out"}`,
                    value: officeInOut,
                  }
                : null
            }
            onChange={(e, newValue) => setOfficeInOut(newValue?.value || "")}
            size="small"
            renderInput={(params) => (
              <TextField {...params} label="Office In/Out" />
            )}
          />
          <Autocomplete
            options={categoryOptions}
            sx={{ width: 200 }}
            value={category || null}
            onChange={(e, newValue) => setCategory(newValue || "")}
            size="small"
            renderInput={(params) => (
              <TextField {...params} label="Category" placeholder="All" />
            )}
          />
          <Autocomplete
            options={expenssOptions}
            sx={{ width: 200 }}
            value={expenss || null}
            onChange={(e, newValue) => setExpense(newValue || "")}
            size="small"
            renderInput={(params) => (
              <TextField {...params} label="Expense" placeholder="All" />
            )}
          />
          {/* Filter For Staff - fullname */}
          <Autocomplete
            disablePortal
            id="fullname"
            options={staffOptions}
            value={selectedStaff || null}
            getOptionLabel={(option) => option || ""}
            sx={{ width: 200 }}
            renderInput={(params) => (
              <TextField {...params} label="Select Staff" placeholder="All" />
            )}
            onChange={(e, newValue) => setSelectedStaff(newValue || "")}
            size="small"
          />
        </Stack>

        {officeBook ? (
          <DataGrid
            rows={filteredOfficeBook}
            columns={columns}
            pageSize={5}
            WebkitFontSmoothing="auto"
            letterSpacing={"normal"}
            sx={{
              mt: 2,
              height: 400,
              width: "cover",
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
        ) : (
          <Typography variant="subtitle1" color="text.secondary" mt={2}>
            No entries for the selected date.
          </Typography>
        )}
      </Box>
    );
  }
};

export default OfficeBookDashboard;
