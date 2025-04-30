// components/charts/LineChartComponent.jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Paper, Typography } from "@mui/material";

const CustomTooltip = ({ payload, label }) => {
  if (payload?.length) {
    const data = payload[0].payload;
    return (
      <Paper sx={{ padding: 2, borderRadius: 2 }}>
        <Typography variant="subtitle2">
          Date: <strong>{label}</strong>
        </Typography>
        <Typography>Amount: ₹ {data.amount}</Typography>
        <Typography>Employee: {data.fullname}</Typography>
      </Paper>
    );
  }
  return null;
};

const LineChartComponent = ({ data, isFullScreen }) => (
  <ResponsiveContainer>
    <LineChart
      data={data}
      height={isFullScreen ? 500 : 300}
      width={isFullScreen ? 1000 : 600}
      fontSize={isFullScreen ? 16 : 12}
      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
    >
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip content={<CustomTooltip />} />
      <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={3} />
    </LineChart>
  </ResponsiveContainer>
);

export default LineChartComponent;
