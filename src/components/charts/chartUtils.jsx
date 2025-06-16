import dayjs from "dayjs";
import { Sector } from "recharts";
export const formatChartData = (rawData, type) => {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  switch (type) {
    case "categoryExpenses": {
      const categoryTotals = {};
      rawData.map((entry) =>
        entry?.expenses?.map(({ categoryName, amount = 0 }) => {
          if (!categoryName) return;
          categoryTotals[categoryName] =
            (categoryTotals[categoryName] || 0) + amount;
        })
      );
      return Object.entries(categoryTotals).map(([name, value]) => ({
        name,
        value,
      }));
    }

    case "paymentMethods": {
      const totals = { Card: 0, Cash: 0, PP: 0 };
      rawData.forEach(({ totalCard = 0, totalCash = 0, totalPP = 0 }) => {
        totals.Card += totalCard;
        totals.Cash += totalCash;
        totals.PP += totalPP;
      });
      const totalAmount = totals.Card + totals.Cash + totals.PP;
      return Object.entries(totals).map(([name, value]) => ({
        name,
        value,
        percentage: totalAmount
          ? ((value / totalAmount) * 100).toFixed(2)
          : "0.00",
      }));
    }

    case "upaad":
      return [...rawData]
        .sort((a, b) => dayjs(a.entryCreateDate).diff(dayjs(b.entryCreateDate)))
        .map(({ entryCreateDate, upad }) => ({
          date: dayjs(entryCreateDate).format("DD MMM"),
          amount: upad?.reduce((sum, { amount }) => sum + (amount || 0), 0),
          fullname: upad?.map(({ fullname }) => fullname),
        }));

    case "salesPerDay":
      return [...rawData]
        .sort((a, b) => dayjs(a.entryCreateDate).diff(dayjs(b.entryCreateDate)))
        .map((entry) => ({
          date: dayjs(entry.entryCreateDate).format("DD MMM"),
          amount: entry.grandTotal,
        }));

    case "mergedPaymentMode": {
      const totals = { cash: 0, card: 0, pp: 0, pps: 0, ppc: 0 };
      rawData.map(({ cash = 0, card = 0, pp = 0, pps = 0, ppc = 0 }) => {
        totals.cash += cash;
        totals.card += card;
        totals.pp += pp;
        totals.pps += pps;
        totals.ppc += ppc;
      });
      const totalAmount =
        totals.cash + totals.card + totals.pp + totals.pps + totals.ppc;
      return Object.entries(totals).map(([name, value]) => ({
        name,
        value,
        percentage: totalAmount
          ? ((value / totalAmount) * 100).toFixed(2)
          : "0.00",
      }));
    }
    default:
      return [];
  }
};

export const COLORS = [
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
  "#C0392B",
  "#7F8C8D",
  "#27AE60",
  "#F39C12",
  "#D91E18",
  "#6C5CE7",
  "#00B894",
  "#E84393",
  "#0984E3",
  "#FDCB6E",
];

export const renderActiveShape = (props) => {
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
      {/* Category name inside the center */}
      <text
        x={cx}
        y={cy}
        dy={8}
        textAnchor="middle"
        fill={fill}
        fontSize={22} // Bigger font for center name
        fontWeight="bold"
      >
        {payload.name}
      </text>

      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />

      {/* Line and circle outside */}
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={4} fill={fill} stroke="none" />

      {/* Outside value and percent */}
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 16}
        y={ey}
        textAnchor={textAnchor}
        fill="#333"
        fontSize={20} // Value font
        fontWeight="bold"
      >
        {`₹ ${value}`}
      </text>

      <text
        x={ex + (cos >= 0 ? 1 : -1) * 16}
        y={ey}
        dy={24}
        textAnchor={textAnchor}
        fill="#777"
        fontSize={18} // Percentage font
      >
        {`(${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};
