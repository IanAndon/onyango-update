'use client'

import dynamic from 'next/dynamic'
import { ApexOptions } from 'apexcharts'
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default function SalesCategoryPie() {
  const series = [90000, 60000, 40000]
  const labels = ['Painkillers', 'Antibiotics', 'Supplements']

  const options: ApexOptions = {
    chart: { type: 'donut' },
    labels,
    dataLabels: { enabled: false },
    legend: {
      position: 'bottom',
      fontFamily: 'Outfit',
      labels: { colors: ['#888'] },
    },
    tooltip: {
      y: { formatter: (val: number) => `${val.toLocaleString()} TZS` },
    },
    colors: ['#60a5fa', '#818cf8', '#facc15'],
    stroke: { show: false },
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-5">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        Sales by Category
      </h3>
      <ReactApexChart options={options} series={series} type="donut" height={260} />
    </div>
  )
}
