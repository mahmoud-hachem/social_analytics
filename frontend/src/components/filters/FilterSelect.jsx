function FilterSelect({
    label,
    options,
}) {
    return (
        <div className="filter-group">

            <label className="filter-label">
                {label}
            </label>

            <select className="filter-select">

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