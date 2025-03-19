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
} from "@mui/material";
import { Add, Edit, Delete } from "@mui/icons-material";
import {
  getRestStaff,
  createRestStaff,
  updateRestStaff,
  removeRestStaff,
} from "../../redux/actions/restStaffAction";

const RestStaffDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restStaff } = useAppSelector((state) => state.restStaff);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [staffData, setStaffData] = useState({
    fullname: "",
    mobileNumber: "",
  });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    dispatch(getRestStaff());
  }, [dispatch]);

  const handleOpen = (staff = null) => {
    if (staff) {
      setEditMode(true);
      setStaffData({
        fullname: staff.fullname,
        mobileNumber: staff.mobileNumber,
      });
      setSelectedId(staff._id);
    } else {
      setEditMode(false);
      setStaffData({ fullname: "", mobileNumber: "" });
      setSelectedId(null);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = () => {
    if (editMode) {
      dispatch(updateRestStaff(selectedId, staffData));
    } else {
      dispatch(createRestStaff(staffData));
    }
    handleClose();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this staff member?")) {
      dispatch(removeRestStaff(id));
    }
  };

  // ** Filtered Staff List based on Search Query **
  const filteredStaff = restStaff.filter(
    (staff) =>
      staff.fullname.toLowerCase().includes(search.toLowerCase()) ||
      String(staff.mobileNumber).includes(search)
  );

  const columns = [
    { field: "_id", headerName: "ID", width: 300 },
    { field: "fullname", headerName: "Full Name", width: 200 },
    { field: "mobileNumber", headerName: "Mobile Number", width: 200 },
    {
      field: "actions",
      headerName: "Actions",
      width: 150,
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
      {/* Search Bar */}
      <TextField
        label="Search Staff"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mt: 2, width: "50%" }}
        slot="start"
      />

      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <>
          <DataGrid
            rows={filteredStaff}
            columns={columns}
            pageSize={5}
            getRowId={(row) => row._id}
            sx={{ mt: 2, height: 400, width: "90%" }}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => handleOpen()}
            sx={{ mt: 2 }}
          >
            Create Staff
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
            {editMode ? "Edit Staff" : "Create Staff"}
          </Typography>
          <TextField
            fullWidth
            label="Full Name"
            value={staffData.fullname}
            onChange={(e) =>
              setStaffData({ ...staffData, fullname: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Mobile Number"
            value={staffData.mobileNumber}
            onChange={(e) =>
              setStaffData({ ...staffData, mobileNumber: e.target.value })
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

export default RestStaffDashboard;
