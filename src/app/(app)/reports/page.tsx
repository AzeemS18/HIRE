
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import ClientOnly from "@/components/ui/client-only";

const timeToHireData = [
    { month: 'Jan', days: 32, fill: 'var(--color-violet)' },
    { month: 'Feb', days: 28, fill: 'var(--color-indigo)' },
    { month: 'Mar', days: 45, fill: 'var(--color-blue)' },
    { month: 'Apr', days: 38, fill: 'var(--color-green)' },
    { month: 'May', days: 35, fill: 'var(--color-yellow)' },
    { month: 'Jun', days: 30, fill: 'var(--color-orange)' },
];

const rejectionReasonData = [
  { name: 'Skill Mismatch', value: 45, fill: '#1DA462' },
  { name: 'Compensation', value: 25, fill: '#DD5144' },
  { name: 'Culture Fit', value: 15, fill: '#FFA32F' },
  { name: 'Better Offer', value: 10, fill: '#F54F52' },
  { name: 'Other', value: 5, fill: '#93F03B' },
];

const applicationSourceData = [
    { source: 'LinkedIn', count: 120, fill: 'var(--color-violet)' },
    { source: 'Indeed', count: 95, fill: 'var(--color-indigo)' },
    { source: 'Referrals', count: 70, fill: 'var(--color-blue)' },
    { source: 'Company Website', count: 50, fill: 'var(--color-green)' },
    { source: 'Other', count: 25, fill: 'var(--color-yellow)' },
];

// Calculate total for percentage calculation
const totalRejections = rejectionReasonData.reduce((sum, item) => sum + item.value, 0);

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.8;
  const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
  const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

  return (
    <text x={x} y={y} fill="black" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


export default function ReportsPage() {
  return (
    <ClientOnly>
      <div className="flex flex-col gap-6">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold md:text-3xl">Reports & Analytics</h1>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Time to Hire</CardTitle>
              <CardDescription>Average number of days from application to hire.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[250px] w-full">
                <BarChart data={timeToHireData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis unit="d" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <Tooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="days" name="Days" radius={[4, 4, 0, 0]}>
                    {timeToHireData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Rejection Reasons</CardTitle>
              <CardDescription>Breakdown of why candidates are rejected.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer config={{}} className="h-[250px] w-full">
                 <PieChart>
                  <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={rejectionReasonData}
                    dataKey="value"
                    nameKey="name"
                    cx="35%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={false}
                    label={renderCustomizedLabel}
                  >
                     {rejectionReasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Application Sources</CardTitle>
            <CardDescription>Where your best candidates are coming from.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <BarChart layout="vertical" data={applicationSourceData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <YAxis dataKey="source" type="category" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} width={80} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <Tooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="count" name="Applications" layout="vertical" radius={[0, 4, 4, 0]}>
                  {applicationSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </ClientOnly>
  );
}


