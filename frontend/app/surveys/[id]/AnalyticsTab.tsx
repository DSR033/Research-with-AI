'use client'
import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Framework data (from analytics spec) ──────────────────────────────────────
const QUESTIONS = [
  { id: 1,  name: 'Single Choice',  icon: '◉', color: 'var(--ai)',    tier: 1, dataType: 'Nominal / Ordinal' },
  { id: 2,  name: 'Multi-Select',   icon: '☑', color: 'var(--accent)', tier: 1, dataType: 'Nominal (multi-response)' },
  { id: 3,  name: 'Yes / No',       icon: '⬤', color: 'var(--green)',  tier: 1, dataType: 'Binary (0/1)' },
  { id: 4,  name: 'Dropdown',       icon: '▾', color: 'var(--accent)', tier: 2, dataType: 'Nominal / Ordinal' },
  { id: 5,  name: 'Rating Scale',   icon: '★', color: 'var(--amber)',  tier: 1, dataType: 'Ordinal / Interval-like' },
  { id: 6,  name: 'Likert Scale',   icon: '≡', color: 'var(--ai)',    tier: 1, dataType: 'Ordinal / Interval-like' },
  { id: 7,  name: 'Matrix',         icon: '⊞', color: 'var(--ai)',    tier: 2, dataType: 'Ordinal / Interval-like (per row)' },
  { id: 8,  name: 'Ranking',        icon: '⇕', color: 'var(--amber)',  tier: 2, dataType: 'Ordinal (rank per item)' },
  { id: 9,  name: 'NPS',            icon: '◎', color: 'var(--red)',    tier: 1, dataType: 'Integer 0–10 + derived segment' },
  { id: 10, name: 'Slider',         icon: '⟷', color: 'var(--accent)', tier: 3, dataType: 'Continuous / ratio-like' },
  { id: 11, name: 'Numeric Input',  icon: '#',  color: 'var(--green)',  tier: 2, dataType: 'Ratio (true zero)' },
  { id: 12, name: 'Constant Sum',   icon: 'Σ',  color: 'var(--red)',    tier: 3, dataType: 'Compositional / ratio-like' },
  { id: 13, name: 'Date / Time',    icon: '📅', color: 'var(--green)',  tier: 3, dataType: 'Interval / Ratio' },
  { id: 14, name: 'Demographic',    icon: '👤', color: 'var(--ai)',    tier: 1, dataType: 'Mixed' },
]

