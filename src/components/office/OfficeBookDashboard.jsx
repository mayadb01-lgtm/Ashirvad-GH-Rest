import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  FormGroup,
  Autocomplete,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import dayjs from "dayjs";
import { getOfficeBookByDate } from "../../redux/actions/officeBookAction";
import ModernLoader from "../../utils/util";
import { MODE_OF_PAYMENT_OPTIONS } from "../../utils/utils";

// Set locale if needed
dayjs.locale("en-gb");

const OfficeBookDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, officeBook } = useAppSelector((state) => state.officeBook);
  const today = dayjs().format("DD-MM-YYYY");
  const [selectedDate, setSelectedDate] = useState(today);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [officeInOut, setOfficeInOut] = useState("");

  // Handle date change
  const handleDateChange = useCallback(
    (newDate) => {
      if (newDate) {
        const formatted = newDate.format("DD-MM-YYYY");
        if (formatted !== selectedDate) setSelectedDate(formatted);
      }
    },
    [selectedDate]
  );

  // Fetch on date change
  useEffect(() => {
    dispatch(getOfficeBookByDate(selectedDate));
  }, [dispatch, selectedDate]);

  // Base columns
  const defaultFields = useMemo(
    () => [
      { field: "amount", headerName: "Amount", width: 120 },
      { field: "modeOfPayment", headerName: "Mode", width: 120 },
      { field: "fullname", headerName: "Full Name", width: 180 },
      { field: "category", headerName: "Category", width: 140 },
      { field: "remark", headerName: "Remark", width: 200 },
      { field: "createDate", headerName: "Date", width: 130 },
    ],
    []
  );

  const columns = useMemo(() => {
    const indexColumn = {
      field: "index",
      headerName: "No.",
      width: 80,
      headerAlign: "center",
      align: "center",
      sortable: false,
      renderCell: (params) =>
        params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
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
    const officeIn = officeBook?.officeIn || [];
    const officeOut = officeBook?.officeOut || [];

    const combined = [...officeIn, ...officeOut];

    return paymentMethod
      ? (officeInOut === "in"
          ? officeIn
          : officeInOut === "out"
            ? officeOut
            : combined
        ).filter((item) => item.modeOfPayment === paymentMethod)
      : officeInOut === "in"
        ? officeIn
        : officeInOut === "out"
          ? officeOut
          : combined;
  }, [officeBook?.officeIn, officeBook?.officeOut, officeInOut, paymentMethod]);

  if (loading) {
    return <ModernLoader />;
  } else {
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
        <Typography variant="h5" fontWeight={600} mb={2}>
          Office Book Dashboard
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
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
              value={dayjs(selectedDate, "DD-MM-YYYY")}
              onChange={handleDateChange}
              format="DD-MM-YYYY"
              slotProps={{ textField: { size: "small", variant: "outlined" } }}
            />
          </LocalizationProvider>

          <FormGroup row sx={{ ml: 2, gap: 2 }}>
            <Autocomplete
              options={MODE_OF_PAYMENT_OPTIONS}
              sx={{ width: 200 }}
              renderInput={(params) => (
                <TextField {...params} label="Payment Method" />
              )}
              value={paymentMethod}
              onChange={(e, value) => setPaymentMethod(value)}
            />
            <Autocomplete
              options={[
                { label: "Office In", value: "in" },
                { label: "Office Out", value: "out" },
              ]}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(opt, val) => opt.value === val.value}
              sx={{ width: 200 }}
              renderInput={(params) => (
                <TextField {...params} label="Office In/Out" />
              )}
              value={
                ["in", "out"].includes(officeInOut)
                  ? {
                      label: `Office ${officeInOut === "in" ? "In" : "Out"}`,
                      value: officeInOut,
                    }
                  : null
              }
              onChange={(e, newValue) => setOfficeInOut(newValue?.value || "")}
            />
          </FormGroup>
        </Stack>

        {officeBook?.officeIn || officeBook?.officeOut ? (
          <DataGrid
            rows={filteredOfficeBook}
            columns={columns}
            pageSize={5}
            sx={{
              mt: 2,
              height: 420,
              width: "cover",
              "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
            }}
            disableSelectionOnClick
            getRowId={(row) => row._id || row.id}
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
