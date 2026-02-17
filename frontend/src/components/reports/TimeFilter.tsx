interface Props {
  selected: string
  onChange: (val: string) => void
}

const TimeFilter = ({ selected, onChange }: Props) => {
  const options = ['daily', 'weekly', 'monthly']
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option}
          className={`px-4 py-1 rounded-full text-sm font-medium transition ${
            selected === option
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
          }`}
          onClick={() => onChange(option)}
        >
          {option.charAt(0).toUpperCase() + option.slice(1)}
        </button>
      ))}
    </div>
  )
}

export default TimeFilter
