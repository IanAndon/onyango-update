'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const salesData = [
  { day: 'Jul 1', sales: 10000 },
  { day: 'Jul 2', sales: 30000 },
  { day: 'Jul 3', sales: 25000 },
  { day: 'Jul 4', sales: 40000 },
]

export function SalesBarChart() {
  return (
    <Card className="rounded-2xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
      <CardHeader>
        <CardTitle>Sales Over Time</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={salesData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <XAxis dataKey="day" tick={{ fill: 'var(--muted-foreground)' }} />
            <YAxis tick={{ fill: 'var(--muted-foreground)' }} />
            <Tooltip formatter={(value: number) => value.toLocaleString()} />
            <Bar dataKey="sales" fill="var(--blue-500)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
