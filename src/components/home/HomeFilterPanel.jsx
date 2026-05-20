function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition whitespace-nowrap shrink-0 ${
        active
          ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/20'
          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

function FilterBlock({ title, children }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</div>
      {children}
    </div>
  )
}

export default function HomeFilterPanel({
  filters,
  amenities,
  maxPrice,
  onUpdateFilter,
  onToggleAmenity
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="rounded-[32px] border border-slate-200 bg-slate-50/80 p-4 shadow-xl shadow-slate-200/40 backdrop-blur sm:p-6">
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Advanced filters</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Search the way students actually decide</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Narrow options by budget, meal inclusion, AC preference, gender fit, college distance, and everyday amenities.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <FilterBlock title="Budget range">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="number"
                min="0"
                value={filters.budgetMin || ''}
                onChange={(event) => onUpdateFilter('budgetMin', Number(event.target.value) || 0)}
                placeholder="Min budget"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              />
              <input
                type="number"
                min="0"
                value={filters.budgetMax === maxPrice ? '' : filters.budgetMax}
                onChange={(event) => onUpdateFilter('budgetMax', Number(event.target.value) || maxPrice)}
                placeholder="Max budget"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/15"
              />
            </div>
          </FilterBlock>

          <FilterBlock title="Meals">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'any', label: 'Any' },
                { value: 'included', label: 'Food included' },
                { value: 'not-included', label: 'No food' }
              ].map((option) => (
                <FilterPill
                  key={option.value}
                  active={filters.food === option.value}
                  onClick={() => onUpdateFilter('food', option.value)}
                >
                  {option.label}
                </FilterPill>
              ))}
            </div>
          </FilterBlock>

          <FilterBlock title="Room type">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'any', label: 'Any' },
                { value: 'ac', label: 'AC' },
                { value: 'non-ac', label: 'Non-AC' }
              ].map((option) => (
                <FilterPill
                  key={option.value}
                  active={filters.roomType === option.value}
                  onClick={() => onUpdateFilter('roomType', option.value)}
                >
                  {option.label}
                </FilterPill>
              ))}
            </div>
          </FilterBlock>

          <FilterBlock title="Suitable for">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'any', label: 'Any' },
                { value: 'boys', label: 'Boys' },
                { value: 'girls', label: 'Girls' },
                { value: 'co-ed', label: 'Co-ed' }
              ].map((option) => (
                <FilterPill
                  key={option.value}
                  active={filters.gender === option.value}
                  onClick={() => onUpdateFilter('gender', option.value)}
                >
                  {option.label}
                </FilterPill>
              ))}
            </div>
          </FilterBlock>

          <FilterBlock title="Distance from college">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'any', label: 'Any' },
                { value: '1', label: 'Within 1 km' },
                { value: '3', label: 'Within 3 km' },
                { value: '5', label: 'Within 5 km' }
              ].map((option) => (
                <FilterPill
                  key={option.value}
                  active={filters.maxDistance === option.value}
                  onClick={() => onUpdateFilter('maxDistance', option.value)}
                >
                  {option.label}
                </FilterPill>
              ))}
            </div>
          </FilterBlock>

          <FilterBlock title="Amenities">
            <div className="flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <FilterPill
                  key={amenity}
                  active={filters.amenities.includes(amenity)}
                  onClick={() => onToggleAmenity(amenity)}
                >
                  {amenity}
                </FilterPill>
              ))}
            </div>
          </FilterBlock>
        </div>
      </div>
    </section>
  )
}
