import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { DataGrid } from "@mui/x-data-grid";
import {
  Box,
  CircularProgress,
  Button,
  IconButton,
  Modal,
  TextField,
  Typography,
  Stack,
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import {
  createPendingUser,
  getPendingUser,
  removePendingUser,
  updatePendingUser,
} from "../../redux/actions/restPendingAction";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const RestPendingUsersDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restPending } = useAppSelector((state) => state.restPending);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [pendingUserData, setPendingUserData] = useState({
    fullname: "",
    mobileNumber: "",
  });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    dispatch(getPendingUser());
  }, [dispatch]);

  const handleOpen = (staff = null) => {
    if (staff) {
      setEditMode(true);
      setPendingUserData({
        fullname: staff.fullname,
        mobileNumber: staff.mobileNumber,
      });
      setSelectedId(staff._id);
    } else {
      setEditMode(false);
      setPendingUserData({ fullname: "", mobileNumber: "" });
      setSelectedId(null);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    if (editMode) {
      await dispatch(updatePendingUser(selectedId, pendingUserData));
    } else {
      await dispatch(createPendingUser(pendingUserData));
    }
    dispatch(getPendingUser());
    handleClose();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      await dispatch(removePendingUser(id));
      dispatch(getPendingUser());
    }
  };

  // ** Filtered Staff List based on Search Query **
  const filteredStaff = restPending.filter(
    (staff) =>
      staff.fullname.toLowerCase().includes(search.toLowerCase()) ||
      String(staff.mobileNumber).includes(search)
  );

  const columns = [
    {
      field: "index",
      headerName: "Index",
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <>{params.api.getRowIndexRelativeToVisibleRows(params.id) + 1}</>
      ),
    },
    {
      field: "_id",
      headerName: "ID",
      width: 300,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "fullname",
      headerName: "Full Name",
      width: 200,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "mobileNumber",
      headerName: "Mobile Number",
      width: 200,
      headerAlign: "center",
      align: "center",
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
      headerAlign: "center",
      align: "center",
      renderCell: (params) => (
        <>
          <IconButton onClick={() => handleOpen(params.row)}>
            <Edit color="primary" />
          </IconButton>
          <IconButton onClick={() => handleDelete(params.row._id)}>
            <Delete color="error" />
          </IconButton>
        </>
      ),
    },
  ];

  const headerMap = {
    _id: "ID",
    fullname: "Full Name",
    mobileNumber: "Mobile Number",
  };

  const handleExportToExcel = () => {
    if (!Array.isArray(filteredStaff) || filteredStaff.length === 0) {
      toast.error("No data available to export for selected date range.");
      return;
    }
    const exportData = filteredStaff
      .filter((row) => row.type !== "group" && row.id !== "Total")
      .map(({ ...item }) => {
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
        py: 1,
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
          Restaurant Pending Users
        </Typography>
      </Box>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        justifyContent="center"
        width="100%"
      >
        <TextField
          label="Search Pending User"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mt: 2, width: "50%" }}
          slot="start"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleExportToExcel}
          sx={{ mt: 2 }}
        >
          Export to Excel
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <>
          <DataGrid
            rows={filteredStaff}
            columns={columns}
            pageSize={5}
            getRowId={(row) => row._id}
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
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => handleOpen()}
            sx={{ mt: 2 }}
          >
            Create Pending User
          </Button>
        </>
      )}

      {/* Modal for Create/Update */}
      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            p: 3,
            bgcolor: "white",
            width: 300,
            mx: "auto",
            mt: 10,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" mb={2}>
            {editMode ? "Edit Pending User" : "Create Pending User"}
          </Typography>
          <TextField
            fullWidth
            label="Full Name"
            value={pendingUserData.fullname}
            onChange={(e) =>
              setPendingUserData({
                ...pendingUserData,
                fullname: e.target.value,
              })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Mobile Number"
            value={pendingUserData.mobileNumber}
            onChange={(e) =>
              setPendingUserData({
                ...pendingUserData,
                mobileNumber: e.target.value,
              })
            }
            sx={{ mb: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleSave}
          >
            {editMode ? "Update" : "Create"}
          </Button>
        </Box>
      </Modal>
    </Box>
  );
};

export default RestPendingUsersDashboard;
