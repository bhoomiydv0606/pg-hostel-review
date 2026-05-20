export default function HomeSearchHero({
  search,
  city,
  showFilters,
  activePreset,
  presets,
  metrics,
  activeChips,
  compareCount,
  onSearchChange,
  onCityChange,
  onToggleFilters,
  onBrowseResults,
  onApplyPreset,
  onClearAllFilters,
  onGetLocation,
  onOpenAI,
  onOpenComparison
}) {
  return (
    <section id="hero" className="hero-section">
      <div className="hero-inner">

        {/* ── Headline ── */}
        <div className="hero-headline-block">
          <span className="hero-eyebrow">Trusted PG & Hostel Reviews</span>
          <h1 className="hero-title">
            Find your perfect stay,<br />backed by real reviews.
          </h1>
          <p className="hero-subtitle">
            Compare pricing, distance, amenities and honest student reviews — all in one place.
          </p>
        </div>

        {/* ── Search Bar ── */}
        <div className="hero-search-bar">
          <div className="hero-search-fields">
            <div className="hero-field">
              <label className="hero-label" htmlFor="hero-search">Search</label>
              <input
                id="hero-search"
                className="hero-input"
                type="text"
                placeholder="PG name, address, or college..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <div className="hero-field">
              <label className="hero-label" htmlFor="hero-city">City</label>
              <input
                id="hero-city"
                className="hero-input"
                type="text"
                placeholder="e.g. Bangalore, Delhi"
                value={city}
                onChange={(e) => onCityChange(e.target.value)}
              />
            </div>
            <button className="hero-cta-btn" type="button" onClick={onBrowseResults}>
              Browse Stays
            </button>
          </div>

          {/* Quick presets */}
          <div className="hero-presets">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`hero-preset-chip${activePreset === p.key ? ' active' : ''}`}
                onClick={() => onApplyPreset(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Quick actions */}
          <div className="hero-quick-actions">
            <button type="button" className="hero-action-link" onClick={onGetLocation}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              Near Me
            </button>
            <button type="button" className="hero-action-link" onClick={onOpenAI}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
              AI Concierge
            </button>
            <button type="button" className="hero-action-link accent" onClick={onOpenComparison}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Compare{compareCount > 0 ? ` (${compareCount})` : ''}
            </button>
            <button type="button" className="hero-action-link muted" onClick={onToggleFilters}>
              {showFilters ? 'Hide Filters' : 'More Filters'}
            </button>
          </div>

          {/* Active chips */}
          {activeChips.length > 0 && (
            <div className="hero-active-chips">
              <span className="hero-chips-label">Active:</span>
              {activeChips.map((chip) => (
                <span key={chip} className="hero-chip">{chip}</span>
              ))}
              <button type="button" className="hero-clear-btn" onClick={onClearAllFilters}>
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Trust Metrics Strip ── */}
      <div className="hero-metrics-strip">
        {metrics.map((m) => (
          <div key={m.label} className="hero-metric-card">
            <div className="hero-metric-value">{m.value}</div>
            <div className="hero-metric-label">{m.label}</div>
            <div className="hero-metric-detail">{m.detail}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
