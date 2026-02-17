'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon?: React.ReactNode
}) {
  return (
    <Card className="rounded-2xl border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
        {icon && <span className="text-xl">{icon}</span>}
        {value.toLocaleString()}
      </CardContent>
    </Card>
  )
}
