import {
  PieChart as PChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const COLORS = ['#60a5fa', '#818cf8', '#facc15', '#34d399', '#f87171']

const PieChart = ({ title, data }: { title: string; data: any[] }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-md">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PChart>
      </ResponsiveContainer>
    </div>
  )
}

export default PieChart
