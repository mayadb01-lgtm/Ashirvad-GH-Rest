// components/charts/PieChartComponent.jsx
import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from "recharts";
import { useCallback, useState } from "react";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#FF6384",
  "#36A2EB",
  "#FFCE56",
  "#8E44AD",
  "#2ECC71",
  "#E74C3C",
  "#3498DB",
  "#F1C40F",
  "#1ABC9C",
  "#9B59B6",
  "#34495E",
  "#E67E22",
  "#BDC3C7",
  "#16A085",
  "#2980B9",
  "#D35400",
];

const renderActiveShape = (props) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 30;
  const ey = my;
  const textAnchor = cos >= 0 ? "start" : "end";

  return (
    <g>
      <text
        x={cx}
        y={cy}
        dy={8}
        textAnchor="middle"
        fill={fill}
        fontSize={22}
        fontWeight="bold"
      >
        {payload.name}
      </text>
      <Sector
        {...{ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }}
      />
      <Sector
        {...{
          cx,
          cy,
          startAngle,
          endAngle,
          innerRadius: outerRadius + 6,
          outerRadius: outerRadius + 10,
          fill,
        }}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={4} fill={fill} />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 16}
        y={ey}
        textAnchor={textAnchor}
        fontSize={20}
        fontWeight="bold"
      >
        ₹ {value}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 16}
        y={ey}
        dy={24}
        textAnchor={textAnchor}
        fontSize={18}
        fill="#777"
      >
        ({(percent * 100).toFixed(2)}%)
      </text>
    </g>
  );
};

const PieChartComponent = ({ data, isFullScreen }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const onPieEnter = useCallback((_, index) => setActiveIndex(index), []);

  return (
    <ResponsiveContainer aspect={isFullScreen ? 2 : 1.25}>
      <PieChart>
        <Pie
          activeIndex={activeIndex}
          activeShape={renderActiveShape}
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={isFullScreen ? 150 : 120}
          outerRadius={isFullScreen ? 240 : 200}
          dataKey="value"
          onMouseEnter={onPieEnter}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PieChartComponent;
