import { DataGrid } from "@mui/x-data-grid";
import { Box, Stack, Typography } from "@mui/material";

const SummaryTable = ({
  title,
  dayRows,
  nightRows,
  extraDayRows,
  extraNightRows,
  pendingJamaCash,
  pendingJamaCard,
  pendingJamaPPS,
  pendingJamaPPC,
  reservationCash,
  reservationCard,
  reservationPPS,
  reservationPPC,
  reservationUnPaid,
  columns,
  color,
}) => {
  const finalRows = [
    ...(dayRows || []),
    ...(nightRows || []),
    ...(extraDayRows || []),
    ...(extraNightRows || []),
    ...(pendingJamaCash || []),
    ...(pendingJamaCard || []),
    ...(pendingJamaPPS || []),
    ...(pendingJamaPPC || []),
    ...(reservationCash || []),
    ...(reservationCard || []),
    ...(reservationPPS || []),
    ...(reservationPPC || []),
    ...(reservationUnPaid || []),
  ].filter((row) => row.rate !== 0);

  if (finalRows.length > 0) {
    finalRows[finalRows.length] = {
      id: `Total ${title}`,
      roomNo: "",
      rate: finalRows?.reduce(
        (acc, row) => Number(acc) + (isNaN(row.rate) ? 0 : Number(row.rate)),
        0
      ),
      fullname: "",
      noOfPeople: finalRows?.reduce(
        (acc, row) =>
          Number(acc) + (isNaN(row.noOfPeople) ? 0 : Number(row.noOfPeople)),
        0
      ),
    };
  }

  return (
    <Box
      style={{
        margin: 0,
        padding: 0,
        fontSize: "12px",
      }}
    >
      <Stack direction="row">
        <Box style={{ margin: "0", padding: "0", width: "100%" }}>
          {" "}
          <Typography
            variant="subtitle2"
            fontWeight={500}
            style={{
              padding: "4px",
            }}
          >
            {title}
          </Typography>
          <DataGrid
            rows={finalRows}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5, 10, 20]}
            style={{
              fontSize: "12px",
              height: "220px",
              width: "100%",
            }}
            rowHeight={25}
            disableColumnMenu
            disableColumnSorting
            showColumnVerticalBorder
            // disableColumnResize
            sx={{
              backgroundColor: "#fff",
              "& .MuiDataGrid-columnHeader": {
                maxHeight: "25px",
                backgroundColor: color,
                fontWeight: "bold",
                color: "white",
              },
              "& .MuiDataGrid-footerContainer": {
                display: "none",
              },
              "& .MuiDataGrid-scrollbar--horizontal": {
                display: "none",
              },
              "& .MuiDataGrid-columnHeaderTitle": {
                fontWeight: "600",
              },
              "& .MuiDataGrid-scrollbar--vertical": {
                width: "12px",
                "&::-webkit-scrollbar": {
                  width: "10px",
                },
                "&::-webkit-scrollbar-thumb": {
                  backgroundColor: "#888",
                  borderRadius: "10px",
                  border: "3px solid transparent",
                  backgroundClip: "content-box",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  backgroundColor: "#555",
                },
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "#f0f0f0",
                  borderRadius: "10px",
                },
              },
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
};

export default SummaryTable;
