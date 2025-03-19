import { useEffect, useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  CircularProgress,
  Button,
  IconButton,
  Modal,
  TextField,
  Typography,
  Tooltip,
  Stack,
} from "@mui/material";
import { Add, Edit, Delete, ExpandMore } from "@mui/icons-material";
import {
  getRestCategory,
  createRestCategory,
  updateRestCategory,
  removeRestCategory,
} from "../../redux/actions/restCategoryAction";

const CategoryAccordion = ({ category, onEdit, onDelete }) => (
  <Accordion
    sx={{
      borderRadius: 2,
      boxShadow: 2,
      overflow: "hidden",
      backgroundColor: "#f9f9f9",
      margin: "10px",
      "&:before": { display: "none" },
    }}
  >
    <AccordionSummary
      expandIcon={<ExpandMore sx={{ color: "primary.main" }} />}
      sx={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "#fff",
        borderBottom: "1px solid #e0e0e0",
        "&:hover": { backgroundColor: "#f0f0f0" },
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: "bold", flexGrow: 1 }}>
        {category.categoryName}
      </Typography>
      <Box>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onEdit(category);
          }}
        >
          <Edit sx={{ color: "primary.main" }} />
        </IconButton>
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onDelete(category._id);
          }}
        >
          <Delete sx={{ color: "error.main" }} />
        </IconButton>
      </Box>
    </AccordionSummary>
    <AccordionDetails sx={{ backgroundColor: "#fff" }}>
      {category.expense?.length > 0 ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {category.expense.map((expense, index) => (
            <Tooltip key={index} title={expense.expenseDescription}>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  backgroundColor: "#f5f5f5",
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  whiteSpace: "nowrap",
                }}
              >
                {expense.expenseName}
              </Typography>
            </Tooltip>
          ))}
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: "text.disabled" }}>
          No expenses available
        </Typography>
      )}
    </AccordionDetails>
  </Accordion>
);

const CategoriesExpensesDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, restCategory } = useAppSelector(
    (state) => state.restCategory
  );
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [categoryData, setCategoryData] = useState({
    categoryName: "",
    categoryDescription: "",
    expense: [],
  });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    dispatch(getRestCategory());
  }, [dispatch]);

  const handleOpen = (category = null) => {
    if (category) {
      setEditMode(true);
      setCategoryData({ ...category });
      setSelectedId(category._id);
    } else {
      setEditMode(false);
      setCategoryData({
        categoryName: "",
        categoryDescription: "",
        expense: [],
      });
      setSelectedId(null);
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);
  const handleSave = () => {
    editMode
      ? dispatch(updateRestCategory(selectedId, categoryData))
      : dispatch(createRestCategory(categoryData));
    handleClose();
  };
  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      dispatch(removeRestCategory(id));
      dispatch(getRestCategory());
    }
  };
  const filteredCategories = useMemo(
    () =>
      restCategory.filter((category) =>
        category.categoryName.toLowerCase().includes(search.toLowerCase())
      ),
    [restCategory, search]
  );

  const leftCategories = filteredCategories.filter(
    (_, index) => index % 2 === 0
  );
  const rightCategories = filteredCategories.filter(
    (_, index) => index % 2 !== 0
  );

  const handleAddExpense = () => {
    setCategoryData({
      ...categoryData,
      expense: [
        ...(categoryData.expense || []),
        { expenseName: "", expenseDescription: "" },
      ],
    });
  };
  const handleRemoveExpense = (index) => {
    setCategoryData({
      ...categoryData,
      expense: categoryData.expense.filter((_, i) => i !== index),
    });
  };
  const handleUpdateExpense = (index, field, value) => {
    setCategoryData({
      ...categoryData,
      expense: categoryData.expense.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      ),
    });
  };

  const isCategoryDataChanged = useMemo(() => {
    if (!editMode) return false;
    const category = restCategory.find((cat) => cat._id === selectedId);
    if (!category) return false;
    return (
      categoryData.categoryName !== category.categoryName ||
      categoryData.categoryDescription !== category.categoryDescription ||
      JSON.stringify(categoryData.expense) !== JSON.stringify(category.expense)
    );
  }, [editMode, selectedId, categoryData, restCategory]);

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
      <TextField
        label="Search Categories"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mt: 2, width: "50%" }}
      />
      {loading ? (
        <CircularProgress sx={{ mt: 2 }} />
      ) : (
        <Box
          sx={{
            mt: 2,
            width: "90%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
          }}
        >
          <Box>
            {leftCategories.map((category) => (
              <CategoryAccordion
                key={category._id}
                category={category}
                onEdit={handleOpen}
                onDelete={handleDelete}
              />
            ))}
          </Box>
          <Box>
            {rightCategories.map((category) => (
              <CategoryAccordion
                key={category._id}
                category={category}
                onEdit={handleOpen}
                onDelete={handleDelete}
              />
            ))}
          </Box>
        </Box>
      )}
      <Button
        variant="contained"
        color="primary"
        startIcon={<Add />}
        onClick={() => handleOpen()}
        sx={{ mt: 2 }}
      >
        Create Category
      </Button>
      <Modal
        open={open}
        onClose={handleClose}
        sx={{
          display: "flex",
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            p: 4,
            mx: "auto",
            mt: 10,
            borderRadius: 3,
            boxShadow: 3,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#f9f9f9",
            height: "fit-content",
            gap: 2,
            width: { xs: "100%", sm: "50%" },
          }}
        >
          {/* Blink - Dont forget to save */}
          {isCategoryDataChanged && (
            <Typography variant="body2" color="error">
              You have unsaved changes
            </Typography>
          )}
          <Typography variant="h6" fontWeight={600}>
            {editMode ? "Edit Category" : "Create Category"}
          </Typography>

          <TextField
            fullWidth
            label="Category Name"
            value={categoryData.categoryName}
            onChange={(e) =>
              setCategoryData({ ...categoryData, categoryName: e.target.value })
            }
          />

          <TextField
            fullWidth
            label="Description"
            value={categoryData.categoryDescription}
            onChange={(e) =>
              setCategoryData({
                ...categoryData,
                categoryDescription: e.target.value,
              })
            }
          />

          <Typography variant="subtitle1" fontWeight={500}>
            Expenses
          </Typography>
          {categoryData?.expense?.length === 0 && (
            <Typography variant="body2" color="text.disabled">
              No expenses available
            </Typography>
          )}
          {categoryData.expense.map((exp, index) => (
            <Box
              key={index}
              sx={{ display: "flex", alignItems: "center", gap: 2 }}
            >
              <TextField
                size="small"
                label="Expense Name"
                value={exp.expenseName}
                onChange={(e) =>
                  handleUpdateExpense(index, "expenseName", e.target.value)
                }
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Expense Description"
                value={exp.expenseDescription}
                onChange={(e) =>
                  handleUpdateExpense(
                    index,
                    "expenseDescription",
                    e.target.value
                  )
                }
                sx={{ flex: 1 }}
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveExpense(index)}
              >
                <Delete />
              </IconButton>
            </Box>
          ))}

          <Button
            variant="outlined"
            color="primary"
            onClick={handleAddExpense}
            sx={{ alignSelf: "start" }}
          >
            Add Expense
          </Button>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleSave}
              sx={{ mt: 2 }}
            >
              {editMode ? "Update" : "Create"}
            </Button>
            <Button variant="text" fullWidth onClick={handleClose}>
              Cancel
            </Button>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};

export default CategoriesExpensesDashboard;
