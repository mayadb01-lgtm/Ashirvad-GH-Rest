import { useMemo } from "react";
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
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

const tableColumns = ["ID", "Amount", "Name", "Remove"];

const EditableRow = ({
  row,
  index,
  onUpdateRow,
  fieldOptions,
  handleRemoveRow,
}) => {
  const handleInputChange = (key, value) => {
    onUpdateRow(index, key, value);
  };

  return (
    <TableRow
      sx={{ bgcolor: row.amount && row.fullname ? "#f5f5f5" : "" }}
      key={row.id}
    >
      <TableCell sx={{ width: "10%" }}>{row.id}</TableCell>
      <TableCell sx={{ width: "40%" }}>
        <TextField
          variant="outlined"
          type="number"
          size="small"
          value={row.amount || ""}
          onChange={(e) => handleInputChange("amount", e.target.value)}
          fullWidth
        />
      </TableCell>
      <TableCell sx={{ width: "50%" }}>
        <Autocomplete
          options={fieldOptions}
          getOptionLabel={(option) => option.fullname || ""}
          value={
            fieldOptions.find((option) => option.fullname === row.fullname) ||
            null
          }
          onChange={(event, value) => {
            handleInputChange("fullname", value?.fullname || "");
            handleInputChange("mobileNumber", value?.mobileNumber || "");
            handleInputChange("_id", value?._id ? value._id : "");
          }}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" size="small" fullWidth />
          )}
        />
      </TableCell>
      <TableCell sx={{ width: "5%" }}>
        <Button size="small" onClick={() => handleRemoveRow(row.id)}>
          <RemoveCircleOutlineIcon variant="outlined" color="error" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

const RestUpadTable = ({ restUpadData, setRestUpadData, fieldOptions }) => {
  const handleAddRow = () => {
    setRestUpadData((prevData) => [
      ...prevData,
      {
        id: prevData.length + 1,
        _id: "",
        amount: 0,
        fullname: "",
        mobileNumber: 0,
      },
    ]);
  };

  const handleUpdateRow = (index, key, value) => {
    setRestUpadData((prevData) =>
      prevData.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const memoizedTableData = useMemo(() => restUpadData, [restUpadData]);

  const handleRemoveRow = (id) => {
    setRestUpadData((prevData) =>
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
                fieldOptions={fieldOptions}
                handleRemoveRow={handleRemoveRow}
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

export default RestUpadTable;