// 0=N/A  1=full  2=conditional
const MATRIX: Record<string, number[]> = {
  'Frequency / Distribution':   [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  'Cross-tabulation':           [1,1,1,1,1,1,1,2,1,2,2,2,2,1],
  'Segmentation':               [1,1,1,1,2,2,2,2,1,2,1,2,1,1],
  'Chi-square Test':            [1,1,1,1,2,2,2,0,1,0,0,0,0,1],
  'Correlation':                [0,2,2,0,1,1,1,2,1,1,1,2,1,2],
  'Linear Regression':          [0,2,0,0,1,1,1,0,1,1,1,2,1,2],
  'Logistic Regression':        [1,1,1,1,2,2,2,0,1,2,2,0,0,1],
  'Reliability (Cronbach\'s α)':[0,0,0,0,1,1,1,0,0,1,0,0,0,0],
  'Factor Analysis / PCA':      [0,2,0,0,1,1,1,0,0,1,1,0,0,0],
  'Trend Analysis':             [1,1,1,1,1,1,1,2,1,1,1,2,1,1],
  'Cohort Analysis':            [1,2,1,1,1,1,1,0,1,1,1,0,1,1],
  'Ranking / Priority':         [0,2,0,0,2,2,2,1,0,0,0,1,0,0],
  'Driver Analysis':            [1,1,1,1,1,1,1,0,1,1,1,2,0,1],
  'Comparative Analysis':       [1,1,1,1,1,1,1,1,1,1,1,1,1,1],
}

const METHOD_DETAIL: Record<string, { desc: string; bestFor: string; conditions: string | null; outcome: string }> = {
  'Frequency / Distribution': { desc: 'Count how often each response option occurs. The starting point for every survey analysis — understand the shape of responses before doing anything else.', bestFor: 'All question types. For numeric and slider, bin values into ranges first.', conditions: null, outcome: 'Bar charts, pie charts, % breakdowns per option.' },
  'Cross-tabulation': { desc: "Compare how response distributions differ across groups. The most-used analytics view in any survey platform — 'how did plan type affect satisfaction?'", bestFor: 'Single Choice, Yes/No, Demographic, NPS segment as the grouping variable.', conditions: 'Numeric and slider must be bucketed into categories first. Each cross-tab cell needs n ≥ 5 for chi-square validity.', outcome: 'Pivot tables, stacked bar charts, segment comparison views.' },
  'Segmentation': { desc: 'Split the full dataset into groups and compare everything else across those groups. Demographics, plan type, and NPS segment are the cleanest segmentation variables.', bestFor: 'Demographic, Single Choice, Yes/No, NPS segment, Date/Time (as cohort).', conditions: 'Need n ≥ 30 per segment for reliable statistics. Too many segments dilutes statistical power.', outcome: 'Filtered dashboards, side-by-side comparisons, segment profiles.' },
  'Chi-square Test': { desc: "Test whether the distribution of a categorical variable differs significantly across groups. Answers 'is this difference real or just noise?'", bestFor: 'Single Choice, Yes/No, Dropdown, Demographic, NPS segment.', conditions: 'Both variables must be categorical. Expected frequency in each cell must be ≥ 5. Use Fisher\'s exact test for small samples.', outcome: 'p-value, chi-square statistic, whether to reject the null hypothesis.' },
  'Correlation': { desc: "Measure the strength and direction of the relationship between two variables. 'Do customers who rate ease highly also rate satisfaction highly?'", bestFor: 'Rating Scale, Likert Scale, Matrix, Slider, Numeric Input, NPS (raw 0–10 score).', conditions: 'Pearson requires interval-level data. Spearman works for ordinal. For binary variables, use point-biserial correlation.', outcome: 'Correlation coefficient (r), correlation matrix heatmap.' },
  'Linear Regression': { desc: "Model the relationship between one or more predictors and a continuous outcome. 'Which factors most predict satisfaction score?'", bestFor: 'Outcome variable: Rating, Likert composite, Slider, Numeric Input, NPS raw score. Predictors: any type with appropriate encoding.', conditions: 'Categorical predictors must be dummy-coded. Check multicollinearity (VIF < 5). Ordinal outcomes → use ordinal logistic regression instead.', outcome: 'Regression coefficients, R², predictor importance ranking.' },
  'Logistic Regression': { desc: "Model the probability of a binary outcome. 'What predicts whether someone is a Promoter vs. Detractor?'", bestFor: 'Outcome: Yes/No, NPS Promoter/Detractor flag, churn. Predictors: Single Choice, Rating, Demographic, Likert.', conditions: 'Outcome must be binary. For more than two outcome categories, use multinomial logistic regression.', outcome: 'Odds ratios, predicted probabilities, predictor significance.' },
  'Reliability (Cronbach\'s α)': { desc: 'Measure whether multiple items measuring the same construct are internally consistent. Essential before reporting a composite scale score.', bestFor: 'Likert Scale battery, Rating Scale group, Matrix (when rows form a single construct).', conditions: 'Need minimum 3 items per construct (5–7 recommended). All on the same scale. Reverse-score negatively worded items first. Target α ≥ 0.7.', outcome: 'Alpha coefficient, item-total correlations, which items to drop.' },
  'Factor Analysis / PCA': { desc: "Identify latent constructs from a group of correlated items. 'Do our 12 product attribute ratings actually measure 3 underlying dimensions?'", bestFor: 'Likert Scale battery, Rating Scale group, Matrix with many rows.', conditions: 'Need n ≥ 5–10 per item (ideally n ≥ 200). KMO ≥ 0.6 and significant Bartlett\'s test required.', outcome: 'Factor loadings, scree plot, named latent constructs.' },
  'Trend Analysis': { desc: "Track how a metric changes over time across survey waves. 'Is our NPS improving quarter over quarter?'", bestFor: 'NPS, Rating Scale, Likert composite, Yes/No, Single Choice — asked identically across waves.', conditions: 'Question wording must be identical across waves. Report confidence intervals for NPS.', outcome: 'Line charts over time, period-over-period change, moving averages.' },
  'Cohort Analysis': { desc: "Group respondents by when they joined or experienced something, then compare outcomes across cohorts. 'Do Q1 customers rate us differently than Q3 cohorts?'", bestFor: 'Date/Time (as cohort grouper), Demographic, Single Choice, NPS.', conditions: 'Need sufficient n per cohort (≥ 30). Cohort definitions must be consistent and mutually exclusive.', outcome: 'Cohort tables, heatmaps of metric by cohort and time.' },
  'Ranking / Priority': { desc: "Establish the relative priority order of items. 'Which of these 5 features matters most to customers?'", bestFor: 'Ranking (direct priority data), Constant Sum (quantified importance weights).', conditions: 'Ranking: use mean rank or Borda count. Constant Sum: note compositional constraint before running further statistics.', outcome: 'Priority ranking table, importance weights per item, Borda scores.' },
  'Driver Analysis': { desc: "Identify which factors most strongly predict a key outcome metric. 'What drives NPS? Which attributes most explain overall satisfaction?'", bestFor: 'Outcome: NPS, Overall Satisfaction Rating, Yes/No (churn). Drivers: Rating Scale, Likert, Matrix, Single Choice, Demographic.', conditions: 'Use multiple regression (linear or logistic). Standardize predictors to compare coefficients. Check VIF < 5.', outcome: 'Driver importance chart, standardized coefficients, key lever identification.' },
  'Comparative Analysis': { desc: "Compare means or distributions across two or more groups. 'Do enterprise customers rate us higher than SMB customers?'", bestFor: 'All question types as outcomes; Demographic or Single Choice as the grouping variable.', conditions: 'Use t-test for two groups, ANOVA for three or more. Apply Bonferroni correction. Need n ≥ 30 per group.', outcome: 'Mean scores by group, significance flags, effect sizes.' },
}

const TIER_LABEL: Record<number, string> = { 1: 'Tier 1 — MVP', 2: 'Tier 2 — V2', 3: 'Tier 3 — V3+' }
const TIER_COLOR: Record<number, string> = { 1: 'var(--ai)', 2: 'var(--accent)', 3: 'var(--green)' }

// ── Crosstab component ────────────────────────────────────────────────────────
interface SurveyQuestion { id: string; title: string; type: string }
interface CrosstabData {
  row_values: string[]; col_values: string[]
  counts: Record<string, Record<string, number>>
  row_totals: Record<string, number>; col_totals: Record<string, number>
  grand_total: number
}

function CrosstabPanel({ surveyId, questions }: { surveyId: string; questions: SurveyQuestion[] }) {
  const [rowQ, setRowQ] = useState('')
  const [colQ, setColQ] = useState('')
  const [data, setData] = useState<CrosstabData | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const run = async () => {
    if (!rowQ || !colQ || rowQ === colQ) { setErr('Select two different questions.'); return }
    setErr(null); setLoading(true)
    const r = await fetch(`${API}/surveys/${surveyId}/analytics/crosstab?row_qid=${rowQ}&col_qid=${colQ}`)
    if (!r.ok) { setErr('Failed to compute cross-tabulation.'); setLoading(false); return }
    setData(await r.json()); setLoading(false)
  }

  const selStyle: React.CSSProperties = {
    border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px',
    fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none', flex: 1,
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Cross-tabulation</div>
      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
        Compare how responses to one question vary across answers to another.
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={rowQ} onChange={e => setRowQ(e.target.value)} style={selStyle}>
          <option value="">Row variable (question)…</option>
          {questions.map(q => <option key={q.id} value={q.id}>{q.title.slice(0, 50)}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--grey)', flexShrink: 0 }}>×</span>
        <select value={colQ} onChange={e => setColQ(e.target.value)} style={selStyle}>
          <option value="">Column variable (question)…</option>
          {questions.map(q => <option key={q.id} value={q.id}>{q.title.slice(0, 50)}</option>)}
        </select>
        <button className="btn" onClick={run} disabled={loading || !rowQ || !colQ} style={{ padding: '8px 18px', fontSize: 13, flexShrink: 0 }}>
          {loading ? <><span className="spinner" />Running…</> : 'Run'}
        </button>
      </div>

      {err && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{err}</div>}

      {data && data.grand_total === 0 && (
        <div style={{ color: 'var(--grey)', fontSize: 13, padding: '20px 0' }}>No matching responses found for this combination.</div>
      )}

      {data && data.grand_total > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 8 }}>
            n = {data.grand_total} responses · Values show count (% of row)
          </div>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid var(--border)', fontWeight: 700, color: 'var(--text)' }}>
                  {questions.find(q => q.id === rowQ)?.title.slice(0, 25) ?? 'Row'}
                </th>
                {data.col_values.map(cv => (
                  <th key={cv} style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>{cv}</th>
                ))}
                <th style={{ padding: '8px 12px', textAlign: 'center', borderBottom: '2px solid var(--border)', color: 'var(--grey)', fontWeight: 600 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.row_values.map((rv, ri) => (
                <tr key={rv} style={{ borderBottom: '1px solid var(--border)', background: ri % 2 === 0 ? 'white' : 'var(--bg)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{rv}</td>
                  {data.col_values.map(cv => {
                    const count = data.counts[rv]?.[cv] ?? 0
                    const pct = data.row_totals[rv] > 0 ? Math.round((count / data.row_totals[rv]) * 100) : 0
                    return (
                      <td key={cv} style={{ padding: '8px 12px', textAlign: 'center' }}>
                        {count > 0 ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{count}</div>
                            <div style={{ color: 'var(--grey)', fontSize: 10 }}>{pct}%</div>
                          </>
                        ) : <span style={{ color: 'var(--border)' }}>—</span>}
                      </td>
                    )
                  })}
                  <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>
                    {data.row_totals[rv]}
                  </td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg)' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--grey)' }}>Total</td>
                {data.col_values.map(cv => (
                  <td key={cv} style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--grey)' }}>{data.col_totals[cv]}</td>
                ))}
                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, color: 'var(--accent)' }}>{data.grand_total}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Framework Explorer ─────────────────────────────────────────────────────────
function FrameworkExplorer() {
  const methods = Object.keys(MATRIX)
  const [active, setActive] = useState(methods[0])
  const detail = METHOD_DETAIL[active]
  const supported = QUESTIONS.map((q, i) => ({ ...q, support: MATRIX[active][i] }))
  const full = supported.filter(q => q.support === 1)
  const conditional = supported.filter(q => q.support === 2)
  const na = supported.filter(q => q.support === 0)

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 520, border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 210, borderRight: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--grey)', borderBottom: '1px solid var(--border)' }}>
          Analytics Methods
        </div>
        <div style={{ overflowY: 'auto', maxHeight: 480 }}>
          {methods.map(m => {
            const isActive = m === active
            const fullCount = MATRIX[m].filter(v => v === 1).length
            return (
              <div key={m} onClick={() => setActive(m)} style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                background: isActive ? '#EEF2FF' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--grey)',
                lineHeight: 1.3,
              }}>
                {m}
                <div style={{ fontSize: 10, fontWeight: 400, color: 'var(--green)', marginTop: 2 }}>✅ {fullCount} types</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{active}</div>
        <div style={{ fontSize: 13, color: 'var(--grey)', lineHeight: 1.6, marginBottom: 16, maxWidth: 580 }}>{detail.desc}</div>

        <div style={{ display: 'grid', gridTemplateColumns: detail.conditions ? '1fr 1fr 1fr' : '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Best question types', value: detail.bestFor, color: 'var(--ai)' },
            ...(detail.conditions ? [{ label: 'Conditions & requirements', value: detail.conditions, color: 'var(--amber)' }] : []),
            { label: 'What you get', value: detail.outcome, color: 'var(--green)' },
          ].map(box => (
            <div key={box.label} style={{ background: 'var(--bg)', border: `1px solid var(--border)`, borderRadius: 8, padding: '10px 12px', borderTop: `2px solid ${box.color}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: box.color, marginBottom: 5 }}>{box.label}</div>
              <div style={{ fontSize: 12, color: 'var(--grey)', lineHeight: 1.5 }}>{box.value}</div>
            </div>
          ))}
        </div>

        {/* Question type cards */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>✅ Fully supported ({full.length})</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {full.map(q => (
              <div key={q.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderLeft: `3px solid ${q.color}`, borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{q.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{q.name}</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--grey)' }}>{q.dataType}</div>
                <div style={{ fontSize: 10, fontWeight: 600, color: TIER_COLOR[q.tier], marginTop: 3 }}>{TIER_LABEL[q.tier]}</div>
              </div>
            ))}
          </div>
        </div>

        {(conditional.length > 0 || na.length > 0) && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grey)', marginBottom: 6 }}>
              ⚠️ Conditional ({conditional.length}) &nbsp;·&nbsp; ❌ Not applicable ({na.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
              {[...conditional, ...na].map(q => (
                <div key={q.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', opacity: 0.55 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{q.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--grey)' }}>{q.name}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--grey)' }}>{q.dataType}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main AnalyticsTab ──────────────────────────────────────────────────────────
// ── Correlation Matrix ────────────────────────────────────────────────────────
interface CorrQuestion { id: string; title: string; type: string }
interface CorrData { questions: CorrQuestion[]; matrix: Record<string, Record<string, number | null>>; n: number }

function CorrelationPanel({ surveyId }: { surveyId: string }) {
  const [data, setData] = useState<CorrData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`${API}/surveys/${surveyId}/analytics/correlation`)
      .then(r => r.json()).then(setData).catch(() => {}).finally(() => setLoading(false))
  }, [surveyId])

  if (loading) return <div style={{ color: 'var(--grey)', padding: '24px 0', fontSize: 13 }}>Computing correlations…</div>
  if (!data || data.questions.length < 2) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--grey)', padding: '40px 0', fontSize: 13 }}>
        Need at least 2 numeric/scale questions (Rating, NPS, Slider, Numeric Input) with completed responses.
      </div>
    )
  }

  const getColor = (v: number | null) => {
    if (v === null) return '#F5F5F5'
    if (v === 1) return '#1E3A8A'
    if (v >= 0.7)  return '#1D4ED8'
    if (v >= 0.4)  return '#60A5FA'
    if (v >= 0.1)  return '#BFDBFE'
    if (v >= -0.1) return '#F3F4F6'
    if (v >= -0.4) return '#FCA5A5'
    if (v >= -0.7) return '#EF4444'
    return '#991B1B'
  }
  const getTextColor = (v: number | null) => v !== null && Math.abs(v) > 0.5 ? 'white' : '#1F2937'

  const qs = data.questions
  const maxLabel = 22

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Correlation Matrix</div>
      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
        Pearson r between all scale questions · n = {data.n} complete responses
      </div>

      {data.n < 5 ? (
        <div style={{ color: 'var(--amber)', fontSize: 13, padding: '12px 16px', background: 'var(--amber-bg)', borderRadius: 8 }}>
          ⚠️ Only {data.n} complete responses — need at least 5 for reliable correlations.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 8px', width: 140 }} />
                  {qs.map(q => (
                    <th key={q.id} style={{ padding: '6px 6px', textAlign: 'center', fontWeight: 600, color: 'var(--grey)', maxWidth: 80, fontSize: 10 }}>
                      {q.title.slice(0, maxLabel)}{q.title.length > maxLabel ? '…' : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {qs.map(row => (
                  <tr key={row.id}>
                    <td style={{ padding: '4px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.title.slice(0, maxLabel)}{row.title.length > maxLabel ? '…' : ''}
                    </td>
                    {qs.map(col => {
                      const v = data.matrix[row.id]?.[col.id] ?? null
                      return (
                        <td key={col.id} title={v !== null ? `r = ${v}` : 'No data'} style={{
                          padding: '8px 6px', textAlign: 'center', fontWeight: 600,
                          background: getColor(v), color: getTextColor(v),
                          borderRadius: 4, border: '2px solid white', cursor: 'default',
                        }}>
                          {v !== null ? v.toFixed(2) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 16, flexWrap: 'wrap', fontSize: 11 }}>
            <span style={{ color: 'var(--grey)' }}>Strength:</span>
            {[['#1D4ED8','Strong +'], ['#60A5FA','Moderate +'], ['#F3F4F6','Weak'], ['#FCA5A5','Moderate −'], ['#EF4444','Strong −']].map(([bg, label]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 14, height: 14, borderRadius: 3, background: bg, display: 'inline-block', border: '1px solid #E3E8EF' }} />
                <span style={{ color: 'var(--grey)' }}>{label}</span>
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--grey)', marginTop: 8 }}>
            r &gt; 0.7 = strong · 0.4–0.7 = moderate · &lt; 0.4 = weak · Hover cells to see exact value
          </div>
        </>
      )}
    </div>
  )
}

// ── Driver Analysis ───────────────────────────────────────────────────────────
interface DriverQuestion { id: string; title: string; type: string }
interface DriverResult { question_id: string; title: string; type: string; correlation: number | null; abs_correlation: number | null }
interface DriverData { outcome: { id: string; title: string }; drivers: DriverResult[]; n: number }

function DriverPanel({ surveyId, questions }: { surveyId: string; questions: SurveyQuestion[] }) {
  const SCALE_TYPES = ['rating', 'nps', 'slider', 'numeric_input']
  const scaleQs = questions.filter(q => SCALE_TYPES.includes(q.type))
  const [outcomeId, setOutcomeId] = useState('')
  const [data, setData] = useState<DriverData | null>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!outcomeId) return
    setLoading(true)
    const r = await fetch(`${API}/surveys/${surveyId}/analytics/drivers?outcome_qid=${outcomeId}`)
    if (r.ok) setData(await r.json())
    setLoading(false)
  }

  const selStyle: React.CSSProperties = {
    border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px',
    fontSize: 13, fontFamily: 'inherit', background: 'white', outline: 'none', flex: 1,
  }

  const maxBar = data?.drivers[0]?.abs_correlation ?? 1

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Driver Analysis</div>
      <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 16 }}>
        Rank which questions most strongly predict your chosen outcome metric.
      </div>

      {scaleQs.length < 2 ? (
        <div style={{ color: 'var(--grey)', fontSize: 13 }}>
          Need at least 2 scale/numeric questions (Rating, NPS, Slider, Numeric Input) to run driver analysis.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, color: 'var(--grey)', flexShrink: 0 }}>Outcome metric:</div>
            <select value={outcomeId} onChange={e => { setOutcomeId(e.target.value); setData(null) }} style={selStyle}>
              <option value="">— Choose the question to explain —</option>
              {scaleQs.map(q => <option key={q.id} value={q.id}>{q.title.slice(0, 55)}</option>)}
            </select>
            <button className="btn" onClick={run} disabled={!outcomeId || loading} style={{ padding: '8px 18px', fontSize: 13, flexShrink: 0 }}>
              {loading ? <><span className="spinner" />Analysing…</> : 'Run'}
            </button>
          </div>

          {data && (
            data.n < 5 ? (
              <div style={{ color: 'var(--amber)', fontSize: 13, padding: '12px 16px', background: 'var(--amber-bg)', borderRadius: 8 }}>
                ⚠️ Only {data.n} complete responses — need at least 5 for reliable driver analysis.
              </div>
            ) : data.drivers.length === 0 ? (
              <div style={{ color: 'var(--grey)', fontSize: 13 }}>No other scale questions found to use as drivers.</div>
            ) : (
              <div>
                <div style={{ fontSize: 12, color: 'var(--grey)', marginBottom: 14 }}>
                  n = {data.n} responses · Outcome: <strong>{data.outcome.title}</strong> · Sorted by absolute correlation
                </div>
                {data.drivers.map((d, i) => {
                  const r = d.correlation
                  const pct = d.abs_correlation !== null ? Math.round((d.abs_correlation / (maxBar || 1)) * 100) : 0
                  const isPos = (r ?? 0) >= 0
                  const strength = d.abs_correlation === null ? 'No data'
                    : d.abs_correlation >= 0.7 ? 'Strong'
                    : d.abs_correlation >= 0.4 ? 'Moderate'
                    : 'Weak'
                  const barColor = r === null ? 'var(--border)' : isPos ? 'var(--accent)' : 'var(--red)'

                  return (
                    <div key={d.question_id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--grey)', width: 20, flexShrink: 0 }}>#{i + 1}</span>
                        <div style={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: strength === 'Strong' ? (isPos ? '#DBEAFE' : '#FEE2E2') : 'var(--bg)',
                            color: strength === 'Strong' ? (isPos ? 'var(--accent)' : 'var(--red)') : 'var(--grey)',
                          }}>{strength}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: r !== null ? (isPos ? 'var(--accent)' : 'var(--red)') : 'var(--grey)', width: 50, textAlign: 'right' }}>
                            {r !== null ? `${r > 0 ? '+' : ''}${r.toFixed(2)}` : '—'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 20, flexShrink: 0 }} />
                        <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width .4s' }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div style={{ marginTop: 16, fontSize: 11, color: 'var(--grey)', padding: '10px 14px', background: 'var(--bg)', borderRadius: 8 }}>
                  💡 Positive correlation (+) means higher scores on that question are associated with higher scores on the outcome.
                  Negative (−) means the opposite. Focus on <strong>Strong</strong> drivers first — they explain the most variance.
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  )
}

// ── Main AnalyticsTab ──────────────────────────────────────────────────────────
export default function AnalyticsTab({ surveyId }: { surveyId: string }) {
  const [panel, setPanel] = useState<'crosstab' | 'correlation' | 'drivers' | 'explorer'>('crosstab')
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])

  useEffect(() => {
    fetch(`${API}/surveys/${surveyId}/questions`)
      .then(r => r.json()).then(setQuestions).catch(() => {})
  }, [surveyId])

  const PANELS = [
    ['crosstab',     '⊞ Cross-tab'],
    ['correlation',  '⊟ Correlation'],
    ['drivers',      '🎯 Drivers'],
    ['explorer',     '📘 Framework'],
  ] as const

  return (
    <div>
      {/* Sub-nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {PANELS.map(([id, label]) => (
          <button key={id} onClick={() => setPanel(id)} style={{
            padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: panel === id ? 'var(--accent)' : 'var(--bg)',
            color: panel === id ? 'white' : 'var(--grey)',
          }}>{label}</button>
        ))}
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
        {panel === 'crosstab' && (
          questions.length < 2
            ? <EmptyState msg="Add at least 2 questions with responses to run a cross-tabulation." />
            : <CrosstabPanel surveyId={surveyId} questions={questions} />
        )}
        {panel === 'correlation' && <CorrelationPanel surveyId={surveyId} />}
        {panel === 'drivers' && (
          questions.length < 2
            ? <EmptyState msg="Add scale/numeric questions with responses to run driver analysis." />
            : <DriverPanel surveyId={surveyId} questions={questions} />
        )}
        {panel === 'explorer' && <FrameworkExplorer />}
      </div>
    </div>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return <div style={{ textAlign: 'center', color: 'var(--grey)', padding: '40px 0', fontSize: 13 }}>{msg}</div>
}
