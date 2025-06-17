import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TextField,
  Button,
  Autocomplete,
} from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { useMemo } from "react";
import { MODE_OF_PAYMENT_OPTIONS } from "../../utils/utils";
import dayjs from "dayjs";
import { useAppSelector } from "../../redux/hooks";

const EditableRow = ({
  row,
  index,
  onUpdateRow,
  handleRemoveRow,
  categoryOptions,
  officeCategoryOptions,
  isOfficeIn,
  isOfficeOut,
}) => {
  const { loading, restStaff } = useAppSelector((state) => state.restStaff);

  const handleInputChange = (key, value) => {
    onUpdateRow(index, key, value);
  };

  if ((isOfficeIn && isOfficeOut) || (!isOfficeIn && !isOfficeOut)) {
    return null;
  }

  // Select correct data source
  const sourceOptions = isOfficeIn ? officeCategoryOptions : categoryOptions;

  // Flattened expenses for autocomplete
  const flattenedExpenses = sourceOptions.flatMap((category) =>
    category.expense.map((exp) => ({
      _id: exp._id,
      expenseName: exp.expenseName,
      categoryName: category.categoryName,
    }))
  );

  // Render Expense Autocomplete
  const renderExpenseAutocomplete = (options, rowKey, currentValue) => (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option.expenseName || ""}
      groupBy={(option) => option.categoryName || ""}
      value={options.find((opt) => opt.expenseName === currentValue) || null}
      onChange={(_, value) => {
        handleInputChange(rowKey, value?.expenseName);
        handleInputChange("_id", value ? value._id : "");
        handleInputChange("categoryName", value ? value.categoryName : "");
      }}
      renderInput={(params) => (
        <TextField {...params} variant="outlined" size="small" />
      )}
    />
  );

  const flattenedCategory = sourceOptions.flatMap((category) => ({
    _id: category._id,
    categoryName: category.categoryName,
  }));

  // Render Category Autocomplete (disabled)
  const renderCategoryAutocomplete = (options, rowKey, currentValue) =>
    loading ? (
      <TextField variant="outlined" size="small" disabled />
    ) : (
      <Autocomplete
        disabled
        options={options}
        getOptionLabel={(option) => option.categoryName || ""}
        value={options.find((opt) => opt.categoryName === currentValue) || null}
        onChange={(e, value) => {
          handleInputChange(rowKey, value?.categoryName);
          handleInputChange("_id", value ? value._id : "");
        }}
        renderInput={(params) => (
          <TextField {...params} variant="outlined" size="small" />
        )}
      />
    );

  const flattenedUpadName = restStaff.flatMap((staff) => ({
    _id: staff._id,
    fullname: staff.fullname,
  }));

  const renderUpadNameAutocomplete = (options, rowKey, currentValue) => (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option.fullname || ""}
      value={options.find((opt) => opt.fullname === currentValue) || null}
      onChange={(_, value) => {
        handleInputChange(rowKey, value?.fullname);
        handleInputChange("fullname_id", value ? value._id : "");
      }}
      renderInput={(params) => (
        <TextField {...params} variant="outlined" size="small" />
      )}
    />
  );

  return (
    <TableRow
      key={row.id}
      sx={{
        bgcolor:
          row.amount && row.fullname && row.category && row.modeOfPayment
            ? "#f5f5f5"
            : "",
        width: "100%",
      }}
    >
      <TableCell>{row.id}</TableCell>

      <TableCell sx={{ width: "15%" }}>
        <TextField
          variant="outlined"
          type="number"
          size="small"
          value={row.amount || ""}
          onChange={(e) => handleInputChange("amount", e.target.value)}
          fullWidth
        />
      </TableCell>

      <TableCell sx={{ width: "15%" }}>
        <Autocomplete
          options={MODE_OF_PAYMENT_OPTIONS}
          getOptionLabel={(option) => option || ""}
          value={row.modeOfPayment || ""}
          onChange={(_, value) => handleInputChange("modeOfPayment", value)}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" size="small" fullWidth />
          )}
        />
      </TableCell>

      <TableCell sx={{ width: "20%" }}>
        {renderExpenseAutocomplete(
          flattenedExpenses,
          "expenseName",
          row.expenseName
        )}
      </TableCell>

      <TableCell sx={{ width: "15%" }}>
        {renderCategoryAutocomplete(
          flattenedCategory,
          "categoryName",
          row.categoryName
        )}
      </TableCell>

      <TableCell sx={{ width: "20%" }}>
        {row.categoryName.match(/Upad|Upaad|upad|upaad/i) ? (
          renderUpadNameAutocomplete(
            flattenedUpadName,
            "fullname",
            row.fullname
          )
        ) : (
          <TextField
            variant="outlined"
            size="small"
            value={row.fullname || ""}
            onChange={(e) => handleInputChange("fullname", e.target.value)}
            fullWidth
          />
        )}
      </TableCell>

      <TableCell sx={{ width: "25%" }}>
        <TextField
          variant="outlined"
          size="small"
          value={row.remark || ""}
          onChange={(e) => handleInputChange("remark", e.target.value)}
          fullWidth
        />
      </TableCell>

      <TableCell>
        <Button size="small" onClick={() => handleRemoveRow(row.id)}>
          <RemoveCircleOutlineIcon color="error" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const OfficeBookTable = ({
  officeData,
  setOfficeData,
  isOfficeIn,
  isOfficeOut,
}) => {
  const { restCategory } = useAppSelector((state) => state.restCategory);
  const { officeCategory } = useAppSelector((state) => state.officeBook);

  const tableColumns = isOfficeIn
    ? ["ID", "Amount", "Mode", "Income", "Category", "Name", "Remark", "Remove"]
    : [
        "ID",
        "Amount",
        "Mode",
        "Expense",
        "Category",
        "Name",
        "Remark",
        "Remove",
      ];

  const handleAddRow = () => {
    setOfficeData((prevData) => [
      ...prevData,
      {
        id: prevData.length + 1,
        amount: 0,
        modeOfPayment: "",
        fullname: "",
        remark: "",
        categoryName: "",
        expenseName: "",
        createDate: dayjs().format("DD-MM-YYYY"),
        fullname_id: "",
      },
    ]);
  };

  const handleUpdateRow = (index, key, value) => {
    setOfficeData((prevData) =>
      prevData.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const memoizedTableData = useMemo(() => officeData, [officeData]);

  const handleRemoveRow = (id) => {
    setOfficeData((prevData) =>
      prevData
        .filter((row) => row.id !== id)
        .map((row, index) => ({ ...row, id: index + 1 }))
    );
  };

  return (
    <div>
      <TableContainer
        component={Paper}
        sx={{ maxHeight: "100%", boxShadow: 3, mt: 2 }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {tableColumns.map((column) => (
                <TableCell key={column} sx={{ fontWeight: "bold" }}>
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {memoizedTableData.length === 0 && (
              <TableRow>
                <TableCell colSpan={tableColumns.length} align="center">
                  No data found for Upad
                </TableCell>
              </TableRow>
            )}
            {memoizedTableData.map((row, index) => (
              <EditableRow
                key={row.id}
                row={row}
                index={index}
                onUpdateRow={handleUpdateRow}
                handleRemoveRow={handleRemoveRow}
                categoryOptions={restCategory}
                officeCategoryOptions={officeCategory}
                isOfficeIn={isOfficeIn}
                isOfficeOut={isOfficeOut}
              />
            ))}
          </TableBody>
        </Table>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddRow}
          size="small"
          sx={{ m: 2 }}
        >
          Add Row
        </Button>
      </TableContainer>
    </div>
  );
};

export default OfficeBookTable;
