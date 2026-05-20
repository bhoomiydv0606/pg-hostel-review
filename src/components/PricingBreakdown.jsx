/**
 * PricingInput - Used in OwnerAddPG for entering structured pricing
 */
export function PricingInput({ pricing = {}, onChange }) {
  const calculateCost = (value) =>
    (Number(value.baseRent) || 0) +
    (Number(value.electricity) || 0) +
    (Number(value.food) || 0) +
    (Number(value.maintenance) || 0) +
    (Number(value.other) || 0)

  const update = (key, value) => {
    const updated = { ...pricing, [key]: value }
    updated.trueCost = calculateCost(updated)

    if (updated.hasAC) {
      updated.acTrueCost = calculateCost(updated.acPricing || {})
    }

    onChange(updated)
  }

  const updateAC = (key, value) => {
    const updated = {
      ...pricing,
      acPricing: { ...(pricing.acPricing || {}), [key]: value }
    }
    updated.acTrueCost = calculateCost(updated.acPricing)
    onChange(updated)
  }

  const addHiddenCharge = () => {
    const updated = {
      ...pricing,
      hiddenCharges: [...(pricing.hiddenCharges || []), { name: '', amount: '' }]
    }
    onChange(updated)
  }

  const updateHiddenCharge = (index, key, value) => {
    const updated = {
      ...pricing,
      hiddenCharges: (pricing.hiddenCharges || []).map((charge, chargeIndex) =>
        chargeIndex === index ? { ...charge, [key]: value } : charge
      )
    }
    onChange(updated)
  }

  const removeHiddenCharge = (index) => {
    const updated = {
      ...pricing,
      hiddenCharges: (pricing.hiddenCharges || []).filter((_, chargeIndex) => chargeIndex !== index)
    }
    onChange(updated)
  }

  const fields = [
    { key: 'baseRent', label: 'Base Rent', required: true },
    { key: 'electricity', label: 'Electricity (avg)' },
    { key: 'food', label: 'Food / Meals' },
    { key: 'maintenance', label: 'Maintenance' },
    { key: 'other', label: 'Other Charges' }
  ]

  const trueCost = calculateCost(pricing)
  const acTrueCost = pricing.hasAC ? calculateCost(pricing.acPricing || {}) : 0

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={pricing.hasAC || false}
            onChange={(e) => update('hasAC', e.target.checked)}
            style={{ width: '18px', height: '18px' }}
          />
          <span style={{ fontWeight: 600 }}>Offer AC rooms with different pricing</span>
        </label>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '18px', marginBottom: '16px' }}>Non-AC Room Pricing</h4>
        <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {fields.map((field) => (
            <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                {field.label} {field.required && <span style={{ color: 'var(--color-coral)' }}>*</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontWeight: 700, fontSize: '14px' }}>
                  Rs.
                </span>
                <input
                  type="number"
                  className="form-control"
                  style={{ paddingLeft: '46px' }}
                  value={pricing[field.key] || ''}
                  onChange={(e) => update(field.key, e.target.value)}
                  required={field.required}
                />
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
          Total Monthly Cost (Non-AC): <strong>Rs.{trueCost.toLocaleString()}</strong>
        </div>
      </div>

      {pricing.hasAC && (
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ fontSize: '18px', marginBottom: '16px' }}>AC Room Pricing</h4>
          <div className="responsive-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {fields.map((field) => (
              <div key={`ac-${field.key}`} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {field.label} {field.required && <span style={{ color: 'var(--color-coral)' }}>*</span>}
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontWeight: 700, fontSize: '14px' }}>
                    Rs.
                  </span>
                  <input
                    type="number"
                    className="form-control"
                    style={{ paddingLeft: '46px' }}
                    value={pricing.acPricing?.[field.key] || ''}
                    onChange={(e) => updateAC(field.key, e.target.value)}
                    required={field.required}
                  />
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
            Total Monthly Cost (AC): <strong>Rs.{acTrueCost.toLocaleString()}</strong>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '18px', marginBottom: '16px' }}>Hidden Charges (One-time or Variable)</h4>
        <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '16px' }}>
          List any extra fees residents might encounter, like registration or move-in charges.
        </p>
        {(pricing.hiddenCharges || []).map((charge, index) => (
          <div key={index} className="pricing-hidden-charge-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Charge name"
              className="form-control"
              value={charge.name}
              onChange={(e) => updateHiddenCharge(index, 'name', e.target.value)}
              style={{ flex: 1 }}
            />
            <div style={{ position: 'relative', width: '140px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontWeight: 700, fontSize: '12px' }}>
                Rs.
              </span>
              <input
                type="number"
                placeholder="Amount"
                className="form-control"
                style={{ paddingLeft: '34px' }}
                value={charge.amount}
                onChange={(e) => updateHiddenCharge(index, 'amount', e.target.value)}
              />
            </div>
            <button type="button" onClick={() => removeHiddenCharge(index)} style={{ background: 'none', border: 'none', color: 'var(--color-coral)', cursor: 'pointer' }}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addHiddenCharge} className="btn btn-outline" style={{ fontSize: '12px' }}>
          + Add Hidden Charge
        </button>
      </div>

      <div className="responsive-three-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div className="form-group">
          <label className="form-label">Security Deposit</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)', fontWeight: 700, fontSize: '14px' }}>
              Rs.
            </span>
            <input
              type="number"
              className="form-control"
              style={{ paddingLeft: '46px' }}
              value={pricing.securityDeposit || ''}
              onChange={(e) => update('securityDeposit', e.target.value)}
            />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Notice Period (days)</label>
          <input
            type="number"
            className="form-control"
            value={pricing.noticePeriodDays || ''}
            onChange={(e) => update('noticePeriodDays', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Lock-in Period (months)</label>
          <input
            type="number"
            className="form-control"
            value={pricing.lockInMonths || ''}
            onChange={(e) => update('lockInMonths', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * PricingDisplay - Used in PGDetailPage for showing pricing breakdown
 */
export function PricingDisplay({ pricing = {}, reportedPrices = [] }) {
  if (!pricing || !pricing.baseRent) return null

  const calculateCost = (value) =>
    (Number(value?.baseRent) || 0) +
    (Number(value?.electricity) || 0) +
    (Number(value?.food) || 0) +
    (Number(value?.maintenance) || 0) +
    (Number(value?.other) || 0)

  const trueCost = calculateCost(pricing)
  const acTrueCost = pricing.hasAC ? calculateCost(pricing.acPricing) : 0
  const avgReportedPrice = reportedPrices.length > 0
    ? Math.round(reportedPrices.reduce((sum, amount) => sum + amount, 0) / reportedPrices.length)
    : null
  const hasMismatch = avgReportedPrice && trueCost > 0 && Math.abs(avgReportedPrice - trueCost) / trueCost > 0.2

  const items = [
    { label: 'Base Rent', value: pricing.baseRent },
    { label: 'Electricity', value: pricing.electricity },
    { label: 'Food / Meals', value: pricing.food },
    { label: 'Maintenance', value: pricing.maintenance },
    { label: 'Other Charges', value: pricing.other }
  ].filter((item) => item.value && Number(item.value) > 0)

  const acItems = pricing.hasAC
    ? [
        { label: 'Base Rent (AC)', value: pricing.acPricing?.baseRent },
        { label: 'Electricity (AC)', value: pricing.acPricing?.electricity },
        { label: 'Food / Meals (AC)', value: pricing.acPricing?.food },
        { label: 'Maintenance (AC)', value: pricing.acPricing?.maintenance },
        { label: 'Other Charges (AC)', value: pricing.acPricing?.other }
      ].filter((item) => item.value && Number(item.value) > 0)
    : []

  return (
    <div className="pricing-display">
      <div style={{ marginBottom: '32px' }}>
        <h4 style={{ fontSize: '18px', marginBottom: '16px' }}>Non-AC Room Pricing</h4>
        <div style={{ marginBottom: '16px' }}>
          {items.map((item) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid rgba(0,0,0,0.03)'
              }}
            >
              <span style={{ fontSize: '14px', color: 'var(--color-muted)', fontWeight: 500 }}>
                {item.label}
              </span>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>
                Rs.{Number(item.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
        <div style={{ background: 'var(--color-ebony)', color: '#fff', borderRadius: '12px', padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px', opacity: 0.7, marginBottom: '4px' }}>
            True Monthly Cost (Non-AC)
          </div>
          <div style={{ fontSize: '20px', fontWeight: 800 }}>
            Rs.{trueCost.toLocaleString()}
          </div>
        </div>
      </div>

      {pricing.hasAC && acItems.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ fontSize: '18px', marginBottom: '16px' }}>AC Room Pricing</h4>
          <div style={{ marginBottom: '16px' }}>
            {acItems.map((item) => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(0,0,0,0.03)'
                }}
              >
                <span style={{ fontSize: '14px', color: 'var(--color-muted)', fontWeight: 500 }}>
                  {item.label}
                </span>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>
                  Rs.{Number(item.value).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--color-sage)', color: '#fff', borderRadius: '12px', padding: '16px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '1px', opacity: 0.7, marginBottom: '4px' }}>
              True Monthly Cost (AC)
            </div>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>
              Rs.{acTrueCost.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {pricing.hiddenCharges && pricing.hiddenCharges.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ fontSize: '18px', marginBottom: '16px' }}>Hidden Charges</h4>
          <div style={{ background: 'rgba(231, 76, 60, 0.05)', border: '1px solid rgba(231,76,60,0.1)', borderRadius: '12px', padding: '16px' }}>
            {pricing.hiddenCharges.map((charge, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: index < pricing.hiddenCharges.length - 1 ? '8px' : 0 }}>
                <span style={{ fontSize: '14px', color: 'var(--color-muted)' }}>{charge.name}</span>
                <span style={{ fontWeight: 700, fontSize: '14px', color: '#c0392b' }}>
                  Rs.{Number(charge.amount || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMismatch && (
        <div style={{ background: 'rgba(231, 76, 60, 0.08)', border: '1px solid rgba(231,76,60,0.15)', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#c0392b', marginBottom: '4px' }}>
            Price discrepancy detected
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
            Residents report paying Rs.{avgReportedPrice?.toLocaleString()}/mo on average.
          </div>
        </div>
      )}

      {(pricing.securityDeposit || pricing.noticePeriodDays || pricing.lockInMonths) && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', marginTop: '8px' }}>
          {pricing.securityDeposit && Number(pricing.securityDeposit) > 0 && (
            <div style={{ textAlign: 'center', padding: '14px', background: 'var(--color-bone)', borderRadius: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>Rs.{Number(pricing.securityDeposit).toLocaleString()}</div>
              <div style={{ fontSize: '10px', color: 'var(--color-muted)', fontWeight: 700, marginTop: '2px' }}>Deposit</div>
            </div>
          )}
          {pricing.noticePeriodDays && Number(pricing.noticePeriodDays) > 0 && (
            <div style={{ textAlign: 'center', padding: '14px', background: 'var(--color-bone)', borderRadius: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>{pricing.noticePeriodDays}d</div>
              <div style={{ fontSize: '10px', color: 'var(--color-muted)', fontWeight: 700, marginTop: '2px' }}>Notice</div>
            </div>
          )}
          {pricing.lockInMonths && Number(pricing.lockInMonths) > 0 && (
            <div style={{ textAlign: 'center', padding: '14px', background: 'var(--color-bone)', borderRadius: '12px' }}>
              <div style={{ fontSize: '16px', fontWeight: 800 }}>{pricing.lockInMonths}mo</div>
              <div style={{ fontSize: '10px', color: 'var(--color-muted)', fontWeight: 700, marginTop: '2px' }}>Lock-in</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
