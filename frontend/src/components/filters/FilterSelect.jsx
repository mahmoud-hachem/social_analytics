function FilterSelect({
    label,
    options,
    value,
    onChange,
}) {
    return (
        <div className="filter-group">

            <label className="filter-label">
                {label}
            </label>

            <select
                className="filter-select"
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
            >

                <option value="">
                    All
                </option>

                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}

            </select>

        </div>
    )
}

export default FilterSelect