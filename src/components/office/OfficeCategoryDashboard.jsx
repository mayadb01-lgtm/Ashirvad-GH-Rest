import { useEffect, useState, useMemo } from "react";
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
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  createOfficeCategory,
  deleteOfficeCategory,
  getOfficeAllCategories,
  updateOfficeCategory,
} from "../../redux/actions/officeBookAction";
import { getPendingUser } from "../../redux/actions/restPendingAction";

// Accordion item to display category and its expenses
const CategoryAccordion = ({ key, category, onEdit, onDelete }) => (
  <Accordion
    key={key}
    sx={{
      borderRadius: 2,
      boxShadow: 2,
      overflow: "hidden",
      backgroundColor: "#f9f9f9",
      margin: "2px",
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
      <Typography sx={{ fontWeight: "bold", flexGrow: 1 }}>
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
        <Stack direction="row" flexWrap="wrap" spacing={1}>
          {category.expense.map((exp, i) => (
            <Tooltip key={i} title={exp.expenseDescription}>
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
                {exp.expenseName}
              </Typography>
            </Tooltip>
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: "text.disabled" }}>
          No expenses available
        </Typography>
      )}
    </AccordionDetails>
  </Accordion>
);

const OfficeCategoryDashboard = () => {
  const dispatch = useAppDispatch();
  const { loading, officeCategory } = useAppSelector(
    (state) => state.officeBook
  );
  const { restPending } = useAppSelector((state) => state.restPending);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const [categoryData, setCategoryData] = useState({
    categoryName: "",
    categoryDescription: "",
    expense: [],
  });

  useEffect(() => {
    dispatch(getOfficeAllCategories());
    dispatch(getPendingUser());
  }, [dispatch]);

  useEffect(() => {
    if (!restPending?.length || !officeCategory?.length) return;

    const pendingCategory = officeCategory.find(
      (cat) => cat.categoryName === "Pending"
    );

    const newExpenses = restPending.map((user) => ({
      expenseName: user.fullname,
      expenseDescription: user.fullname,
    }));

    const existingExpenses = pendingCategory?.expense || [];

    const isDifferent =
      newExpenses.length !== existingExpenses.length ||
      newExpenses.some(
        (newExp) =>
          !existingExpenses.some(
            (exp) =>
              exp.expenseName === newExp.expenseName &&
              exp.expenseDescription === newExp.expenseDescription
          )
      ) ||
      existingExpenses.some(
        (exp) =>
          !newExpenses.some(
            (newExp) =>
              exp.expenseName === newExp.expenseName &&
              exp.expenseDescription === newExp.expenseDescription
          )
      );

    if (isDifferent) {
      (async () => {
        const payload = {
          categoryName: "Pending",
          categoryDescription: "Pending",
          expense: newExpenses,
        };

        if (pendingCategory) {
          await dispatch(updateOfficeCategory(pendingCategory._id, payload));
        } else {
          await dispatch(createOfficeCategory(payload));
        }

        await dispatch(getOfficeAllCategories());
      })();
    }
  }, [restPending, officeCategory, dispatch]);

  const handleOpen = (category = null) => {
    if (category) {
      setEditMode(true);
      setSelectedId(category._id);
      setCategoryData({
        categoryName: category.categoryName || "",
        categoryDescription: category.categoryDescription || "",
        expense: category.expense || [],
      });
    } else {
      setEditMode(false);
      setSelectedId(null);
      setCategoryData({
        categoryName: "",
        categoryDescription: "",
        expense: [],
      });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSave = async () => {
    if (editMode && selectedId && !isUnsaved) {
      handleClose();
      return;
    }
    const payload = {
      categoryName: categoryData.categoryName.trim(),
      categoryDescription: categoryData.categoryDescription.trim(),
      expense: categoryData.expense.map((e) => ({
        expenseName: e.expenseName.trim(),
        expenseDescription: e.expenseDescription.trim(),
      })),
    };

    if (editMode && selectedId) {
      await dispatch(updateOfficeCategory(selectedId, payload));
    } else {
      await dispatch(createOfficeCategory(payload));
    }
    await dispatch(getOfficeAllCategories());
    handleClose();
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this category?")) {
      await dispatch(deleteOfficeCategory(id));
      await dispatch(getOfficeAllCategories());
    }
  };

  const filtered = useMemo(() => {
    const list = Array.isArray(officeCategory) ? officeCategory : [];
    return list.filter((cat) => {
      const q = search.toLowerCase();
      const matchCat =
        cat.categoryName.toLowerCase().includes(q) ||
        cat.categoryDescription.toLowerCase().includes(q);
      const matchExp = cat.expense?.some(
        (e) =>
          e.expenseName.toLowerCase().includes(q) ||
          e.expenseDescription.toLowerCase().includes(q)
      );
      return matchCat || matchExp;
    });
  }, [officeCategory, search]);

  const leftCategories = filtered.filter((_, i) => i % 2 === 0);
  const rightCategories = filtered.filter((_, i) => i % 2 === 1);

  const isUnsaved = useMemo(() => {
    if (!editMode || !selectedId) return false;

    const list = Array.isArray(officeCategory) ? officeCategory : [];
    const orig = list.find((c) => c._id === selectedId);

    return (
      orig &&
      (orig.categoryName !== categoryData.categoryName ||
        orig.categoryDescription !== categoryData.categoryDescription ||
        JSON.stringify(orig.expense) !== JSON.stringify(categoryData.expense))
    );
  }, [editMode, selectedId, categoryData, officeCategory]);

  const addExpense = () =>
    setCategoryData((prev) => ({
      ...prev,
      expense: [...prev.expense, { expenseName: "", expenseDescription: "" }],
    }));

  const updateExpense = (idx, field, val) =>
    setCategoryData((prev) => ({
      ...prev,
      expense: prev.expense.map((e, i) =>
        i === idx ? { ...e, [field]: val } : e
      ),
    }));

  const removeExpense = (idx) =>
    setCategoryData((prev) => ({
      ...prev,
      expense: prev.expense.filter((_, i) => i !== idx),
    }));

  const hasInvalidExpense = categoryData.expense.some(
    (e) => !e.expenseName.trim() || !e.expenseDescription.trim()
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
      <Box
        sx={{
          alignItems: "center",
          py: 3,
        }}
      >
        <Typography variant="h5" fontWeight={600} color="text.primary">
          Manage Office Categories & Expenses
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
          label="Search"
          variant="outlined"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mt: 2, width: "50%" }}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          color="primary"
          sx={{ mt: 2 }}
        >
          Create
        </Button>
      </Stack>

      {loading ? (
        <CircularProgress />
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
            {leftCategories.map((cat) => (
              <CategoryAccordion
                key={cat._id}
                category={cat}
                onEdit={handleOpen}
                onDelete={handleDelete}
              />
            ))}
          </Box>
          <Box>
            {rightCategories.map((cat) => (
              <CategoryAccordion
                key={cat._id}
                category={cat}
                onEdit={handleOpen}
                onDelete={handleDelete}
              />
            ))}
          </Box>
        </Box>
      )}

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
          <Stack spacing={2}>
            {isUnsaved && (
              <Typography color="error" fontWeight={500}>
                You have unsaved changes
              </Typography>
            )}

            <Typography variant="h6" fontWeight={600}>
              {editMode ? "Edit Category" : "Create Category"}
            </Typography>

            <TextField
              label="Category Name"
              fullWidth
              value={categoryData.categoryName}
              onChange={(e) =>
                setCategoryData((prev) => ({
                  ...prev,
                  categoryName: e.target.value.trimStart(),
                }))
              }
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={categoryData.categoryDescription}
              onChange={(e) =>
                setCategoryData((prev) => ({
                  ...prev,
                  categoryDescription: e.target.value,
                }))
              }
            />

            <Typography variant="subtitle1" fontWeight={600} mt={2}>
              Expenses
            </Typography>

            {categoryData.expense.length === 0 && (
              <Typography color="text.disabled">
                No expenses available
              </Typography>
            )}

            {categoryData.expense.map((exp, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  mb: 1,
                }}
              >
                <Stack direction="row" spacing={1} mb={1}>
                  <TextField
                    label="Name"
                    size="small"
                    value={exp.expenseName}
                    onChange={(e) =>
                      updateExpense(idx, "expenseName", e.target.value)
                    }
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Description"
                    size="small"
                    value={exp.expenseDescription}
                    onChange={(e) =>
                      updateExpense(idx, "expenseDescription", e.target.value)
                    }
                    sx={{ flex: 1 }}
                  />
                  <IconButton color="error" onClick={() => removeExpense(idx)}>
                    <Delete />
                  </IconButton>
                </Stack>
              </Box>
            ))}

            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={addExpense}
              sx={{ alignSelf: "flex-start" }}
            >
              Add Expense
            </Button>

            <Stack direction="row" spacing={2} mt={3}>
              <Button
                variant="contained"
                fullWidth
                onClick={handleSave}
                disabled={
                  !categoryData.categoryName.trim() ||
                  !categoryData.categoryDescription.trim() ||
                  hasInvalidExpense
                }
              >
                {editMode ? "Update" : "Create"}
              </Button>
              <Button variant="outlined" fullWidth onClick={handleClose}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
};

export default OfficeCategoryDashboard;
