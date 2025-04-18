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

dayjs.locale("en-gb");

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
    dispatch(getEntriesByDateRange(startDate, endDate));
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
      // {
      //   field: "actions",
      //   headerName: "Actions",
      //   width: 120,
      //   sortable: false,
      //   headerAlign: "center",
      //   align: "center",
      //   renderCell: (params) => (
      //     <>
      //       <Tooltip title="Edit">
      //         <IconButton
      //           color="primary"
      //           onClick={() => handleEdit(params.row)}
      //         >
      //           <EditIcon fontSize="small" />
      //         </IconButton>
      //       </Tooltip>
      //       <Tooltip title="Delete">
      //         <IconButton
      //           color="error"
      //           onClick={() =>
      //             setEntryToDelete(params.row) & setOpenDeleteConfirm(true)
      //           }
      //         >
      //           <DeleteIcon fontSize="small" />
      //         </IconButton>
      //       </Tooltip>
      //     </>
      //   ),
      // },
    ],
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
      </Stack>

      {/* Loading or DataGrid */}
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
            width: "95%",
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
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
