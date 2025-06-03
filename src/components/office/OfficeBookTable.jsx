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

const tableColumns = [
  "ID",
  "Amount",
  "Mode",
  "Name",
  "Category",
  "Remark",
  "Remove",
];

const EditableRow = ({
  row,
  index,
  onUpdateRow,
  handleRemoveRow,
  categoryOptions,
}) => {
  const handleInputChange = (key, value) => {
    onUpdateRow(index, key, value);
  };

  return (
    <TableRow
      sx={{
        bgcolor:
          row.amount && row.fullname && row.category && row.modeOfPayment
            ? "#f5f5f5"
            : "",
        width: "100%",
      }}
      key={row.id}
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
      <TableCell sx={{ width: "25%" }}>
        <TextField
          variant="outlined"
          size="small"
          value={row.fullname || ""}
          onChange={(e) => handleInputChange("fullname", e.target.value)}
          fullWidth
        />
      </TableCell>
      <TableCell sx={{ width: "15%" }}>
        <Autocomplete
          options={categoryOptions}
          getOptionLabel={(option) => option.categoryName || ""}
          value={
            categoryOptions.find(
              (option) => option.categoryName === row.category
            ) || null
          }
          onChange={(_, value) =>
            handleInputChange("category", value?.categoryName || "")
          }
          renderInput={(params) => (
            <TextField {...params} variant="outlined" size="small" fullWidth />
          )}
        />
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
          <RemoveCircleOutlineIcon variant="outlined" color="error" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const OfficeBookTable = ({ officeData, setOfficeData, categoryOptions }) => {
  const handleAddRow = () => {
    setOfficeData((prevData) => [
      ...prevData,
      {
        id: prevData.length + 1,
        amount: 0,
        modeOfPayment: "",
        fullname: "",
        remark: "",
        category: "",
        createDate: dayjs().format("DD-MM-YYYY"),
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
                categoryOptions={categoryOptions}
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
