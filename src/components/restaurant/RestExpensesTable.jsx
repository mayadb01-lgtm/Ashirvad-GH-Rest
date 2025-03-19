import { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  Autocomplete,
  TextField,
  Button,
  Paper,
} from "@mui/material";
import { useAppSelector } from "../../redux/hooks";
import "dayjs/locale/en-gb";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

const ExpensesTable = ({
  selectedDate,
  restExpensesData,
  setRestExpensesData,
  totalExpenses,
  totalUpad,
  totalPending,
  totalCard,
  setTotalCard,
  totalPP,
  setTotalPP,
  totalCash,
  setTotalCash,
  computerAmount,
  setComputerAmount,
  grandTotal,
  extraAmount,
}) => {
  const { restCategory } = useAppSelector((state) => state.restCategory);
  // Column headers
  const columns = useMemo(
    () => ["ID", "Amount", "Name", "Category", "Remove"],
    []
  );

  // Calculation rows
  const calculationRows = useMemo(
    () => [
      { label: "Total Expenses", amount: totalExpenses },
      { label: "Total Upad", amount: totalUpad },
      { label: "Total Pending", amount: totalPending },
      { label: "Total Card", amount: totalCard },
      { label: "Total PP", amount: totalPP },
      { label: "Total Cash", amount: totalCash },
      { label: "Grand Total", amount: grandTotal },
      { label: "Computer Amount", amount: computerAmount },
      { label: "Extra Amount", amount: extraAmount },
    ],
    [
      totalExpenses,
      totalUpad,
      totalPending,
      totalCard,
      totalPP,
      totalCash,
      grandTotal,
      computerAmount,
      extraAmount,
    ]
  );

  // Update row data
  const handleUpdateRow = useCallback(
    (index, key, value) => {
      setRestExpensesData((prevData) =>
        prevData.map((row, i) =>
          i === index ? { ...row, [key]: value || "" } : row
        )
      );
    },
    [setRestExpensesData]
  );

  // Add a new row
  const handleAddRow = useCallback(() => {
    setRestExpensesData((prevData) => [
      ...prevData,
      {
        id: prevData.length + 1,
        _id: "",
        amount: 0,
        expenseName: "",
        categoryName: "",
        createDate: selectedDate,
      },
    ]);
  }, [setRestExpensesData]);

  // Category Name
  const renderCategoryAutocomplete = useCallback(
    (options, rowKey, index, currentValue) => (
      <Autocomplete
        disabled
        options={options}
        getOptionLabel={(option) => option.categoryName || ""}
        value={
          options.find((option) => option.categoryName === currentValue) || ""
        }
        onChange={(e, value) => {
          handleUpdateRow(index, rowKey, value?.categoryName);
          handleUpdateRow(index, "_id", value ? value._id : "");
        }}
        renderInput={(params) => (
          <TextField {...params} variant="outlined" size="small" />
        )}
      />
    ),
    [handleUpdateRow]
  );

  const flattenedExpenses = restCategory.flatMap((category) =>
    category.expense.map((exp) => ({
      _id: exp._id,
      expenseName: exp.expenseName,
      categoryName: category.categoryName,
    }))
  );

  const handleRemoveRow = useCallback(
    (id) => {
      setRestExpensesData((prevData) =>
        prevData
          .filter((row) => row.id !== id)
          .map((row, index) => ({ ...row, id: index + 1 }))
      );
    },
    [setRestExpensesData]
  );

  // Expense Name
  const renderExpenseAutocomplete = useCallback(
    (options, rowKey, index, currentValue) => (
      <Autocomplete
        options={options}
        groupBy={(option) => option.categoryName}
        getOptionLabel={(option) => option.expenseName || ""}
        value={
          options.find((option) => option.expenseName === currentValue) || ""
        }
        onChange={(_, value) => {
          handleUpdateRow(index, rowKey, value?.expenseName);
          handleUpdateRow(index, "_id", value ? value._id : "");
          handleUpdateRow(
            index,
            "categoryName",
            value ? value.categoryName : ""
          );
        }}
        renderInput={(params) => (
          <TextField {...params} variant="outlined" size="small" fullWidth />
        )}
      />
    ),
    [handleUpdateRow]
  );

  return (
    <TableContainer component={Paper} sx={{ boxShadow: 3, marginTop: 2 }}>
      <Table size="small" stickyHeader>
        {/* Table Header */}
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column} sx={{ fontWeight: "bold" }}>
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* Dynamic Rows */}
          {restExpensesData.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center">
                No Expense data available
              </TableCell>
            </TableRow>
          )}
          {restExpensesData.map((row, index) => (
            <TableRow
              sx={{ bgcolor: row.amount && row.expenseName ? "#f5f5f5" : "" }}
              key={row.id}
            >
              <TableCell sx={{ width: "5%" }}>{row.id}</TableCell>
              <TableCell sx={{ width: "20%" }}>
                <TextField
                  variant="outlined"
                  size="small"
                  type="number"
                  value={row.amount || ""}
                  onChange={(e) =>
                    handleUpdateRow(index, "amount", e.target.value)
                  }
                />
              </TableCell>
              <TableCell sx={{ width: "30%" }}>
                {renderExpenseAutocomplete(
                  flattenedExpenses,
                  "expenseName",
                  index,
                  row.expenseName
                )}
              </TableCell>
              <TableCell sx={{ width: "30%" }}>
                {renderCategoryAutocomplete(
                  restCategory,
                  "categoryName",
                  index,
                  row.categoryName
                )}
              </TableCell>
              <TableCell sx={{ width: "10%" }}>
                <Button size="small" onClick={() => handleRemoveRow(row.id)}>
                  <RemoveCircleOutlineIcon variant="outlined" color="error" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddRow}
            size="small"
            sx={{ margin: 2, width: "100%" }}
          >
            Add Row
          </Button>
          {/* Calculation Rows */}
          {calculationRows.map((row, index) => (
            <TableRow key={index}>
              <TableCell colSpan={2}>{row.label}</TableCell>
              <TableCell colSpan={3}>
                <TextField
                  variant="outlined"
                  size="small"
                  type="number"
                  value={row.amount || 0}
                  onChange={(e) => {
                    switch (row.label) {
                      case "Total Cash":
                        setTotalCash(Number(e.target.value));
                        break;
                      case "Total Card":
                        setTotalCard(Number(e.target.value));
                        break;
                      case "Total PP":
                        setTotalPP(Number(e.target.value));
                        break;
                      case "Computer Amount":
                        setComputerAmount(Number(e.target.value));
                        break;
                      default:
                        break;
                    }
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
          {extraAmount < 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ color: "red" }}>
                Extra amount is negative
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

ExpensesTable.propTypes = {
  restExpensesData: PropTypes.arrayOf(PropTypes.object).isRequired,
  setRestExpensesData: PropTypes.func.isRequired,
  totalExpenses: PropTypes.number.isRequired,
  totalUpad: PropTypes.number.isRequired,
  totalPending: PropTypes.number.isRequired,
  totalCard: PropTypes.number.isRequired,
  setTotalCard: PropTypes.func.isRequired,
  totalPP: PropTypes.number.isRequired,
  setTotalPP: PropTypes.func.isRequired,
  totalCash: PropTypes.number.isRequired,
  setTotalCash: PropTypes.func.isRequired,
  grandTotal: PropTypes.number.isRequired,
  computerAmount: PropTypes.number.isRequired,
  setComputerAmount: PropTypes.func.isRequired,
  extraAmount: PropTypes.number.isRequired,
};

export default ExpensesTable;
