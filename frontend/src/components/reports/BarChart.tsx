import {
  BarChart as BChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

const BarChart = ({ title, data }: { title: string; data: any[] }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-md">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BChart data={data}>
          <XAxis dataKey="period" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="sales" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        </BChart>
      </ResponsiveContainer>
    </div>
  )
}

export default BarChart
