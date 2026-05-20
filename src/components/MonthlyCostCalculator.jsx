import React from 'react'
export function MonthlyCostCalculator({ pricing = {} }) {
  const [months, setMonths] = React.useState(1)
  const [includeDeposit, setIncludeDeposit] = React.useState(false)
  const [roomType, setRoomType] = React.useState('non-ac')

  const calcMonthly = () => {
    const p = roomType === 'ac' && pricing.hasAC ? pricing.acPricing : pricing
    return (Number(p.baseRent) || 0) + (Number(p.electricity) || 0) + (Number(p.food) || 0) + (Number(p.maintenance) || 0) + (Number(p.other) || 0)
  }

  const monthlyCost = calcMonthly()
  const totalCost = monthlyCost * months + (includeDeposit ? (Number(pricing.securityDeposit) || 0) : 0)
  const hiddenTotal = (pricing.hiddenCharges || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

  return (
    <div style={{ padding: '24px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '12px', background: 'var(--color-bone)' }}>
      <h4 style={{ fontSize: '18px', marginBottom: '16px' }}>💡 Monthly Cost Calculator</h4>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
        <div>
          <label style={{ fontSize: '14px', fontWeight: 600 }}>Room Type</label>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)} style={{ width: '120px', padding: '8px', borderRadius: '6px' }}>
            <option value="non-ac">Non-AC</option>
            {pricing.hasAC && <option value="ac">AC</option>}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '14px', fontWeight: 600 }}>Months</label>
          <input
            type="number"
            min="1"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            style={{ width: '80px', padding: '8px', borderRadius: '6px' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '14px', fontWeight: 600 }}>
            <input type="checkbox" checked={includeDeposit} onChange={(e) => setIncludeDeposit(e.target.checked)} /> Include Deposit
          </label>
        </div>
      </div>

      <div style={{ fontSize: '16px', marginBottom: '8px' }}>
        Monthly Cost: <strong>₹{monthlyCost}</strong>
      </div>
      <div style={{ fontSize: '16px', marginBottom: '8px' }}>
        Total for {months} month{months > 1 ? 's' : ''}: <strong>₹{totalCost}</strong>
      </div>
      {hiddenTotal > 0 && (
        <div style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
          + Hidden Charges: ₹{hiddenTotal} (one-time)
        </div>
      )}
    </div>
  )
}