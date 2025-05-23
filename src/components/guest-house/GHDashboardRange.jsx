import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  Box,
  Typography,
  Stack,
  TextField,
  CircularProgress,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  // deleteEntryByDate,
  getEntriesByDateRange,
  updateEntryByDate,
} from "../../redux/actions/entryAction";
import dayjs from "dayjs";
// import { IconButton, Tooltip } from "@mui/material";
// import EditIcon from "@mui/icons-material/Edit";
// import DeleteIcon from "@mui/icons-material/Delete";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

dayjs.locale("en-gb");

const headerMap = {
  roomNo: "Room Number",
  cost: "Cost",
  rate: "Rate",
  noOfPeople: "No. of People",
  modeOfPayment: "Payment Mode",
  fullname: "Full Name",
  mobileNumber: "Mobile Number",
  checkInTime: "Check-In Time",
  checkOutTime: "Check-Out Time",
  advancePayment: "Advance Payment",
  advancePaymentDate: "Advance Payment Date",
  reservationId: "Reservation ID",
  date: "Booking Date",
  createDate: "Created Date",
  updatedDateTime: "Last Updated",
  period: "Stay Period",
  createdAt: "Created At",
  paidDate: "Paid Date",
  _id: "Entry ID",
  isPaid: "Is Paid?",
  updatedAt: "Updated At",
  roomType: "Room Type",
};

const GHSalesDashboardRange = () => {
  const dispatch = useAppDispatch();
  const { loading, entries } = useAppSelector((state) => state.entry);
  const [startDate, setStartDate] = useState(dayjs().startOf("month"));
  const [endDate, setEndDate] = useState(dayjs());
  const [openEditForm, setOpenEditForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  // const [entryToDelete, setEntryToDelete] = useState(null);

  // Fetch entries based on the selected date range
  useEffect(() => {
    dispatch(
      getEntriesByDateRange(
        startDate.format("DD-MM-YYYY"),
        endDate.format("DD-MM-YYYY")
      )
    );
  }, [dispatch, startDate, endDate]);

  const handleStartDateChange = useCallback((newDate) => {
    if (newDate) setStartDate(newDate);
  }, []);

  const handleEndDateChange = useCallback((newDate) => {
    if (newDate) setEndDate(newDate);
  }, []);

  // const handleEdit = (row) => {
  //   setEditEntry(row);
  //   setOpenEditForm(true); // Open the edit form
  // };

  const handleSaveEdit = async () => {
    try {
      await dispatch(updateEntryByDate(editEntry.date, editEntry)); // Update the entry
      toast.success("Entry updated successfully");
      setOpenEditForm(false); // Close the form after saving
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error updating entry");
    }
  };

  // const handleDelete = async () => {
  //   try {
  //     await dispatch(deleteEntryByDate(entryToDelete.date));
  //     toast.success("Entry deleted successfully");
  //     setOpenDeleteConfirm(false); // Close the confirmation dialog
  //   } catch (error) {
  //     toast.error(error?.response?.data?.message || "Error deleting entry");
  //   }
  // };

  // Column definitions for DataGrid
  const baseColumns = [
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
  ];

  const columns = useMemo(
    () =>
      baseColumns.map((col) => ({
        ...col,
        renderCell: (params) => {
          if (params.row.type === "group") {
            return col.field === "roomNo" ? (
              <strong>{params.row.date}</strong>
            ) : (
              ""
            );
          }
          return params.value;
        },
      })),
    []
  );

  // Prepare entries for DataGrid safely
  const preparedEntries = Array.isArray(entries)
    ? entries.flatMap((entry) =>
        Array.isArray(entry.entry)
          ? entry.entry.map((item, index) => ({
              ...item,
              id: index + 1,
              date: entry.date,
              createdAt: entry.createdAt,
            }))
          : []
      )
    : [];

  const getGroupedRows = (entries) => {
    let idCounter = 1;
    const grouped = [];

    // Sort entries by date to keep groups ordered
    const sortedEntries = [...entries].sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    const dateMap = {};

    sortedEntries.forEach((entry) => {
      if (!dateMap[entry.date]) {
        // Add a group header row
        dateMap[entry.date] = true;
        grouped.push({
          id: `group-${entry.date}`, // unique id
          date: entry.date,
          type: "group",
        });
      }

      // Add actual entry with unique ID
      grouped.push({
        ...entry,
        id: `entry-${idCounter++}`, // Ensure uniqueness
        type: "entry",
      });
    });

    return grouped;
  };

  // Safely calculate total cost
  const totalCost = Array.isArray(entries)
    ? entries
        .flatMap((entry) =>
          Array.isArray(entry.entry)
            ? entry.entry.map((item) => item?.rate || 0)
            : []
        )
        .reduce((a, b) => a + b, 0)
    : 0;

  // Add total row if entries exist
  if (preparedEntries.length > 0) {
    preparedEntries.push({
      id: "Total",
      date: "Total",
      roomNo: "",
      cost: "",
      rate: totalCost,
      type: "",
    });
  }

  const handleExportToExcel = () => {
    if (!Array.isArray(preparedEntries) || preparedEntries.length === 0) {
      toast.error("No data available to export for selected date range.");
      return;
    }
    const exportData = preparedEntries
      .filter((row) => row.type !== "group" && row.id !== "Total")
      .map(({ id, type, ...item }) => {
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
      <Typography
        variant="h5"
        fontWeight={600}
        color="text.primary"
        sx={{ py: 3 }}
      >
        Guest House Dashboard - Date Range
      </Typography>

      {/* Date Range Picker */}
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
        <Button
          variant="outlined"
          color="primary"
          sx={{ mt: 2 }}
          onClick={handleExportToExcel}
        >
          Export to Excel
        </Button>
      </Stack>

      {/* Loading or DataGrid */}
      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <DataGrid
          rows={getGroupedRows(preparedEntries)}
          columns={columns}
          pageSize={100}
          getRowClassName={(params) =>
            params.row.type === "group" ? "group-header" : ""
          }
          getRowHeight={(params) => (params.model.type === "group" ? 50 : null)}
          sx={{
            mt: 2,
            height: 600,
            width: "95%",
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
            "& .group-header": {
              backgroundColor: "#f0f0f0",
              fontWeight: "bold",
              fontSize: "1rem",
              color: "#333",
            },
          }}
        />
      )}

      {/* Edit Entry Form */}
      {openEditForm && (
        <Box sx={{ width: "100%", mt: 2 }}>
          <Typography variant="h6">Edit Entry</Typography>
          <TextField
            label="Room No"
            value={editEntry?.roomNo || ""}
            onChange={(e) =>
              setEditEntry({ ...editEntry, roomNo: e.target.value })
            }
            fullWidth
            margin="normal"
          />
          {/* Add other fields for editing here */}
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
          >
            Save
          </Button>
          <Button
            onClick={() => setOpenEditForm(false)}
            variant="outlined"
            sx={{ mt: 2, ml: 1 }}
          >
            Cancel
          </Button>
        </Box>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteConfirm}
        onClose={() => setOpenDeleteConfirm(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          Are you sure you want to delete this entry?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteConfirm(false)} color="primary">
            Cancel
          </Button>
          {/* <Button onClick={handleDelete} color="error">
            Delete
          </Button> */}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GHSalesDashboardRange;
