import PropTypes from "prop-types";
import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Paper,
  TableRow,
  TableCell,
  Autocomplete,
  TextField,
  Button,
} from "@mui/material";
import { RemoveCircleOutlineRounded } from "@mui/icons-material";
import { useAppSelector } from "../../redux/hooks";

const TABLE_COLUMNS = ["ID", "Amount", "Name", "Remove"];

const RestPendingUsersTable = ({ restPendingData, setRestPendingData }) => {
  const { restPending } = useAppSelector((state) => state.restPending);

  const handleAddRow = () => {
    setRestPendingData((prevData) => [
      ...prevData,
      {
        id: prevData.length + 1,
        _id: "",
        fullname: "",
        mobileNumber: 0,
        amount: 0,
      },
    ]);
  };

  const handleUpdateRow = (index, key, value) => {
    setRestPendingData((prevData) =>
      prevData.map((row, i) =>
        i === index ? { ...row, [key]: value || "" } : row
      )
    );
  };

  const handleRemoveRow = (id) => {
    setRestPendingData((prevData) =>
      prevData
        .filter((row) => row.id !== id)
        .map((row, index) => ({ ...row, id: index + 1 }))
    );
  };

  const renderAutocompleteCell = (options, row, index, fieldKey) => (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option.fullname || ""}
      value={
        options.find((option) => option.fullname === row[fieldKey]) || null
      }
      groupBy={(option) => option.business || ""}
      onChange={(_, value) => {
        handleUpdateRow(index, fieldKey, value ? value?.fullname : "");
        handleUpdateRow(index, "mobileNumber", value ? value?.mobileNumber : 0);
        handleUpdateRow(index, "_id", value?._id ? value._id : "");
      }}
      renderInput={(params) => (
        <TextField {...params} variant="outlined" size="small" fullWidth />
      )}
      disabled={!row.amount}
    />
  );

  return (
    <div>
      <TableContainer
        component={Paper}
        sx={{ maxHeight: "100%", boxShadow: 3, mt: 2 }}
      >
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {TABLE_COLUMNS.map((column) => (
                <TableCell key={column} sx={{ fontWeight: "bold" }}>
                  {column}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {restPendingData?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No Pending data available
                </TableCell>
              </TableRow>
            )}
            {restPendingData?.map((row, index) => (
              <TableRow
                sx={{ bgcolor: row.amount && row.fullname ? "#f5f5f5" : "" }}
                key={row.id}
              >
                <TableCell sx={{ width: "10%" }}>{index+1}</TableCell>
                <TableCell sx={{ width: "25%" }}>
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
                <TableCell sx={{ width: "40%" }}>
                  {renderAutocompleteCell(restPending, row, index, "fullname")}
                </TableCell>
                <TableCell sx={{ width: "5%" }}>
                  <Button size="small" onClick={() => handleRemoveRow(row.id)}>
                    <RemoveCircleOutlineRounded color="error" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddRow}
          size="small"
          sx={{ margin: 2 }}
        >
          Add Row
        </Button>
      </TableContainer>
    </div>
  );
};

RestPendingUsersTable.propTypes = {
  restPendingData: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      fullname: PropTypes.string,
      mobileNumber: PropTypes.number,
      amount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  setRestPendingData: PropTypes.func.isRequired,
};

export default RestPendingUsersTable;
