import { useEffect, useState, useMemo } from "react";
import {
  Box,
  CircularProgress,
  Button,
  IconButton,
  Modal,
  TextField,
  Typography,
  Stack,
  Tooltip,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Add, Edit, Delete } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  createOfficeCategory,
  deleteOfficeCategory,
  getOfficeAllCategories,
  updateOfficeCategory,
} from "../../redux/actions/officeBookAction";

const CategoryCard = ({ category, onEdit, onDelete }) => (
  <Grid
    container
    spacing={1}
    sx={{
      p: 1,
      border: "1px solid #e0e0e0",
      borderRadius: 2,
      bgcolor: "#fff",
      alignItems: "center",
      minHeight: 55,
      display: "flex",
      justifyContent: "space-between",
    }}
  >
    <Grid xs>
      <Tooltip title={category.categoryName} arrow placement="top">
        <Typography fontWeight={600} fontSize="0.9rem" noWrap>
          {category.categoryName}
        </Typography>
      </Tooltip>

      <Tooltip
        title={category.categoryDescription || "—"}
        arrow
        placement="top"
      >
        <Typography
          variant="body2"
          color="text.secondary"
          noWrap
          sx={{ fontSize: "0.75rem", cursor: "default" }}
        >
          {category.categoryDescription || "—"}
        </Typography>
      </Tooltip>
    </Grid>

    <Grid xs="auto" display="flex" gap={0.5}>
      <IconButton onClick={() => onEdit(category)} size="small">
        <Edit fontSize="small" sx={{ color: "primary.main" }} />
      </IconButton>
      <IconButton onClick={() => onDelete(category._id)} size="small">
        <Delete fontSize="small" sx={{ color: "error.main" }} />
      </IconButton>
    </Grid>
  </Grid>
);

const OfficeCategoryDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, officeCategory } = useAppSelector(
    (state) => state.officeBook
  );

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [categoryData, setCategoryData] = useState({
    categoryName: "",
    categoryDescription: "",
  });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    dispatch(getOfficeAllCategories());
  }, [dispatch]);

  const handleOpen = (category = null) => {
    if (category) {
      setEditMode(true);
      setCategoryData({
        categoryName: category.categoryName || "",
        categoryDescription: category.categoryDescription || "",
      });
      setSelectedId(category._id);
    } else {
      setEditMode(false);
      setCategoryData({ categoryName: "", categoryDescription: "" });
      setSelectedId(null);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    const trimmedName = categoryData.categoryName.trim();
    const trimmedDesc = categoryData.categoryDescription.trim();
    if (!trimmedName || !trimmedDesc) return;

    if (editMode) {
      await dispatch(
        updateOfficeCategory(selectedId, {
          categoryName: trimmedName,
          categoryDescription: trimmedDesc,
        })
      );
    } else {
      await dispatch(
        createOfficeCategory({
          categoryName: trimmedName,
          categoryDescription: trimmedDesc,
        })
      );
    }

    await dispatch(getOfficeAllCategories());
    handleClose();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      await dispatch(deleteOfficeCategory(id));
      await dispatch(getOfficeAllCategories());
    }
  };

  const filteredCategories = useMemo(() => {
    if (!Array.isArray(officeCategory)) return [];
    return officeCategory.filter((category) =>
      category.categoryName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [officeCategory, search]);
  
  const isCategoryDataChanged = useMemo(() => {
    if (!editMode || !selectedId) return false;
    if (!Array.isArray(officeCategory)) return false;
    const original = officeCategory.find((c) => c._id === selectedId);
    return (
      original &&
      (categoryData.categoryName !== original.categoryName ||
        categoryData.categoryDescription !== original.categoryDescription)
    );
  }, [categoryData, officeCategory, editMode, selectedId]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Manage Office Categories
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <TextField
          size="small"
          label="Search"
          variant="outlined"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
        >
          Create
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)",
              lg: "repeat(4, 1fr)",
              xl: "repeat(5, 1fr)",
            },
            gap: 1.5,
          }}
        >
          {filteredCategories.map((category) => (
            <CategoryCard
              key={category._id}
              category={category}
              onEdit={handleOpen}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}

      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            backgroundColor: "#fff",
            p: 4,
            mx: "auto",
            my: "10vh",
            borderRadius: 3,
            width: { xs: "90%", sm: "400px" },
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {isCategoryDataChanged && (
            <Typography variant="body2" color="error">
              You have unsaved changes
            </Typography>
          )}

          <Typography variant="h6">
            {editMode ? "Edit Category" : "Create Category"}
          </Typography>

          <TextField
            label="Category Name"
            value={categoryData.categoryName}
            onChange={(e) =>
              setCategoryData((prev) => ({
                ...prev,
                categoryName: e.target.value,
              }))
            }
            fullWidth
          />
          <TextField
            label="Description"
            value={categoryData.categoryDescription}
            onChange={(e) =>
              setCategoryData((prev) => ({
                ...prev,
                categoryDescription: e.target.value,
              }))
            }
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleSave}
              disabled={
                !categoryData.categoryName.trim() ||
                !categoryData.categoryDescription.trim()
              }
            >
              {editMode ? "Update" : "Create"}
            </Button>
            <Button variant="outlined" fullWidth onClick={handleClose}>
              Cancel
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};

export default OfficeCategoryDashboard;
