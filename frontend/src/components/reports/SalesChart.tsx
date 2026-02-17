'use client'

import dynamic from 'next/dynamic'
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false })

export default function SalesChart() {
  const series = [{ name: 'Sales', data: [10000, 30000, 25000, 40000] }]
  const categories = ['Jul 1', 'Jul 2', 'Jul 3', 'Jul 4']

  const options = {
    chart: { type: 'bar' as const, toolbar: { show: false }, fontFamily: 'Outfit, sans-serif' },
    plotOptions: {
      bar: { borderRadius: 6, columnWidth: '40%' },
    },
    dataLabels: { enabled: false },
    stroke: { show: true, width: 4, colors: ['transparent'] },
    xaxis: {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: '#888' } },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => val.toLocaleString(),
        style: { colors: '#888' },
      },
    },
    tooltip: {
      y: { formatter: (val: number) => `${val.toLocaleString()} TZS` },
    },
    fill: { opacity: 1 },
    colors: ['#3b82f6'],
    grid: { borderColor: 'rgba(0,0,0,0.05)' },
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-5">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-4">
        Sales Over Time
      </h3>
      <ReactApexChart options={options} series={series} type="bar" height={260} />
    </div>
  )
}
