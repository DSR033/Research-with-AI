'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { getSurvey, updateSurvey, createQuestion, getResults } from '../../../lib/api'
import TopBar from '../../../components/TopBar'
import InsightsTab from './InsightsTab'
import LogicTab from './LogicTab'
import QuestionEditor, { QUESTION_TYPES, TYPE_LABEL } from './QuestionEditor'
import type { QuestionData } from './QuestionEditor'
import PreviewModal from './PreviewModal'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Question extends QuestionData { logicOn?: boolean }
interface Survey {
  id: string; title: string; status: string; mode: string
  settings: Record<string, unknown>
  created_at?: string
  close_date?: string
  response_limit?: number
}

// Left border accent colour per question type
type TypeTile = { type: string; icon: string; label: string; color: string; bg: string; soon?: true }

const TYPE_CATEGORIES: Array<{ id: string; label: string; types: TypeTile[] }> = [
  {
    id: 'basic', label: 'Basic',
    types: [
      { type: 'single_choice',  icon: '◉',  label: 'Single Select',  color: '#db2777', bg: '#fce7f3' },
      { type: 'multi_select',   icon: '☑',  label: 'Multi Select',   color: '#2563eb', bg: '#eff6ff' },
      { type: 'dropdown',       icon: '▾',  label: 'Dropdown',       color: '#7c3aed', bg: '#faf5ff' },
      { type: 'short_text',     icon: '✎',  label: 'Short Answer',   color: '#8b5cf6', bg: '#f5f3ff' },
      { type: 'long_text',      icon: '📝', label: 'Long Text',      color: '#8b5cf6', bg: '#f5f3ff' },
      { type: 'numeric_input',  icon: '#',  label: 'Number',         color: '#0284c7', bg: '#f0f9ff' },
      { type: 'email',          icon: '✉',  label: 'Email',          color: '#2563eb', bg: '#eff6ff' },
      { type: 'date_time',      icon: '📅', label: 'Date & Time',    color: '#0284c7', bg: '#f0f9ff' },
      { type: 'rating',         icon: '★',  label: 'Rating',         color: '#d97706', bg: '#fffbeb' },
      { type: 'nps',            icon: '📊', label: 'NPS (0–10)',     color: '#16a34a', bg: '#f0fdf4' },
      { type: 'likert_matrix',  icon: '▦',  label: 'Likert Scale',   color: '#dc2626', bg: '#fef2f2' },
      { type: 'yes_no',         icon: '⬤',  label: 'Yes / No',       color: '#0891b2', bg: '#ecfeff' },
    ],
  },
  {
    id: 'advanced', label: 'Advanced',
    types: [
      { type: 'matrix',           icon: '⊟',  label: 'Matrix / Grid',      color: '#dc2626', bg: '#fef2f2' },
      { type: 'ranking',          icon: '⇕',  label: 'Ranking',            color: '#f97316', bg: '#fff7ed' },
      { type: 'constant_sum',     icon: 'Σ',  label: 'Constant Sum',       color: '#6b7280', bg: '#f9fafb' },
      { type: 'maxdiff',          icon: '⤢',  label: 'MaxDiff',            color: '#7c3aed', bg: '#faf5ff', soon: true },
      { type: 'conjoint',         icon: '⊕',  label: 'Conjoint Analysis',  color: '#4f46e5', bg: '#eef2ff', soon: true },
      { type: 'heatmap',          icon: '🌡', label: 'Heatmap',            color: '#ef4444', bg: '#fef2f2', soon: true },
      { type: 'picture_choice',   icon: '🖼', label: 'Image Choice',       color: '#be185d', bg: '#fdf2f8' },
      { type: 'image_upload',     icon: '📷', label: 'Image Upload',       color: '#be185d', bg: '#fdf2f8' },
      { type: 'file_upload',      icon: '📎', label: 'File Upload',        color: '#64748b', bg: '#f8fafc' },
      { type: 'video_response',   icon: '🎥', label: 'Video Response',     color: '#dc2626', bg: '#fef2f2', soon: true },
      { type: 'audio_response',   icon: '🎙', label: 'Audio Response',     color: '#9333ea', bg: '#faf5ff', soon: true },
      { type: 'signature',        icon: '✍',  label: 'Signature',          color: '#16a34a', bg: '#f0fdf4' },
      { type: 'slider',           icon: '⟷',  label: 'Slider',             color: '#ea580c', bg: '#fff7ed' },
      { type: 'barcode_scanner',  icon: '▣',  label: 'Barcode / QR',       color: '#78716c', bg: '#fafaf9', soon: true },
      { type: 'map_location',     icon: '📍', label: 'Map / Location',     color: '#0284c7', bg: '#f0f9ff', soon: true },
      { type: 'contact_form',     icon: '👤', label: 'Contact Form',        color: '#db2777', bg: '#fce7f3' },
    ],
  },
  {
    id: 'research', label: 'Research',
    types: [
      { type: 'semantic_differential',  icon: '↔',  label: 'Semantic Differential',    color: '#7c3aed', bg: '#faf5ff', soon: true },
      { type: 'bipolar_scale',          icon: '⟺',  label: 'Bipolar Scale',            color: '#6d28d9', bg: '#f5f3ff', soon: true },
      { type: 'side_by_side_matrix',    icon: '⫧',  label: 'Side-by-Side Matrix',      color: '#dc2626', bg: '#fef2f2', soon: true },
      { type: 'multiple_rating_matrix', icon: '⊞',  label: 'Multiple Rating Matrix',   color: '#b91c1c', bg: '#fef2f2', soon: true },
      { type: 'kano_model',             icon: '◎',  label: 'Kano Model',               color: '#0891b2', bg: '#ecfeff', soon: true },
      { type: 'best_worst_scaling',     icon: '⊸',  label: 'Best-Worst Scaling',       color: '#059669', bg: '#f0fdf4', soon: true },
      { type: 'turf_inputs',            icon: '⊳',  label: 'TURF Inputs',              color: '#d97706', bg: '#fffbeb', soon: true },
      { type: 'gap_analysis',           icon: '⊿',  label: 'Gap Analysis',             color: '#ea580c', bg: '#fff7ed', soon: true },
      { type: 'demographic_block',      icon: '👥', label: 'Demographic Block',         color: '#2563eb', bg: '#eff6ff', soon: true },
      { type: 'screening_question',     icon: '⊘',  label: 'Screening Question',       color: '#7c3aed', bg: '#faf5ff', soon: true },
      { type: 'quota_question',         icon: '⊙',  label: 'Quota Question',           color: '#db2777', bg: '#fce7f3', soon: true },
      { type: 'randomized_block',       icon: '⇄',  label: 'Randomized Block',         color: '#0d9488', bg: '#f0fdfa', soon: true },
    ],
  },
  {
    id: 'multimedia', label: 'Multimedia',
    types: [
      { type: 'image_gallery',             icon: '🖼', label: 'Image Gallery',           color: '#be185d', bg: '#fdf2f8', soon: true },
      { type: 'video_embed',               icon: '▶',  label: 'Video Embed',             color: '#dc2626', bg: '#fef2f2', soon: true },
      { type: 'audio_embed',               icon: '♪',  label: 'Audio Embed',             color: '#9333ea', bg: '#faf5ff', soon: true },
      { type: 'interactive_image',         icon: '⊕',  label: 'Interactive Image',       color: '#f97316', bg: '#fff7ed', soon: true },
      { type: 'carousel',                  icon: '↻',  label: 'Carousel',                color: '#0891b2', bg: '#ecfeff', soon: true },
      { type: 'flip_cards',                icon: '⟳',  label: 'Flip Cards',              color: '#0d9488', bg: '#f0fdfa', soon: true },
      { type: 'rich_text',                 icon: 'T',  label: 'Rich Text',               color: '#8b5cf6', bg: '#faf5ff', soon: true },
      { type: 'embedded_html',             icon: '⟨⟩', label: 'Embedded HTML',           color: '#64748b', bg: '#f8fafc', soon: true },
      { type: 'website_embed',             icon: '⊙',  label: 'Website Embed',           color: '#0284c7', bg: '#f0f9ff', soon: true },
      { type: 'interactive_product_cards', icon: '🛍', label: 'Product Cards',           color: '#db2777', bg: '#fce7f3', soon: true },
    ],
  },
]

const TYPE_ACCENT: Record<string, string> = Object.fromEntries(
  TYPE_CATEGORIES.flatMap(c => c.types.map(t => [t.type, t.color]))
)

// Keep legacy entries not in categories
TYPE_ACCENT['card_sort']       = '#0d9488'
TYPE_ACCENT['pick_group_rank'] = '#7c3aed'
TYPE_ACCENT['drill_down']      = '#0369a1'

const AI_CHIPS = [
  { key: 'rephrase', label: 'Rephrase' },
  { key: 'concise',  label: 'Make Concise' },
  { key: 'suggest',  label: 'Suggest Next' },
  { key: 'tone',     label: 'Change Tone' },
]

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'build',    label: '✎ Build' },
  { id: 'logic',    label: '🔀 Logic' },
  { id: 'config',   label: '⚙ Survey Settings' },
  { id: 'theme',    label: '🎨 Theme' },
  { id: 'share',    label: '📤 Share' },
  { id: 'insights', label: '📈 Insights' },
  { id: 'expert',   label: '✨ Expert Review' },
]

type SurveyTheme = {
  id: string
  primaryColor: string
  backgroundColor: string
  cardBackground: string
  textColor: string
  borderColor: string
  headingFont: string
  bodyFont: string
  fontSize: number
  borderRadius: number
  buttonStyle: 'filled' | 'outlined'
  buttonRadius: number
  progressColor: string
  backgroundType: 'solid' | 'gradient'
  backgroundGradient: string
  showProgress: boolean
  animations: boolean
}

const FONT_OPTIONS = [
  { label: 'System Default', value: "system-ui, -apple-system, sans-serif" },
  { label: 'Inter',          value: "Inter, system-ui, sans-serif" },
  { label: 'Roboto',         value: "Roboto, Arial, sans-serif" },
  { label: 'Open Sans',      value: "'Open Sans', Arial, sans-serif" },
  { label: 'Lato',           value: "Lato, Arial, sans-serif" },
  { label: 'Poppins',        value: "Poppins, Arial, sans-serif" },
  { label: 'Montserrat',     value: "Montserrat, Arial, sans-serif" },
  { label: 'Nunito',         value: "Nunito, Arial, sans-serif" },
  { label: 'Source Sans Pro',value: "'Source Sans Pro', Arial, sans-serif" },
  { label: 'Georgia (Serif)',value: "Georgia, serif" },
  { label: 'Merriweather',   value: "'Merriweather', Georgia, serif" },
  { label: 'Playfair Display',value: "'Playfair Display', Georgia, serif" },
  { label: 'Oswald',         value: "Oswald, Arial, sans-serif" },
  { label: 'Raleway',        value: "Raleway, Arial, sans-serif" },
]

const DEFAULT_THEME: SurveyTheme = {
  id: 'classic',
  primaryColor: '#db2777',
  backgroundColor: '#f4f4f5',
  cardBackground: '#ffffff',
  textColor: '#18181b',
  borderColor: '#e4e4e7',
  headingFont: "system-ui, -apple-system, sans-serif",
  bodyFont: "system-ui, -apple-system, sans-serif",
  fontSize: 15,
  borderRadius: 12,
  buttonStyle: 'filled',
  buttonRadius: 8,
  progressColor: '#db2777',
  backgroundType: 'solid',
  backgroundGradient: 'linear-gradient(135deg,#fce7f3 0%,#eff6ff 100%)',
  showProgress: true,
  animations: true,
}

const PRESET_THEMES: Array<SurveyTheme & { name: string; swatch1: string; swatch2: string; swatch3: string }> = [
  { ...DEFAULT_THEME, id: 'classic',   name: 'Classic',   swatch1: '#db2777', swatch2: '#ffffff', swatch3: '#f4f4f5' },
  { ...DEFAULT_THEME, id: 'ocean',     name: 'Ocean',     primaryColor: '#0891b2', progressColor: '#0891b2', backgroundColor: '#ecfeff', borderColor: '#cffafe', swatch1: '#0891b2', swatch2: '#ffffff', swatch3: '#ecfeff' },
  { ...DEFAULT_THEME, id: 'forest',    name: 'Forest',    primaryColor: '#16a34a', progressColor: '#16a34a', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', swatch1: '#16a34a', swatch2: '#ffffff', swatch3: '#f0fdf4' },
  { ...DEFAULT_THEME, id: 'sunset',    name: 'Sunset',    primaryColor: '#f97316', progressColor: '#f97316', backgroundColor: '#fff7ed', borderColor: '#fed7aa', swatch1: '#f97316', swatch2: '#ffffff', swatch3: '#fff7ed' },
  { ...DEFAULT_THEME, id: 'violet',    name: 'Violet',    primaryColor: '#7c3aed', progressColor: '#7c3aed', backgroundColor: '#faf5ff', borderColor: '#ddd6fe', swatch1: '#7c3aed', swatch2: '#ffffff', swatch3: '#faf5ff' },
  { ...DEFAULT_THEME, id: 'corporate', name: 'Corporate', primaryColor: '#1e40af', progressColor: '#1e40af', backgroundColor: '#f8fafc', borderColor: '#e2e8f0', textColor: '#0f172a', swatch1: '#1e40af', swatch2: '#ffffff', swatch3: '#f8fafc' },
  { ...DEFAULT_THEME, id: 'dark',      name: 'Dark',      primaryColor: '#a78bfa', progressColor: '#a78bfa', backgroundColor: '#18181b', cardBackground: '#27272a', textColor: '#f4f4f5', borderColor: '#3f3f46', swatch1: '#a78bfa', swatch2: '#27272a', swatch3: '#18181b' },
  { ...DEFAULT_THEME, id: 'midnight',  name: 'Midnight',  primaryColor: '#6366f1', progressColor: '#6366f1', backgroundColor: '#0f172a', cardBackground: '#1e293b', textColor: '#e2e8f0', borderColor: '#334155', swatch1: '#6366f1', swatch2: '#1e293b', swatch3: '#0f172a' },
  { ...DEFAULT_THEME, id: 'gradient',  name: 'Gradient',  primaryColor: '#db2777', progressColor: '#db2777', backgroundType: 'gradient', backgroundGradient: 'linear-gradient(135deg,#fce7f3 0%,#eff6ff 100%)', backgroundColor: '#fce7f3', swatch1: '#db2777', swatch2: '#ffffff', swatch3: '#fce7f3' },
  { ...DEFAULT_THEME, id: 'minimal',   name: 'Minimal',   primaryColor: '#18181b', progressColor: '#18181b', backgroundColor: '#ffffff', cardBackground: '#f9fafb', borderColor: '#f4f4f5', borderRadius: 6, buttonRadius: 4, swatch1: '#18181b', swatch2: '#f9fafb', swatch3: '#ffffff' },
]

export default function SurveyBuilder() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [survey, setSurvey]         = useState<Survey | null>(null)
  const [questions, setQuestions]   = useState<Question[]>([])
  const [activeTab, setActiveTab]   = useState('build')
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [published, setPublished]   = useState(false)
  const [republished, setRepublished] = useState(false)
  const [editingQId, setEditingQId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [pickerTab, setPickerTab] = useState('basic')
  const [surveyTheme, setSurveyTheme] = useState<SurveyTheme>(DEFAULT_THEME)
  const [activePresetId, setActivePresetId] = useState('classic')
  const [themeCustomTab, setThemeCustomTab] = useState<'colors'|'typography'|'layout'|'background'|'buttons'>('colors')
  const [branding, setBranding]     = useState({ brand_color: '#db2777', logo_url: null as string | null, org_name: 'SurveyAI' })
  const [results, setResults]       = useState<{ total: number; complete: number; partial: number } | null>(null)
  const [overviewResponses, setOverviewResponses] = useState<Array<{ id: string; status: string; started_at: string; completed_at: string | null }> | null>(null)
  const [aiChipLoading, setAiChipLoading] = useState<string | null>(null)
  type Finding = { severity: 'warning' | 'suggestion' | 'pass'; category: string; text: string }
  type ReviewResult = { overall_score: number; categories: Array<{ name: string; score: number; weight: number }>; findings: Finding[] }
  const [expertReview, setExpertReview]   = useState<ReviewResult | null>(null)
  const [expertLoading, setExpertLoading] = useState(false)

  // Config state
  const [cfgRequire, setCfgRequire]   = useState(false)
  const [cfgNoDupes, setCfgNoDupes]   = useState(true)
  const [cfgRandomize, setCfgRandomize] = useState(false)
  const [closeDate, setCloseDate]     = useState('')
  const [responseLimit, setResponseLimit] = useState('')
  // Access control
  const [cfgAccessMode, setCfgAccessMode] = useState<'public' | 'password' | 'email_password' | 'invite_only'>('public')
  const [cfgPassword, setCfgPassword] = useState('')
  const [cfgInviteEmails, setCfgInviteEmails] = useState('')
  const [cfgShowPwd, setCfgShowPwd] = useState(false)
  // Termination
  type TerminationAction = 'screen_out' | 'quota_full' | 'over_quota'
  const [cfgScreenOutMsg, setCfgScreenOutMsg] = useState("We're sorry, but you don't qualify for this survey.")
  const [cfgQuotaFullMsg, setCfgQuotaFullMsg] = useState("We've filled all available spots. Thank you for your interest.")
  const [cfgOverQuotaMsg, setCfgOverQuotaMsg] = useState("We've reached our quota for your profile segment.")
  // Quotas
  type QuotaRule = { id: string; name: string; question_id: string; answer_value: string; limit: number; action: TerminationAction }
  const [cfgQuotas, setCfgQuotas] = useState<QuotaRule[]>([])
  // Workflow / automation
  type WorkflowTrigger = 'response_complete' | 'new_response' | 'partial_abandon' | 'quota_reached'
  type WorkflowAction = { type: 'send_email' | 'webhook'; to: 'owner' | 'custom'; email: string; subject: string; body: string; url?: string }
  type Workflow = { id: string; name: string; trigger: WorkflowTrigger; enabled: boolean; action: WorkflowAction }
  const [cfgWorkflows, setCfgWorkflows] = useState<Workflow[]>([])
  // Reminder email
  const [cfgReminderEnabled, setCfgReminderEnabled] = useState(false)
  const [cfgReminderDelayHours, setCfgReminderDelayHours] = useState('24')
  const [cfgReminderSubject, setCfgReminderSubject] = useState('Reminder: Complete your survey')
  // Tagging
  type TagRule = { id: string; name: string; color: string; auto: boolean; condition?: { question_id: string; operator: 'equals' | 'contains' | 'not_equals'; value: string } }
  const [cfgTags, setCfgTags] = useState<TagRule[]>([])
  // General
  const [cfgDescription, setCfgDescription] = useState('')
  const [cfgCategory, setCfgCategory] = useState('')
  const [cfgFolder, setCfgFolder] = useState('')
  // Survey Behaviour extras
  const [cfgCaptureLocation, setCfgCaptureLocation] = useState(false)
  const [cfgAgeVerification, setCfgAgeVerification] = useState(false)
  const [cfgClosedMessage, setCfgClosedMessage] = useState('This survey is currently closed. Thank you for your interest.')
  // Notifications
  const [cfgNotifyThankYouEmail, setCfgNotifyThankYouEmail] = useState(false)
  const [cfgNotifyAdminConfirmation, setCfgNotifyAdminConfirmation] = useState(true)
  const [cfgNotifyQuotaReached, setCfgNotifyQuotaReached] = useState(false)
  // Survey Behaviour
  const [cfgAnonymous, setCfgAnonymous] = useState(false)
  const [cfgSaveResume, setCfgSaveResume] = useState(false)
  const [cfgPartialResponses, setCfgPartialResponses] = useState(false)
  const [cfgAutoSave, setCfgAutoSave] = useState(true)
  const [cfgTimeout, setCfgTimeout] = useState('')
  // Response Settings
  const [cfgResponseValidation, setCfgResponseValidation] = useState(false)
  // Survey Experience
  const [cfgProgressBar, setCfgProgressBar] = useState(true)
  const [cfgThankYouText, setCfgThankYouText] = useState('Thank you for completing our survey!')
  const [cfgRedirectUrl, setCfgRedirectUrl] = useState('')
  const [cfgBackButton, setCfgBackButton] = useState(true)
  const [cfgLanguageSelector, setCfgLanguageSelector] = useState(false)
  // Accessibility
  const [cfgWcagMode, setCfgWcagMode] = useState(false)
  const [cfgFontScale, setCfgFontScale] = useState('100')
  const [cfgKeyboardNav, setCfgKeyboardNav] = useState(true)
  const [cfgScreenReader, setCfgScreenReader] = useState(true)
  // End screens — headings pair with the existing thank_you_text / screen_out_msg bodies
  const [cfgThankYouHeading, setCfgThankYouHeading] = useState('Thank you!')
  const [cfgDisqualifiedHeading, setCfgDisqualifiedHeading] = useState('You do not qualify')
  const [cfgRedirectDelay, setCfgRedirectDelay] = useState('5')
  const [endScreen, setEndScreen] = useState<'thankyou' | 'disqualified' | null>(null)
  const [endScreenSaving, setEndScreenSaving] = useState(false)

  useEffect(() => { setShowTypePicker(false) }, [activeTab])

  // The settings column is replaced wholesale on save, so every writer has to send
  // the complete object. Both the Save Configuration button and the end-screen
  // editor build their payload here rather than each assembling a partial one.
  const buildSettings = () => ({
    require_response: cfgRequire, no_duplicates: cfgNoDupes, randomize: cfgRandomize,
    access_mode: cfgAccessMode,
    password: (cfgAccessMode === 'password' || cfgAccessMode === 'email_password') ? cfgPassword : null,
    invite_emails: cfgAccessMode === 'invite_only'
      ? cfgInviteEmails.split(/[,\n]/).map(e => e.trim()).filter(Boolean)
      : null,
    screen_out_msg: cfgScreenOutMsg,
    quota_full_msg: cfgQuotaFullMsg,
    over_quota_msg: cfgOverQuotaMsg,
    quotas: cfgQuotas,
    workflows: cfgWorkflows,
    tags: cfgTags,
    reminder: { enabled: cfgReminderEnabled, delay_hours: parseInt(cfgReminderDelayHours) || 24, subject: cfgReminderSubject },
    description: cfgDescription,
    category: cfgCategory,
    folder: cfgFolder,
    anonymous: cfgAnonymous,
    save_resume: cfgSaveResume,
    partial_responses: cfgPartialResponses,
    auto_save: cfgAutoSave,
    timeout: cfgTimeout ? parseInt(cfgTimeout) : null,
    capture_location: cfgCaptureLocation,
    age_verification: cfgAgeVerification,
    closed_message: cfgClosedMessage,
    notify_thank_you_email: cfgNotifyThankYouEmail,
    notify_admin_confirmation: cfgNotifyAdminConfirmation,
    notify_quota_reached: cfgNotifyQuotaReached,
    response_validation: cfgResponseValidation,
    progress_bar: cfgProgressBar,
    thank_you_text: cfgThankYouText,
    redirect_url: cfgRedirectUrl || null,
    back_button: cfgBackButton,
    language_selector: cfgLanguageSelector,
    wcag_mode: cfgWcagMode,
    font_scale: parseInt(cfgFontScale),
    keyboard_nav: cfgKeyboardNav,
    screen_reader: cfgScreenReader,
    thank_you_heading: cfgThankYouHeading,
    disqualified_heading: cfgDisqualifiedHeading,
    redirect_delay: parseInt(cfgRedirectDelay) || 0,
    theme: surveyTheme,
  })

  useEffect(() => {
    getSurvey(id).then(async data => {
      if (!data) { setLoading(false); return }
      setSurvey(data)

      // Initialize config state from saved survey data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = (data.settings || {}) as Record<string, any>
      setCfgRequire(!!s.require_response)
      setCfgNoDupes(s.no_duplicates !== false)
      setCfgRandomize(!!s.randomize)
      setCfgAccessMode(s.access_mode || 'public')
      setCfgPassword(s.password || '')
      const inv = s.invite_emails
      setCfgInviteEmails(Array.isArray(inv) ? inv.join('\n') : (inv || ''))
      setCloseDate(data.close_date ? String(data.close_date).split('T')[0] : '')
      setResponseLimit(data.response_limit ? String(data.response_limit) : '')
      // Termination messages
      if (s.screen_out_msg) setCfgScreenOutMsg(s.screen_out_msg)
      if (s.quota_full_msg) setCfgQuotaFullMsg(s.quota_full_msg)
      if (s.over_quota_msg) setCfgOverQuotaMsg(s.over_quota_msg)
      // Quotas, workflows, tags
      if (Array.isArray(s.quotas)) setCfgQuotas(s.quotas)
      if (Array.isArray(s.workflows)) setCfgWorkflows(s.workflows)
      if (Array.isArray(s.tags)) setCfgTags(s.tags)
      // Reminder
      if (s.reminder) {
        setCfgReminderEnabled(!!s.reminder.enabled)
        if (s.reminder.delay_hours) setCfgReminderDelayHours(String(s.reminder.delay_hours))
        if (s.reminder.subject) setCfgReminderSubject(s.reminder.subject)
      }
      // General
      if (s.description) setCfgDescription(s.description)
      if (s.category) setCfgCategory(s.category)
      if (s.folder) setCfgFolder(s.folder)
      // Behaviour
      if (s.anonymous !== undefined) setCfgAnonymous(!!s.anonymous)
      if (s.save_resume !== undefined) setCfgSaveResume(!!s.save_resume)
      if (s.partial_responses !== undefined) setCfgPartialResponses(!!s.partial_responses)
      if (s.auto_save !== undefined) setCfgAutoSave(s.auto_save !== false)
      if (s.timeout) setCfgTimeout(String(s.timeout))
      if (s.capture_location !== undefined) setCfgCaptureLocation(!!s.capture_location)
      if (s.age_verification !== undefined) setCfgAgeVerification(!!s.age_verification)
      if (s.closed_message) setCfgClosedMessage(s.closed_message)
      // Notifications
      if (s.notify_thank_you_email !== undefined) setCfgNotifyThankYouEmail(!!s.notify_thank_you_email)
      if (s.notify_admin_confirmation !== undefined) setCfgNotifyAdminConfirmation(s.notify_admin_confirmation !== false)
      if (s.notify_quota_reached !== undefined) setCfgNotifyQuotaReached(!!s.notify_quota_reached)
      // Response
      if (s.response_validation !== undefined) setCfgResponseValidation(!!s.response_validation)
      // Experience
      if (s.progress_bar !== undefined) setCfgProgressBar(s.progress_bar !== false)
      if (s.thank_you_text) setCfgThankYouText(s.thank_you_text)
      if (s.redirect_url) setCfgRedirectUrl(s.redirect_url)
      if (s.back_button !== undefined) setCfgBackButton(s.back_button !== false)
      if (s.language_selector !== undefined) setCfgLanguageSelector(!!s.language_selector)
      // Accessibility
      if (s.wcag_mode !== undefined) setCfgWcagMode(!!s.wcag_mode)
      if (s.font_scale) setCfgFontScale(String(s.font_scale))
      if (s.keyboard_nav !== undefined) setCfgKeyboardNav(s.keyboard_nav !== false)
      if (s.screen_reader !== undefined) setCfgScreenReader(s.screen_reader !== false)
      // End screens
      if (s.thank_you_heading) setCfgThankYouHeading(s.thank_you_heading)
      if (s.disqualified_heading) setCfgDisqualifiedHeading(s.disqualified_heading)
      if (s.redirect_delay !== undefined && s.redirect_delay !== null) setCfgRedirectDelay(String(s.redirect_delay))
      // Theme
      if (s.theme) {
        setSurveyTheme({ ...DEFAULT_THEME, ...s.theme })
        setActivePresetId(s.theme.id ?? 'custom')
      }

      const qs = (data.questions || []).map((q: Question & { question_options?: Array<{label: string}> }) => ({
        ...q, question_options: q.question_options, logicOn: false,
      }))
      if (qs.length === 0) {
        const defaultQ = await createQuestion(id, { type: 'single_choice', title: '', required: false, position: 0 })
        setQuestions([{ ...defaultQ, logicOn: false }])
        setEditingQId(defaultQ.id)
      } else {
        setQuestions(qs)
      }
      setLoading(false)
    })
    getResults(id).then(setResults)
    fetch(`${API}/surveys/${id}/responses-full`).then(r => r.ok ? r.json() : null).then(d => { if (d?.responses) setOverviewResponses(d.responses) }).catch(() => {})
    fetch(`${API}/surveys/${id}/branding`).then(r => r.json()).then(setBranding).catch(() => {})
  }, [id])

  const saveDraft = useCallback(async () => {
    if (!survey) return
    setSaving(true)
    await updateSurvey(id, { title: survey.title, status: survey.status })
    setSaving(false)
  }, [survey, id])

  const handlePublish = async () => {
    await updateSurvey(id, { status: 'active' })
    setSurvey(prev => prev ? { ...prev, status: 'active' } : prev)
    setPublished(true)
  }

  const handleRepublish = async () => {
    setSaving(true)
    await updateSurvey(id, { title: survey?.title, status: 'active' })
    setSurvey(prev => prev ? { ...prev, status: 'active' } : prev)
    setSaving(false)
    setRepublished(true)
    setTimeout(() => setRepublished(false), 3000)
  }

  const addQuestion = async (type: string) => {
    const q = await createQuestion(id, { type, title: '', required: false, position: questions.length })
    setQuestions(prev => [...prev, { ...q, logicOn: false }])
    setEditingQId(q.id)
    setActiveTab('build')
  }

  const deleteQuestion = (qid: string) => {
    fetch(`${API}/surveys/${id}/questions/${qid}`, { method: 'DELETE' })
    setQuestions(prev => prev.filter(q => q.id !== qid))
    if (editingQId === qid) setEditingQId(null)
  }

  const runAiChip = async (qid: string, action: string) => {
    setAiChipLoading(`${qid}-${action}`)
    try {
      const res = await fetch(`${API}/surveys/${id}/questions/${qid}/ai-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.title) setQuestions(prev => prev.map(q => q.id === qid ? { ...q, title: data.title } : q))
      }
    } catch {}
    setAiChipLoading(null)
  }

  const runExpertReview = async () => {
    setExpertLoading(true)
    setExpertReview(null)
    try {
      const res = await fetch(`${API}/surveys/${id}/expert-review`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setExpertReview(data)
        setExpertLoading(false)
        return
      }
    } catch {}
    // Fallback: run checks client-side on local question state
    const n = questions.length
    const findings: Finding[] = []
    const scores: Record<string, number> = { Clarity: 100, Structure: 100, 'Bias & Fairness': 100, Logic: 100, Compliance: 100 }
    const WEIGHTS_F: Record<string, number> = { Clarity: 30, Structure: 25, 'Bias & Fairness': 20, Logic: 15, Compliance: 10 }
    const BIAS = ["don't you think","don't you agree","obviously","clearly","of course","as we all know","everyone knows","surely"]
    const VAGUE = ["something","stuff","things","etc","whatever","anything"]

    if (n === 0) {
      findings.push({ severity: 'warning', category: 'Structure', text: 'No questions yet. Add questions before reviewing.' })
      scores.Structure = 0
    } else if (n > 20) {
      findings.push({ severity: 'warning', category: 'Structure', text: `${n} questions — surveys over 20 see <50% completion.` })
      scores.Structure -= 25
    } else if (n > 12) {
      findings.push({ severity: 'suggestion', category: 'Structure', text: `${n} questions — under 12 keeps completion above 80%.` })
      scores.Structure -= 10
    } else {
      findings.push({ severity: 'pass', category: 'Structure', text: `${n} questions — within the recommended range.` })
    }

    const seen = new Set<string>()
    questions.forEach((q, i) => {
      const title = q.title?.trim() ?? ''
      const tl = title.toLowerCase()
      const qnum = i + 1
      if (!title) { findings.push({ severity: 'warning', category: 'Clarity', text: `Q${qnum}: No question text.` }); scores.Clarity = Math.max(0, scores.Clarity - 15) }
      else if (title.split(' ').length < 3) { findings.push({ severity: 'suggestion', category: 'Clarity', text: `Q${qnum}: Very short — "${title}". Make it unambiguous.` }); scores.Clarity = Math.max(0, scores.Clarity - 6) }
      else if (title.length > 220) { findings.push({ severity: 'suggestion', category: 'Clarity', text: `Q${qnum}: Long question (${title.length} chars). Shorter questions reduce cognitive load.` }); scores.Clarity = Math.max(0, scores.Clarity - 5) }
      for (const w of VAGUE) { if (tl.includes(w)) { findings.push({ severity: 'suggestion', category: 'Clarity', text: `Q${qnum}: Vague term "${w}". Be specific.` }); scores.Clarity = Math.max(0, scores.Clarity - 5); break } }
      for (const p of BIAS) { if (tl.includes(p)) { findings.push({ severity: 'warning', category: 'Bias & Fairness', text: `Q${qnum}: Leading phrase "${p}". Rephrase neutrally.` }); scores['Bias & Fairness'] = Math.max(0, scores['Bias & Fairness'] - 22); break } }
      const key = tl.replace(/[?.]/g, '').trim()
      if (key && seen.has(key)) { findings.push({ severity: 'warning', category: 'Logic', text: `Q${qnum}: Duplicate question text detected.` }); scores.Logic = Math.max(0, scores.Logic - 18) }
      seen.add(key)
    })

    if (!findings.some(f => f.category === 'Bias & Fairness' && f.severity !== 'pass'))
      findings.push({ severity: 'pass', category: 'Bias & Fairness', text: 'No leading phrases detected. Questions appear neutrally worded.' })
    if (!findings.some(f => f.category === 'Logic' && f.severity !== 'pass'))
      findings.push({ severity: 'pass', category: 'Logic', text: 'No duplicate questions detected.' })
    if (!findings.some(f => f.category === 'Clarity' && f.severity !== 'pass'))
      findings.push({ severity: 'pass', category: 'Clarity', text: 'All questions clearly worded.' })
    findings.push({ severity: 'pass', category: 'Compliance', text: 'No obvious PII collection detected.' })

    const overall = Math.round(Object.keys(WEIGHTS_F).reduce((acc, c) => acc + scores[c] * WEIGHTS_F[c] / 100, 0))
    const categories = Object.keys(WEIGHTS_F).map(c => ({ name: c, score: scores[c], weight: WEIGHTS_F[c] }))
    setTimeout(() => { setExpertReview({ overall_score: overall, categories, findings }); setExpertLoading(false) }, 800)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'Hanken Grotesk', system-ui", color: '#71717a' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #f9a8d4', borderTopColor: '#db2777', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )
  if (!survey) return <div style={{ padding: 40, color: '#ef4444', fontFamily: "'Hanken Grotesk', system-ui" }}>Survey not found.</div>

  if (published) {
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', fontFamily: "'Hanken Grotesk', system-ui" }}>
        <TopBar />
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#db2777,#be185d)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(219,39,119,.3)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <h1 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 32, marginBottom: 8, color: '#18181b' }}>Survey Published!</h1>
          <p style={{ color: '#71717a', marginBottom: 32, fontSize: 16 }}>Your survey is live and ready to collect responses.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn secondary" onClick={() => { setPublished(false); setActiveTab('share') }}>View Share Options</button>
            <button className="btn" onClick={() => router.push('/')}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    )
  }

  const accent = TYPE_ACCENT[editingQId ? (questions.find(q => q.id === editingQId)?.type ?? 'single_choice') : 'single_choice']

  return (
    <>
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at 18% 12%, #fce7f3, #ede9fe 55%, #e0e7ff)', fontFamily: "'Hanken Grotesk', system-ui" }}>
      <TopBar />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>

        {/* Breadcrumb */}
        <button onClick={() => router.push('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#71717a', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 14, fontFamily: 'inherit', padding: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Back to Surveys
        </button>

        {/* Builder header card */}
        <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(14px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.1)', padding: '18px 24px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 24px rgba(219,39,119,.07)' }}>
          <div>
            <h1
              contentEditable
              suppressContentEditableWarning
              onBlur={e => setSurvey(prev => prev ? { ...prev, title: e.target.innerText.trim() } : prev)}
              style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, margin: '0 0 4px', outline: 'none', cursor: 'text', color: '#18181b', letterSpacing: '-.02em' }}
            >
              {survey.title}
            </h1>
            <div style={{ fontSize: 12, color: '#71717a', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>SRV-{id.slice(0, 8).toUpperCase()}</span>
              <span>·</span>
              <span style={{ color: survey.status === 'active' ? '#16a34a' : '#d97706', fontWeight: 700 }}>
                {survey.status === 'active' ? '● Live' : '● Draft'}
              </span>
              <span>·</span>
              <span>{survey.mode}</span>
              <span>·</span>
              <span>{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {republished && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Changes live</span>}
            <button className="btn ghost" onClick={saveDraft} disabled={saving} style={{ fontSize: 13 }}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
            <button className="btn ghost" onClick={() => setShowPreview(true)} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              Preview
            </button>
            {survey.status === 'active' ? (
              <button className="btn" onClick={handleRepublish} disabled={saving} style={{ fontSize: 13 }}>
                {saving ? 'Publishing…' : '↑ Republish'}
              </button>
            ) : (
              <button className="btn" onClick={handlePublish} style={{ fontSize: 13 }}>Publish →</button>
            )}
          </div>
        </div>

        {/* Pill tab bar */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,.7)', backdropFilter: 'blur(8px)', borderRadius: 14, padding: '5px', marginBottom: 20, gap: 2, boxShadow: '0 2px 8px rgba(0,0,0,.05)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{ flex: 1, padding: '9px 6px', borderRadius: 10, fontSize: 12.5, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', background: activeTab === t.id ? 'linear-gradient(135deg,#db2777,#be185d)' : 'transparent', color: activeTab === t.id ? '#fff' : '#71717a', boxShadow: activeTab === t.id ? '0 2px 10px rgba(219,39,119,.3)' : 'none', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (() => {
          const total = results?.total ?? 0
          const complete = results?.complete ?? 0
          const partial = results?.partial ?? 0
          const incomplete = Math.max(0, total - complete - partial)
          const compRate = total > 0 ? Math.round((complete / total) * 100) : 0

          // Avg completion time from detailed responses
          let avgTime = '—'
          if (overviewResponses && overviewResponses.length > 0) {
            const times = overviewResponses
              .filter(r => r.status === 'complete' && r.started_at && r.completed_at)
              .map(r => (new Date(r.completed_at!).getTime() - new Date(r.started_at).getTime()) / 1000)
            if (times.length > 0) {
              const avg = times.reduce((a, b) => a + b, 0) / times.length
              avgTime = avg < 60 ? `${Math.round(avg)}s` : `${Math.round(avg / 60)}m ${Math.round(avg % 60)}s`
            }
          }

          const recentResponses = overviewResponses ? [...overviewResponses].slice(0, 5) : []
          const statusColor: Record<string, { color: string; bg: string; label: string }> = {
            complete:  { color: '#16a34a', bg: '#f0fdf4', label: 'Complete' },
            partial:   { color: '#d97706', bg: '#fffbeb', label: 'Partial' },
            disqualified: { color: '#dc2626', bg: '#fef2f2', label: 'Discarded' },
          }

          return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Survey metadata */}
            <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 20, color: '#18181b', marginBottom: 4 }}>{survey?.title}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: '#71717a' }}>{survey?.mode ?? 'classic'} survey</span>
                    {survey?.created_at && (
                      <span style={{ fontSize: 12, color: '#a1a1aa' }}>· Created {new Date(survey.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    )}
                    {survey?.close_date && (
                      <span style={{ fontSize: 12, color: '#a1a1aa' }}>· Closes {new Date(survey.close_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    )}
                    {survey?.response_limit && (
                      <span style={{ fontSize: 12, color: '#a1a1aa' }}>· Limit {survey.response_limit} responses</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setActiveTab('build')}>Edit survey</button>
                  <button className="btn secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setActiveTab('insights')}>View Insights</button>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'Total Responses', value: String(total),         color: '#db2777', bg: '#fce7f3' },
                { label: 'Completion Rate', value: `${compRate}%`,        color: '#16a34a', bg: '#f0fdf4' },
                { label: 'Avg. Time',       value: avgTime,               color: '#7c3aed', bg: '#faf5ff' },
                { label: 'Questions',       value: String(questions.length), color: '#0ea5e9', bg: '#f0f9ff' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,.9)', border: `1.5px solid rgba(219,39,119,.08)`, borderRadius: 14, padding: '18px 20px' }}>
                  <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 28, color: s.color, letterSpacing: '-.02em' }}>{s.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#71717a', marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Response funnel */}
            {total > 0 && (
              <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px 24px' }}>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 16 }}>Response Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { label: 'Completed', count: complete,    pct: Math.round((complete / total) * 100),    color: '#16a34a', track: '#f0fdf4' },
                    { label: 'Partial',   count: partial,     pct: Math.round((partial / total) * 100),     color: '#d97706', track: '#fffbeb' },
                    { label: 'Abandoned', count: incomplete,  pct: Math.round((incomplete / total) * 100),  color: '#dc2626', track: '#fef2f2' },
                  ].map(row => (
                    <div key={row.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                        <span style={{ color: '#52525b' }}>{row.label}</span>
                        <span style={{ color: row.color }}>{row.count} <span style={{ color: '#a1a1aa', fontWeight: 400 }}>({row.pct}%)</span></span>
                      </div>
                      <div style={{ background: row.track, borderRadius: 99, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${row.pct}%`, background: row.color, height: '100%', borderRadius: 99, transition: 'width .6s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
                {survey?.response_limit && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #f4f4f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 5 }}>
                      <span style={{ color: '#52525b' }}>Response limit progress</span>
                      <span style={{ color: '#0ea5e9' }}>{total} / {survey.response_limit}</span>
                    </div>
                    <div style={{ background: '#f0f9ff', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, Math.round((total / survey.response_limit) * 100))}%`, background: '#0ea5e9', height: '100%', borderRadius: 99, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Recent responses */}
            <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 700, fontSize: 14, color: '#18181b' }}>Recent Responses</div>
                {total > 5 && (
                  <button onClick={() => setActiveTab('insights')} style={{ fontSize: 12, color: '#db2777', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>View all {total} →</button>
                )}
              </div>
              {recentResponses.length === 0 ? (
                <div style={{ color: '#a1a1aa', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                  No responses yet — <button onClick={() => setActiveTab('share')} style={{ color: '#db2777', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 13 }}>share your survey</button> to start collecting
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {recentResponses.map((r, idx) => {
                    const sc = statusColor[r.status] ?? { color: '#71717a', bg: '#f4f4f5', label: r.status }
                    const when = r.started_at ? (() => {
                      const diff = Date.now() - new Date(r.started_at).getTime()
                      const mins = Math.floor(diff / 60000)
                      if (mins < 1) return 'just now'
                      if (mins < 60) return `${mins}m ago`
                      const hrs = Math.floor(mins / 60)
                      if (hrs < 24) return `${hrs}h ago`
                      return `${Math.floor(hrs / 24)}d ago`
                    })() : ''
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: idx % 2 === 0 ? '#fafafa' : '#fff', borderRadius: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 99, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: sc.color, flexShrink: 0 }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: '#52525b', fontWeight: 500 }}>Response #{idx + 1}</div>
                          <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{when}</div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: sc.bg, color: sc.color }}>{sc.label}</span>
                        {r.completed_at && r.started_at && (
                          <span style={{ fontSize: 11, color: '#a1a1aa' }}>
                            {(() => {
                              const s = (new Date(r.completed_at).getTime() - new Date(r.started_at).getTime()) / 1000
                              return s < 60 ? `${Math.round(s)}s` : `${Math.round(s / 60)}m`
                            })()}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
          )
        })()}

        {/* ── BUILD ── */}
        {activeTab === 'build' && (
          <div style={{ display: 'flex', gap: 16, minHeight: 600, alignItems: 'flex-start', position: 'relative' }}>

            {/* LEFT: Add question button + floating picker */}
            <div style={{ width: 52, flexShrink: 0, position: 'sticky', top: 20 }}>
              <button
                onClick={() => setShowTypePicker(v => !v)}
                title="Add question to your survey"
                style={{ width: 52, height: 52, borderRadius: 14, border: '2px solid rgba(219,39,119,.25)', background: showTypePicker ? '#db2777' : 'rgba(255,255,255,.95)', color: showTypePicker ? '#fff' : '#db2777', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, transition: 'all .15s', boxShadow: showTypePicker ? '0 4px 16px rgba(219,39,119,.3)' : '0 2px 8px rgba(0,0,0,.06)' }}>
                <span style={{ fontSize: 22, lineHeight: 1, fontWeight: 300 }}>{showTypePicker ? '×' : '+'}</span>
              </button>
              {showTypePicker && (
                <div style={{ position: 'absolute', left: 64, top: 0, zIndex: 50, width: 260, background: '#fff', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.15)', boxShadow: '0 8px 32px rgba(0,0,0,.12)', overflow: 'hidden' }}>
                  {/* Category tabs */}
                  <div style={{ display: 'flex', borderBottom: '1px solid #f4f4f5', padding: '8px 8px 0' }}>
                    {TYPE_CATEGORIES.map(cat => (
                      <button key={cat.id} onClick={() => setPickerTab(cat.id)}
                        style={{ flex: 1, fontSize: 11, fontWeight: 700, padding: '5px 4px', border: 'none', borderRadius: '6px 6px 0 0', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .1s',
                          background: pickerTab === cat.id ? '#fff' : 'transparent',
                          color: pickerTab === cat.id ? '#db2777' : '#71717a',
                          borderBottom: pickerTab === cat.id ? '2px solid #db2777' : '2px solid transparent',
                        }}>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  {/* Type list */}
                  <div style={{ padding: '6px 6px', maxHeight: 420, overflowY: 'auto' as const }}>
                    {(TYPE_CATEGORIES.find(c => c.id === pickerTab)?.types ?? []).map(t => (
                      <button key={t.type}
                        onClick={() => { if (!t.soon) { addQuestion(t.type); setShowTypePicker(false) } }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 8, border: 'none', background: 'transparent', cursor: t.soon ? 'default' : 'pointer', textAlign: 'left' as const, width: '100%', fontFamily: 'inherit', opacity: t.soon ? 0.65 : 1, transition: 'all .1s' }}
                        onMouseEnter={e => { if (!t.soon) { (e.currentTarget as HTMLButtonElement).style.background = t.bg } }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                        <span style={{ fontSize: 14, width: 20, textAlign: 'center' as const, flexShrink: 0 }}>{t.icon}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: '#18181b', flex: 1, textAlign: 'left' as const }}>{t.label}</span>
                        {t.soon && <span style={{ fontSize: 9, fontWeight: 700, color: '#71717a', background: '#f4f4f5', padding: '2px 5px', borderRadius: 4 }}>SOON</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CENTER: Canvas */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {questions.length === 0 ? (
                <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 14, padding: '56px 24px', textAlign: 'center', color: '#71717a', border: '2px dashed rgba(219,39,119,.2)' }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✎</div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#52525b' }}>No questions yet</div>
                  <div style={{ fontSize: 13 }}>Click the <strong>+</strong> button on the left to add your first question.</div>
                </div>
              ) : questions.map((q, i) => {
                const qAccent = TYPE_ACCENT[q.type] ?? '#db2777'
                const isSelected = editingQId === q.id
                const typeLabel = TYPE_LABEL[q.type] ?? q.type
                return (
                  <div
                    key={q.id}
                    onClick={() => setEditingQId(isSelected ? null : q.id)}
                    style={{ background: '#fff', borderRadius: 12, borderTop: `1.5px solid ${isSelected ? '#db2777' : 'rgba(219,39,119,.08)'}`, borderRight: `1.5px solid ${isSelected ? '#db2777' : 'rgba(219,39,119,.08)'}`, borderBottom: `1.5px solid ${isSelected ? '#db2777' : 'rgba(219,39,119,.08)'}`, borderLeft: `4px solid ${qAccent}`, boxShadow: isSelected ? '0 4px 24px rgba(219,39,119,.14)' : '0 2px 6px rgba(0,0,0,.04)', cursor: 'pointer', transition: 'box-shadow .15s', overflow: 'hidden' }}
                  >
                    {/* Card header */}
                    <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, background: qAccent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, flexShrink: 0, fontFamily: "'Schibsted Grotesk', system-ui" }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0, marginTop: 2 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: q.title ? '#18181b' : '#a1a1aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {q.title || 'Untitled question — click to edit'}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: `${qAccent}18`, color: qAccent, border: `1px solid ${qAccent}25` }}>
                            {typeLabel}
                          </span>
                          {q.required && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Required</span>
                          )}
                          {q.logicOn && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed', border: '1px solid #ddd6fe' }}>🔀 Logic</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteQuestion(q.id) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#d4d4d8', lineHeight: 1, padding: '2px 4px', flexShrink: 0, marginTop: -2 }}
                        title="Delete question">×</button>
                    </div>

                    {/* AI chips */}
                    <div style={{ padding: '0 16px 12px', display: 'flex', gap: 5, flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                      {AI_CHIPS.map(chip => {
                        const chipKey = `${q.id}-${chip.key}`
                        const isLoading = aiChipLoading === chipKey
                        return (
                          <button
                            key={chip.key}
                            onClick={() => runAiChip(q.id, chip.key)}
                            disabled={!!aiChipLoading}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 600, color: '#7c3aed', background: '#faf5ff', border: '1px solid #ede9fe', padding: '4px 10px', borderRadius: 7, cursor: isLoading ? 'default' : 'pointer', opacity: isLoading ? .6 : 1, fontFamily: 'inherit', transition: 'background .1s' }}
                            onMouseEnter={e => { if (!aiChipLoading) (e.currentTarget as HTMLButtonElement).style.background = '#ede9fe' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#faf5ff' }}>
                            <span>{isLoading ? '…' : '✨'}</span>
                            <span>{chip.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* End screens */}
              {questions.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, paddingLeft: 4 }}>End Screens</div>
                  {([
                    { key: 'thankyou' as const, label: 'Thank You Screen', desc: 'Shown after survey completion', color: '#16a34a', bg: '#f0fdf4', heading: cfgThankYouHeading, body: cfgThankYouText },
                    { key: 'disqualified' as const, label: 'Disqualified Screen', desc: 'Shown to screened-out respondents', color: '#d97706', bg: '#fffbeb', heading: cfgDisqualifiedHeading, body: cfgScreenOutMsg },
                  ]).map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 12, border: `1.5px solid rgba(219,39,119,.06)`, borderLeft: `4px solid ${s.color}`, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#18181b' }}>{s.label}</div>
                        <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{s.desc}</div>
                        <div style={{ fontSize: 11.5, color: '#a1a1aa', marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 340 }}>
                          <strong style={{ color: '#71717a' }}>{s.heading}</strong> — {s.body}
                        </div>
                        {s.key === 'thankyou' && cfgRedirectUrl && (
                          <div style={{ fontSize: 11, color: s.color, marginTop: 4, fontWeight: 600 }}>
                            ↪ Redirects to {cfgRedirectUrl} after {cfgRedirectDelay}s
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setEndScreen(s.key)}
                        style={{ fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 8, border: `1px solid ${s.color}`, color: s.color, background: s.bg, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                        Edit
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT: Properties panel */}
            {editingQId && (
              <div style={{ width: 320, flexShrink: 0 }}>
                <div style={{ background: 'rgba(255,255,255,.96)', backdropFilter: 'blur(12px)', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.12)', overflow: 'hidden', position: 'sticky', top: 20, boxShadow: '0 4px 24px rgba(219,39,119,.1)' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(219,39,119,.08)', background: 'linear-gradient(135deg,rgba(219,39,119,.06),rgba(124,58,237,.04))' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#db2777', textTransform: 'uppercase', letterSpacing: '.06em' }}>Question Properties</div>
                  </div>
                  <QuestionEditor
                    key={editingQId}
                    surveyId={id}
                    question={questions.find(q => q.id === editingQId)!}
                    onSave={saved => setQuestions(prev => prev.map(q => q.id === saved.id ? { ...saved, logicOn: q.logicOn } : q))}
                    onDelete={qid => { setQuestions(prev => prev.filter(q => q.id !== qid)); setEditingQId(null) }}
                    onCancel={() => {
                      const q = questions.find(q => q.id === editingQId)
                      if (q && !q.title.trim()) {
                        fetch(`${API}/surveys/${id}/questions/${q.id}`, { method: 'DELETE' })
                        setQuestions(prev => prev.filter(pq => pq.id !== q.id))
                      }
                      setEditingQId(null)
                    }}
                  />
                </div>
              </div>
            )}

            {/* Empty state when no question selected */}
            {!editingQId && questions.length > 0 && (
              <div style={{ width: 320, flexShrink: 0 }}>
                <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 14, border: '1.5px dashed rgba(219,39,119,.2)', padding: '32px 20px', textAlign: 'center', color: '#71717a' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>←</div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#52525b', marginBottom: 4 }}>Select a question</div>
                  <div style={{ fontSize: 12 }}>Click any card to edit its properties</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LOGIC ── */}
        {activeTab === 'logic' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)' }}>
            <LogicTab surveyId={id} questions={questions} />
          </div>
        )}

        {/* ── CONFIGURATION ── */}
        {activeTab === 'config' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: 28 }}>
            <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, margin: '0 0 4px', color: '#18181b' }}>Survey Settings</h2>
            <div style={{ fontSize: 13, color: '#71717a', marginBottom: 28 }}>Configure general info, behaviour, access control, and response limits.</div>

            {/* ── GENERAL ── */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 14 }}>General</div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Survey Name</label>
                  <input
                    value={survey?.title ?? ''}
                    onChange={e => setSurvey(prev => prev ? { ...prev, title: e.target.value } : prev)}
                    placeholder="Enter survey name…"
                    style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Description</label>
                  <textarea
                    value={cfgDescription}
                    onChange={e => setCfgDescription(e.target.value)}
                    placeholder="Briefly describe the purpose of this survey…"
                    rows={3}
                    style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Category</label>
                    <select value={cfgCategory} onChange={e => setCfgCategory(e.target.value)} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                      <option value="">Select category…</option>
                      <option value="customer_satisfaction">Customer Satisfaction</option>
                      <option value="product_feedback">Product Feedback</option>
                      <option value="market_research">Market Research</option>
                      <option value="hr_employee">HR &amp; Employee</option>
                      <option value="academic">Academic / Research</option>
                      <option value="event_feedback">Event Feedback</option>
                      <option value="nps">Net Promoter Score</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Folder</label>
                    <input
                      value={cfgFolder}
                      onChange={e => setCfgFolder(e.target.value)}
                      placeholder="e.g. Q3 Research"
                      style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── ACCESS CONTROL ── */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 14 }}>Access Control</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
                {([
                  { id: 'public',         icon: '🌐', label: 'Open / Public',         desc: 'Anyone with the link can respond' },
                  { id: 'password',       icon: '🔒', label: 'Password Protection',    desc: 'Respondents must enter a password' },
                  { id: 'email_password', icon: '✉️', label: 'Email + Password',       desc: 'Email ID and password required' },
                  { id: 'invite_only',    icon: '📩', label: 'Email Invites Only',     desc: 'Only invited email addresses can respond' },
                ] as const).map(opt => {
                  const on = cfgAccessMode === opt.id
                  return (
                    <div key={opt.id} onClick={() => setCfgAccessMode(opt.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s', background: on ? 'linear-gradient(135deg,rgba(219,39,119,.06),rgba(147,51,234,.04))' : 'rgba(255,255,255,.7)', boxShadow: on ? '0 0 0 2px #db2777' : '0 0 0 1.5px #e4e4e7' }}>
                      <div style={{ fontSize: 22, lineHeight: 1 }}>{opt.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#18181b', marginBottom: 2 }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: '#71717a' }}>{opt.desc}</div>
                      </div>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${on ? '#db2777' : '#d4d4d8'}`, background: on ? '#db2777' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        {on && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Password field */}
              {(cfgAccessMode === 'password' || cfgAccessMode === 'email_password') && (
                <div style={{ marginBottom: 14, padding: '16px 18px', background: 'rgba(219,39,119,.04)', border: '1px solid rgba(219,39,119,.12)', borderRadius: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>
                    {cfgAccessMode === 'password' ? 'Survey Password' : 'Access Password'}
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type={cfgShowPwd ? 'text' : 'password'}
                      placeholder="Set a password…"
                      value={cfgPassword}
                      onChange={e => setCfgPassword(e.target.value)}
                      style={{ flex: 1, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                    />
                    <button onClick={() => setCfgShowPwd(v => !v)} style={{ fontSize: 12, color: '#71717a', background: 'none', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '9px 12px', cursor: 'pointer' }}>
                      {cfgShowPwd ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {cfgAccessMode === 'email_password' && (
                    <div style={{ fontSize: 12, color: '#71717a', marginTop: 6 }}>Respondents must enter their email address <em>and</em> this password to access the survey.</div>
                  )}
                </div>
              )}

              {/* Invite emails field */}
              {cfgAccessMode === 'invite_only' && (
                <div style={{ padding: '16px 18px', background: 'rgba(219,39,119,.04)', border: '1px solid rgba(219,39,119,.12)', borderRadius: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Invited Email Addresses</label>
                  <textarea
                    placeholder={'Enter email addresses separated by commas or new lines…\ne.g. alice@example.com, bob@example.com'}
                    value={cfgInviteEmails}
                    onChange={e => setCfgInviteEmails(e.target.value)}
                    rows={4}
                    style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const }}
                  />
                  {cfgInviteEmails.trim() && (
                    <div style={{ fontSize: 12, color: '#db2777', marginTop: 6, fontWeight: 600 }}>
                      {cfgInviteEmails.split(/[,\n]/).map(e => e.trim()).filter(Boolean).length} email{cfgInviteEmails.split(/[,\n]/).map(e => e.trim()).filter(Boolean).length !== 1 ? 's' : ''} added
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: '#71717a', marginTop: 6 }}>Only these respondents will be able to access and complete the survey.</div>
                </div>
              )}
            </div>

            {/* ── SURVEY BEHAVIOUR ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 14 }}>Survey Behaviour</div>
              {([
                { label: 'One Response Per User', desc: 'Prevent duplicate submissions (cookie-based)', val: cfgNoDupes, set: setCfgNoDupes },
                { label: 'Anonymous Responses', desc: 'Do not collect respondent identity or IP address', val: cfgAnonymous, set: setCfgAnonymous },
                { label: 'Save &amp; Resume', desc: 'Allow respondents to save progress and return later', val: cfgSaveResume, set: setCfgSaveResume },
                { label: 'Accept Partial Responses', desc: 'Record responses even if the survey is not fully completed', val: cfgPartialResponses, set: setCfgPartialResponses },
                { label: 'Auto Save', desc: 'Automatically save respondent answers as they progress', val: cfgAutoSave, set: setCfgAutoSave },
                { label: 'Capture Location Data', desc: "Record the respondent's approximate location (country/region) at response time", val: cfgCaptureLocation, set: setCfgCaptureLocation },
                { label: 'Age Verification', desc: 'Require respondents to confirm they meet a minimum age before starting', val: cfgAgeVerification, set: setCfgAgeVerification },
                { label: 'Require All Responses', desc: 'Make all questions mandatory for respondents', val: cfgRequire, set: setCfgRequire },
                { label: 'Randomize Question Order', desc: 'Show questions in random order to reduce bias', val: cfgRandomize, set: setCfgRandomize },
              ] as Array<{ label: string; desc: string; val: boolean; set: (v: boolean) => void }>).map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(219,39,119,.06)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#18181b' }} dangerouslySetInnerHTML={{ __html: row.label }} />
                    <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{row.desc}</div>
                  </div>
                  <div onClick={() => row.set(!row.val)} style={{ position: 'relative', width: 44, height: 25, borderRadius: 14, background: row.val ? '#db2777' : '#e4e4e7', cursor: 'pointer', transition: '.15s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: row.val ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: 'white', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Survey Timeout (minutes)</label>
                <input
                  type="number"
                  placeholder="e.g. 30 — leave blank for no limit"
                  value={cfgTimeout}
                  onChange={e => setCfgTimeout(e.target.value)}
                  min="1"
                  style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                />
                <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Session expires after this many minutes of inactivity.</div>
              </div>
            </div>

            {/* ── SURVEY CONTROLS ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 14 }}>Survey Controls</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Close Date</label>
                  <input type="date" value={closeDate} onChange={e => setCloseDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Response Limit</label>
                  <input type="number" placeholder="e.g. 1000" value={responseLimit} onChange={e => setResponseLimit(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Closed Survey Message</label>
                  <textarea
                    value={cfgClosedMessage}
                    onChange={e => setCfgClosedMessage(e.target.value)}
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const }}
                  />
                  <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>Shown to visitors when the survey is deactivated, past its close date, or has hit its response limit.</div>
                </div>
              </div>
            </div>

            {/* ── QUOTAS ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 6 }}>Quotas</div>
              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 14 }}>Limit responses by answer value. When a quota is filled the respondent sees the termination message below.</div>
              {cfgQuotas.map((q, qi) => (
                <div key={q.id} style={{ background: 'rgba(219,39,119,.03)', border: '1px solid rgba(219,39,119,.12)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <input placeholder="Quota name" value={q.name} onChange={e => setCfgQuotas(prev => prev.map((x,i) => i===qi ? {...x, name: e.target.value} : x))} style={{ flex: 2, minWidth: 120, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                    <input placeholder="Answer value (e.g. Female)" value={q.answer_value} onChange={e => setCfgQuotas(prev => prev.map((x,i) => i===qi ? {...x, answer_value: e.target.value} : x))} style={{ flex: 2, minWidth: 120, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                    <input type="number" placeholder="Limit" value={q.limit} onChange={e => setCfgQuotas(prev => prev.map((x,i) => i===qi ? {...x, limit: parseInt(e.target.value)||0} : x))} style={{ width: 80, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                    <select value={q.action} onChange={e => setCfgQuotas(prev => prev.map((x,i) => i===qi ? {...x, action: e.target.value as TerminationAction} : x))} style={{ border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                      <option value="screen_out">Screen out</option>
                      <option value="quota_full">Quota full</option>
                      <option value="over_quota">Over quota</option>
                    </select>
                    <button onClick={() => setCfgQuotas(prev => prev.filter((_,i) => i!==qi))} style={{ fontSize: 18, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '4px 6px' }}>×</button>
                  </div>
                </div>
              ))}
              <button onClick={() => setCfgQuotas(prev => [...prev, { id: crypto.randomUUID(), name: '', question_id: '', answer_value: '', limit: 100, action: 'quota_full' }])} style={{ fontSize: 12, fontWeight: 600, color: '#db2777', background: 'rgba(219,39,119,.06)', border: '1.5px dashed rgba(219,39,119,.3)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', width: '100%' }}>
                + Add quota rule
              </button>
              {cfgQuotas.length > 0 && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, fontSize: 12, color: '#15803d' }}>
                  Multi-dimensional quotas: combine multiple rules — e.g. "Female" quota + "18–24" quota. A respondent who fills any matching quota gets the termination screen for that rule.
                </div>
              )}
            </div>

            {/* ── TERMINATION MESSAGES ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 6 }}>Termination Messages</div>
              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 14 }}>Customize what respondents see when they are terminated. Each type has its own message.</div>
              {[
                { label: 'Screen-Out', desc: 'Respondent fails a screener / logic disqualifier', val: cfgScreenOutMsg, set: setCfgScreenOutMsg, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
                { label: 'Quota Full', desc: "Respondent answer fills an existing quota", val: cfgQuotaFullMsg, set: setCfgQuotaFullMsg, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
                { label: 'Over Quota', desc: "Respondent profile segment is over-represented", val: cfgOverQuotaMsg, set: setCfgOverQuotaMsg, color: '#7c3aed', bg: '#faf5ff', border: '#ddd6fe' },
              ].map(row => (
                <div key={row.label} style={{ marginBottom: 12, padding: '14px 16px', background: row.bg, border: `1px solid ${row.border}`, borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: row.color, background: '#fff', padding: '2px 8px', borderRadius: 20, border: `1px solid ${row.border}` }}>{row.label}</span>
                    <span style={{ fontSize: 11, color: '#71717a' }}>{row.desc}</span>
                  </div>
                  <textarea value={row.val} onChange={e => row.set(e.target.value)} rows={2} style={{ width: '100%', boxSizing: 'border-box' as const, border: `1.5px solid ${row.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const, background: '#fff' }} />
                </div>
              ))}
            </div>

            {/* ── NOTIFICATIONS ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 6 }}>Notifications</div>
              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 14 }}>Quick switches for the most common alerts. For custom recipients, subjects, or webhooks, use Workflow &amp; Automation below.</div>
              {([
                { label: 'Thank You Email', desc: 'Email the respondent a copy of their submission after they complete the survey', val: cfgNotifyThankYouEmail, set: setCfgNotifyThankYouEmail },
                { label: 'Admin Confirmation', desc: 'Notify the survey owner by email each time a response comes in', val: cfgNotifyAdminConfirmation, set: setCfgNotifyAdminConfirmation },
                { label: 'Quota Notification', desc: 'Notify the survey owner when a quota rule is filled', val: cfgNotifyQuotaReached, set: setCfgNotifyQuotaReached },
              ] as Array<{ label: string; desc: string; val: boolean; set: (v: boolean) => void }>).map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(219,39,119,.06)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#18181b' }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{row.desc}</div>
                  </div>
                  <div onClick={() => row.set(!row.val)} style={{ position: 'relative', width: 44, height: 25, borderRadius: 14, background: row.val ? '#db2777' : '#e4e4e7', cursor: 'pointer', transition: '.15s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: row.val ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: 'white', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── WORKFLOW & AUTOMATION ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 6 }}>Workflow & Automation</div>
              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 14 }}>Trigger actions automatically based on survey events. Email delivery requires an SMTP integration.</div>
              {cfgWorkflows.map((wf, wi) => (
                <div key={wf.id} style={{ background: 'rgba(14,165,233,.03)', border: '1px solid rgba(14,165,233,.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                    <input placeholder="Workflow name" value={wf.name} onChange={e => setCfgWorkflows(prev => prev.map((x,i) => i===wi ? {...x, name: e.target.value} : x))} style={{ flex: 1, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                    <div onClick={() => setCfgWorkflows(prev => prev.map((x,i) => i===wi ? {...x, enabled: !x.enabled} : x))} style={{ position: 'relative', width: 40, height: 22, borderRadius: 12, background: wf.enabled ? '#0ea5e9' : '#e4e4e7', cursor: 'pointer', transition: '.15s', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, left: wf.enabled ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                    </div>
                    <button onClick={() => setCfgWorkflows(prev => prev.filter((_,i) => i!==wi))} style={{ fontSize: 18, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '4px 6px' }}>×</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Trigger</div>
                      <select value={wf.trigger} onChange={e => setCfgWorkflows(prev => prev.map((x,i) => i===wi ? {...x, trigger: e.target.value as WorkflowTrigger} : x))} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                        <option value="response_complete">Response completed</option>
                        <option value="new_response">Any new response</option>
                        <option value="partial_abandon">Partial / abandoned</option>
                        <option value="quota_reached">Quota reached</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Action</div>
                      <select value={wf.action.type} onChange={e => setCfgWorkflows(prev => prev.map((x,i) => i===wi ? {...x, action: {...x.action, type: e.target.value as 'send_email'|'webhook'}} : x))} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                        <option value="send_email">Send email</option>
                        <option value="webhook">Webhook (POST)</option>
                      </select>
                    </div>
                  </div>
                  {wf.action.type === 'send_email' && (
                    <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Recipient</div>
                          <select value={wf.action.to} onChange={e => setCfgWorkflows(prev => prev.map((x,i) => i===wi ? {...x, action: {...x.action, to: e.target.value as 'owner'|'custom'}} : x))} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                            <option value="owner">Survey owner (me)</option>
                            <option value="custom">Custom email</option>
                          </select>
                        </div>
                        {wf.action.to === 'custom' && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Email address</div>
                            <input type="email" placeholder="notify@example.com" value={wf.action.email} onChange={e => setCfgWorkflows(prev => prev.map((x,i) => i===wi ? {...x, action: {...x.action, email: e.target.value}} : x))} style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Subject</div>
                        <input placeholder="New response received" value={wf.action.subject} onChange={e => setCfgWorkflows(prev => prev.map((x,i) => i===wi ? {...x, action: {...x.action, subject: e.target.value}} : x))} style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                    </div>
                  )}
                  {wf.action.type === 'webhook' && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Webhook URL</div>
                      <input placeholder="https://hooks.example.com/..." value={wf.action.url ?? ''} onChange={e => setCfgWorkflows(prev => prev.map((x,i) => i===wi ? {...x, action: {...x.action, url: e.target.value}} : x))} style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setCfgWorkflows(prev => [...prev, { id: crypto.randomUUID(), name: 'Notify on completion', trigger: 'response_complete', enabled: true, action: { type: 'send_email', to: 'owner', email: '', subject: 'New response received', body: '' } }])} style={{ fontSize: 12, fontWeight: 600, color: '#0ea5e9', background: 'rgba(14,165,233,.06)', border: '1.5px dashed rgba(14,165,233,.3)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', width: '100%' }}>
                + Add workflow
              </button>
            </div>

            {/* ── REMINDER EMAIL ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 14 }}>Reminder Email</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(219,39,119,.06)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#18181b' }}>Send reminder to incomplete respondents</div>
                  <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>Automatically email respondents who started but didn't finish</div>
                </div>
                <div onClick={() => setCfgReminderEnabled(v => !v)} style={{ position: 'relative', width: 44, height: 25, borderRadius: 14, background: cfgReminderEnabled ? '#db2777' : '#e4e4e7', cursor: 'pointer', transition: '.15s', flexShrink: 0 }}>
                  <div style={{ position: 'absolute', top: 3, left: cfgReminderEnabled ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: 'white', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                </div>
              </div>
              {cfgReminderEnabled && (
                <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Send after (hours)</label>
                    <input type="number" value={cfgReminderDelayHours} onChange={e => setCfgReminderDelayHours(e.target.value)} placeholder="24" min="1" max="168" style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Email subject</label>
                    <input value={cfgReminderSubject} onChange={e => setCfgReminderSubject(e.target.value)} placeholder="Reminder: Complete your survey" style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <div style={{ gridColumn: '1 / -1', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, fontSize: 12, color: '#92400e' }}>
                    Reminder emails require an SMTP integration configured in Settings → Email.
                  </div>
                </div>
              )}
            </div>

            {/* ── RESPONSE TAGGING ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 6 }}>Response Tagging</div>
              <div style={{ fontSize: 12, color: '#71717a', marginBottom: 14 }}>Auto-tag responses based on answer conditions. Tags appear in the Insights tab for filtering.</div>
              {cfgTags.map((tag, ti) => (
                <div key={tag.id} style={{ background: 'rgba(139,92,246,.03)', border: '1px solid rgba(139,92,246,.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="color" value={tag.color} onChange={e => setCfgTags(prev => prev.map((x,i) => i===ti ? {...x, color: e.target.value} : x))} style={{ width: 36, height: 36, border: '1.5px solid #e4e4e7', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                    <input placeholder="Tag name (e.g. Promoter)" value={tag.name} onChange={e => setCfgTags(prev => prev.map((x,i) => i===ti ? {...x, name: e.target.value} : x))} style={{ flex: 1, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#52525b' }}>
                      <span>Auto</span>
                      <div onClick={() => setCfgTags(prev => prev.map((x,i) => i===ti ? {...x, auto: !x.auto} : x))} style={{ position: 'relative', width: 36, height: 20, borderRadius: 10, background: tag.auto ? '#8b5cf6' : '#e4e4e7', cursor: 'pointer', transition: '.15s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 2, left: tag.auto ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                      </div>
                    </div>
                    <button onClick={() => setCfgTags(prev => prev.filter((_,i) => i!==ti))} style={{ fontSize: 18, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '4px 6px' }}>×</button>
                  </div>
                  {tag.auto && (
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Question ID</div>
                        <input placeholder="Question ID" value={tag.condition?.question_id ?? ''} onChange={e => setCfgTags(prev => prev.map((x,i) => i===ti ? {...x, condition: {...(x.condition||{operator:'equals',value:''}), question_id: e.target.value}} : x))} style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Operator</div>
                        <select value={tag.condition?.operator ?? 'equals'} onChange={e => setCfgTags(prev => prev.map((x,i) => i===ti ? {...x, condition: {...(x.condition||{question_id:'',value:''}), operator: e.target.value as 'equals'|'contains'|'not_equals'}} : x))} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                          <option value="equals">= equals</option>
                          <option value="contains">contains</option>
                          <option value="not_equals">≠ not equals</option>
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Value</div>
                        <input placeholder="Answer value" value={tag.condition?.value ?? ''} onChange={e => setCfgTags(prev => prev.map((x,i) => i===ti ? {...x, condition: {...(x.condition||{question_id:'',operator:'equals'}), value: e.target.value}} : x))} style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setCfgTags(prev => [...prev, { id: crypto.randomUUID(), name: '', color: '#8b5cf6', auto: false }])} style={{ fontSize: 12, fontWeight: 600, color: '#8b5cf6', background: 'rgba(139,92,246,.06)', border: '1.5px dashed rgba(139,92,246,.3)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', width: '100%' }}>
                + Add tag
              </button>
            </div>

            {/* ── SURVEY EXPERIENCE ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 14 }}>Survey Experience</div>
              {([
                { label: 'Progress Bar', desc: 'Show a completion progress indicator to respondents', val: cfgProgressBar, set: setCfgProgressBar },
                { label: 'Back Button', desc: 'Allow respondents to go back and change previous answers', val: cfgBackButton, set: setCfgBackButton },
                { label: 'Language Selector', desc: 'Show a language switcher if multiple translations exist', val: cfgLanguageSelector, set: setCfgLanguageSelector },
              ] as Array<{ label: string; desc: string; val: boolean; set: (v: boolean) => void }>).map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(219,39,119,.06)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#18181b' }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{row.desc}</div>
                  </div>
                  <div onClick={() => row.set(!row.val)} style={{ position: 'relative', width: 44, height: 25, borderRadius: 14, background: row.val ? '#db2777' : '#e4e4e7', cursor: 'pointer', transition: '.15s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: row.val ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: 'white', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Thank You Message</label>
                  <textarea
                    value={cfgThankYouText}
                    onChange={e => setCfgThankYouText(e.target.value)}
                    placeholder="Thank you for completing our survey!"
                    rows={2}
                    style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical' as const }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Redirect URL <span style={{ fontWeight: 400, color: '#a1a1aa' }}>(optional)</span></label>
                  <input
                    type="url"
                    value={cfgRedirectUrl}
                    onChange={e => setCfgRedirectUrl(e.target.value)}
                    placeholder="https://yoursite.com/thank-you"
                    style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                  />
                  <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 4 }}>After completing the survey, respondents will be redirected here instead of seeing the thank-you message.</div>
                </div>
              </div>
            </div>

            {/* ── ACCESSIBILITY ── */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 14 }}>Accessibility</div>
              {([
                { label: 'WCAG Mode', desc: 'Apply WCAG 2.1 AA–compliant contrast and focus styling', val: cfgWcagMode, set: setCfgWcagMode },
                { label: 'Keyboard Navigation', desc: 'Ensure all interactive elements are reachable via keyboard', val: cfgKeyboardNav, set: setCfgKeyboardNav },
                { label: 'Screen Reader Labels', desc: 'Add aria-label attributes to all form elements', val: cfgScreenReader, set: setCfgScreenReader },
              ] as Array<{ label: string; desc: string; val: boolean; set: (v: boolean) => void }>).map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(219,39,119,.06)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#18181b' }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: '#71717a', marginTop: 2 }}>{row.desc}</div>
                  </div>
                  <div onClick={() => row.set(!row.val)} style={{ position: 'relative', width: 44, height: 25, borderRadius: 14, background: row.val ? '#db2777' : '#e4e4e7', cursor: 'pointer', transition: '.15s', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 3, left: row.val ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: 'white', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                  </div>
                </div>
              ))}
              <div style={{ paddingTop: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Font Scaling</label>
                <select value={cfgFontScale} onChange={e => setCfgFontScale(e.target.value)} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}>
                  <option value="100">100% — Default</option>
                  <option value="110">110% — Slightly larger</option>
                  <option value="120">120% — Large</option>
                  <option value="150">150% — Extra large</option>
                </select>
              </div>
            </div>

            <button className="btn" style={{ fontSize: 13 }} onClick={async () => {
              if ((cfgAccessMode === 'password' || cfgAccessMode === 'email_password') && !cfgPassword.trim()) {
                alert('Please set a password for this access mode.'); return
              }
              if (cfgAccessMode === 'invite_only' && !cfgInviteEmails.trim()) {
                alert('Please enter at least one invited email address.'); return
              }
              await updateSurvey(id, {
                settings: buildSettings(),
                close_date: closeDate || null,
                response_limit: responseLimit ? parseInt(responseLimit) : null,
              })
              alert('Configuration saved.')
            }}>Save Configuration</button>
          </div>
        )}

        {/* ── THEME ── */}
        {activeTab === 'theme' && (() => {
          const th = surveyTheme
          const setTh = (patch: Partial<SurveyTheme>) => { setSurveyTheme(prev => ({ ...prev, ...patch })); setActivePresetId('custom') }
          const previewQuestions = questions.slice(0, 2)
          const bgStyle = th.backgroundType === 'gradient' ? th.backgroundGradient : th.backgroundColor

          return (
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', minHeight: 600 }}>

              {/* ── LEFT: Preset Gallery ── */}
              <div style={{ width: 180, flexShrink: 0 }}>
                <div style={{ background: 'rgba(255,255,255,.92)', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: 12, position: 'sticky', top: 20 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em', marginBottom: 10 }}>Presets</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PRESET_THEMES.map(preset => {
                      const isActive = activePresetId === preset.id
                      return (
                        <button key={preset.id}
                          onClick={() => { setSurveyTheme({ ...preset }); setActivePresetId(preset.id) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: isActive ? `2px solid ${preset.primaryColor}` : '2px solid transparent', background: isActive ? `${preset.primaryColor}10` : 'transparent', cursor: 'pointer', textAlign: 'left' as const, width: '100%', fontFamily: 'inherit', transition: 'all .15s' }}>
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            <div style={{ width: 12, height: 24, borderRadius: '4px 0 0 4px', background: preset.swatch1 }} />
                            <div style={{ width: 12, height: 24, background: preset.swatch2 }} />
                            <div style={{ width: 12, height: 24, borderRadius: '0 4px 4px 0', background: preset.swatch3 }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? preset.primaryColor : '#52525b' }}>{preset.name}</span>
                        </button>
                      )
                    })}
                    {activePresetId === 'custom' && (
                      <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 10, border: `2px solid ${th.primaryColor}`, background: `${th.primaryColor}10`, cursor: 'default', textAlign: 'left' as const, width: '100%', fontFamily: 'inherit' }}>
                        <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                          <div style={{ width: 12, height: 24, borderRadius: '4px 0 0 4px', background: th.primaryColor }} />
                          <div style={{ width: 12, height: 24, background: th.cardBackground }} />
                          <div style={{ width: 12, height: 24, borderRadius: '0 4px 4px 0', background: th.backgroundColor }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: th.primaryColor }}>Custom</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ── CENTER: Live Preview ── */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase' as const, letterSpacing: '.06em' }}>Live Preview</div>
                <div style={{ width: '100%', maxWidth: 420, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,.14)', border: '1px solid rgba(0,0,0,.08)' }}>
                  {/* Preview header */}
                  <div style={{ background: th.primaryColor, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 800 }}>S</div>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, fontFamily: th.headingFont }}>{survey.title || 'Survey Title'}</span>
                  </div>
                  {/* Progress bar */}
                  {th.showProgress && (
                    <div style={{ height: 4, background: `${th.progressColor}30` }}>
                      <div style={{ height: '100%', width: '40%', background: th.progressColor, transition: th.animations ? 'width .4s ease' : 'none' }} />
                    </div>
                  )}
                  {/* Survey body */}
                  <div style={{ background: th.backgroundType === 'gradient' ? th.backgroundGradient : th.backgroundColor, padding: '20px 16px', minHeight: 380, display: 'flex', flexDirection: 'column', gap: 14, fontFamily: th.bodyFont }}>
                    {previewQuestions.length > 0 ? previewQuestions.map((q, i) => (
                      <div key={q.id} style={{ background: th.cardBackground, borderRadius: th.borderRadius, border: `1px solid ${th.borderColor}`, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: th.primaryColor, marginBottom: 4 }}>Q{i + 1}</div>
                        <div style={{ fontSize: th.fontSize - 1, fontWeight: 600, color: th.textColor, marginBottom: 12, fontFamily: th.headingFont }}>{q.title || 'Untitled question'}</div>
                        {/* Mock answer options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {['Option A', 'Option B', 'Option C'].map((opt, oi) => (
                            <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: th.borderRadius - 4, border: `1.5px solid ${oi === 0 ? th.primaryColor : th.borderColor}`, background: oi === 0 ? `${th.primaryColor}10` : 'transparent', cursor: 'pointer' }}>
                              <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${oi === 0 ? th.primaryColor : th.borderColor}`, background: oi === 0 ? th.primaryColor : 'transparent', flexShrink: 0 }} />
                              <span style={{ fontSize: th.fontSize - 2, color: th.textColor }}>{opt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )) : (
                      <div style={{ background: th.cardBackground, borderRadius: th.borderRadius, border: `1px solid ${th.borderColor}`, padding: '20px 18px', textAlign: 'center', color: th.textColor, opacity: 0.5, fontSize: 13 }}>
                        Add questions in the Build tab to see them here
                      </div>
                    )}
                    {/* Next button */}
                    <button style={{ alignSelf: 'flex-end', padding: '10px 24px', borderRadius: th.buttonRadius, border: th.buttonStyle === 'outlined' ? `2px solid ${th.primaryColor}` : 'none', background: th.buttonStyle === 'filled' ? th.primaryColor : 'transparent', color: th.buttonStyle === 'filled' ? '#fff' : th.primaryColor, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: th.bodyFont }}>
                      Next →
                    </button>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Customization Panel ── */}
              <div style={{ width: 280, flexShrink: 0 }}>
                <div style={{ background: 'rgba(255,255,255,.92)', borderRadius: 14, border: '1.5px solid rgba(219,39,119,.08)', padding: 16, position: 'sticky', top: 20 }}>
                  {/* Sub-tabs */}
                  <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#f4f4f5', borderRadius: 8, padding: 3 }}>
                    {(['colors','typography','layout','background','buttons'] as const).map(tab => (
                      <button key={tab} onClick={() => setThemeCustomTab(tab)}
                        style={{ flex: 1, fontSize: 10, fontWeight: 700, padding: '5px 2px', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' as const, transition: 'all .1s',
                          background: themeCustomTab === tab ? '#fff' : 'transparent',
                          color: themeCustomTab === tab ? '#db2777' : '#71717a',
                          boxShadow: themeCustomTab === tab ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                        }}>
                        {tab === 'typography' ? 'Type' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* COLORS */}
                    {themeCustomTab === 'colors' && (<>
                      {[
                        { label: 'Primary / Brand', key: 'primaryColor' as const },
                        { label: 'Background',       key: 'backgroundColor' as const },
                        { label: 'Card background',  key: 'cardBackground' as const },
                        { label: 'Text colour',      key: 'textColor' as const },
                        { label: 'Border colour',    key: 'borderColor' as const },
                        { label: 'Progress bar',     key: 'progressColor' as const },
                      ].map(({ label, key }) => (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#52525b' }}>{label}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, color: '#a1a1aa', fontFamily: 'monospace' }}>{th[key] as string}</span>
                            <label style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '1.5px solid #e4e4e7', display: 'block' }}>
                              <input type="color" value={th[key] as string} onChange={e => setTh({ [key]: e.target.value })} style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', marginTop: -4, marginLeft: -4 }} />
                            </label>
                          </div>
                        </div>
                      ))}
                    </>)}

                    {/* TYPOGRAPHY */}
                    {themeCustomTab === 'typography' && (<>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Heading font</div>
                        <select value={th.headingFont} onChange={e => setTh({ headingFont: e.target.value })} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
                          {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Body font</div>
                        <select value={th.bodyFont} onChange={e => setTh({ bodyFont: e.target.value })} style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontFamily: 'inherit', outline: 'none' }}>
                          {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Base font size — {th.fontSize}px</div>
                        <input type="range" min={12} max={20} value={th.fontSize} onChange={e => setTh({ fontSize: +e.target.value })} style={{ width: '100%', accentColor: th.primaryColor }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#a1a1aa' }}><span>12px</span><span>20px</span></div>
                      </div>
                      <div style={{ padding: '10px 12px', background: th.cardBackground, border: `1px solid ${th.borderColor}`, borderRadius: th.borderRadius, fontFamily: th.bodyFont }}>
                        <div style={{ fontSize: th.fontSize, color: th.textColor, fontWeight: 600, fontFamily: th.headingFont, marginBottom: 4 }}>How satisfied are you?</div>
                        <div style={{ fontSize: th.fontSize - 2, color: th.textColor, opacity: 0.7 }}>Font preview — body text sample</div>
                      </div>
                    </>)}

                    {/* LAYOUT */}
                    {themeCustomTab === 'layout' && (<>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Card corner radius — {th.borderRadius}px</div>
                        <input type="range" min={0} max={24} value={th.borderRadius} onChange={e => setTh({ borderRadius: +e.target.value })} style={{ width: '100%', accentColor: th.primaryColor }} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 8 }}>Show progress bar</div>
                        <div onClick={() => setTh({ showProgress: !th.showProgress })} style={{ position: 'relative', width: 44, height: 25, borderRadius: 14, background: th.showProgress ? th.primaryColor : '#e4e4e7', cursor: 'pointer', transition: '.15s' }}>
                          <div style={{ position: 'absolute', top: 3, left: th.showProgress ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 8 }}>Animations</div>
                        <div onClick={() => setTh({ animations: !th.animations })} style={{ position: 'relative', width: 44, height: 25, borderRadius: 14, background: th.animations ? th.primaryColor : '#e4e4e7', cursor: 'pointer', transition: '.15s' }}>
                          <div style={{ position: 'absolute', top: 3, left: th.animations ? 22 : 3, width: 19, height: 19, borderRadius: '50%', background: '#fff', transition: '.15s', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
                        </div>
                      </div>
                    </>)}

                    {/* BACKGROUND */}
                    {themeCustomTab === 'background' && (<>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 8 }}>Background type</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['solid','gradient'] as const).map(type => (
                            <button key={type} onClick={() => setTh({ backgroundType: type })}
                              style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1.5px solid ${th.backgroundType === type ? th.primaryColor : '#e4e4e7'}`, background: th.backgroundType === type ? `${th.primaryColor}10` : '#fff', color: th.backgroundType === type ? th.primaryColor : '#52525b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' as const }}>
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      {th.backgroundType === 'solid' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#52525b' }}>Background colour</span>
                          <label style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', cursor: 'pointer', border: '1.5px solid #e4e4e7' }}>
                            <input type="color" value={th.backgroundColor} onChange={e => setTh({ backgroundColor: e.target.value })} style={{ width: 40, height: 40, border: 'none', cursor: 'pointer', marginTop: -4, marginLeft: -4 }} />
                          </label>
                        </div>
                      )}
                      {th.backgroundType === 'gradient' && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Gradient presets</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                            {[
                              { label: 'Blossom',   value: 'linear-gradient(135deg,#fce7f3 0%,#eff6ff 100%)' },
                              { label: 'Skyline',   value: 'linear-gradient(135deg,#ecfeff 0%,#eff6ff 100%)' },
                              { label: 'Meadow',    value: 'linear-gradient(135deg,#f0fdf4 0%,#ecfeff 100%)' },
                              { label: 'Dusk',      value: 'linear-gradient(135deg,#fff7ed 0%,#fdf2f8 100%)' },
                              { label: 'Cosmos',    value: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%)' },
                              { label: 'Lavender',  value: 'linear-gradient(135deg,#faf5ff 0%,#fce7f3 100%)' },
                            ].map(g => (
                              <button key={g.label} onClick={() => setTh({ backgroundGradient: g.value })}
                                style={{ height: 36, borderRadius: 8, border: th.backgroundGradient === g.value ? `2px solid ${th.primaryColor}` : '1.5px solid #e4e4e7', background: g.value, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: g.value.includes('0f172a') ? '#fff' : '#52525b' }}>
                                {g.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>)}

                    {/* BUTTONS */}
                    {themeCustomTab === 'buttons' && (<>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 8 }}>Button style</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {(['filled','outlined'] as const).map(style => (
                            <button key={style} onClick={() => setTh({ buttonStyle: style })}
                              style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1.5px solid ${th.buttonStyle === style ? th.primaryColor : '#e4e4e7'}`, background: th.buttonStyle === style ? `${th.primaryColor}10` : '#fff', color: th.buttonStyle === style ? th.primaryColor : '#52525b', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' as const }}>
                              {style}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', marginBottom: 4 }}>Button corner radius — {th.buttonRadius}px</div>
                        <input type="range" min={0} max={28} value={th.buttonRadius} onChange={e => setTh({ buttonRadius: +e.target.value })} style={{ width: '100%', accentColor: th.primaryColor }} />
                      </div>
                      {/* Button preview */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={{ flex: 1, padding: '10px 0', borderRadius: th.buttonRadius, border: th.buttonStyle === 'outlined' ? `2px solid ${th.primaryColor}` : 'none', background: th.buttonStyle === 'filled' ? th.primaryColor : 'transparent', color: th.buttonStyle === 'filled' ? '#fff' : th.primaryColor, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: th.bodyFont }}>
                          Next →
                        </button>
                        <button style={{ flex: 1, padding: '10px 0', borderRadius: th.buttonRadius, border: `1.5px solid ${th.borderColor}`, background: 'transparent', color: th.textColor, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: th.bodyFont }}>
                          Back
                        </button>
                      </div>
                    </>)}

                  </div>

                  {/* Save theme */}
                  <button
                    onClick={async () => {
                      const payload = { settings: { ...(survey.settings ?? {}), theme: surveyTheme } }
                      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/surveys/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                      alert('Theme saved!')
                    }}
                    style={{ width: '100%', marginTop: 18, padding: '10px 0', borderRadius: 10, border: 'none', background: th.primaryColor, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Save Theme
                  </button>
                </div>
              </div>

            </div>
          )
        })()}

        {/* ── SHARE ── */}
        {activeTab === 'share' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)' }}>
            <ShareTab surveyId={id} surveyTitle={survey.title} status={survey.status} onPublish={handlePublish} />
          </div>
        )}

        {/* ── INSIGHTS ── */}
        {activeTab === 'insights' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)' }}>
            <InsightsTab surveyId={id} />
          </div>
        )}

        {/* ── EXPERT REVIEW ── */}
        {activeTab === 'expert' && (
          <div style={{ background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1.5px solid rgba(219,39,119,.08)', padding: 28 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, margin: '0 0 4px', color: '#18181b', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Expert Review
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#0891b2', background: '#ecfeff', padding: '2px 8px', borderRadius: 6, border: '1px solid #cffafe' }}>Rule-based</span>
                </h2>
                <div style={{ fontSize: 13, color: '#71717a' }}>Scans for bias, clarity, structure, and compliance issues before you publish.</div>
              </div>
              <button onClick={runExpertReview} disabled={expertLoading} className="btn" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                {expertLoading ? <><span className="spinner" />Analyzing…</> : <>Run Review</>}
              </button>
            </div>

            {/* Empty state */}
            {!expertReview && !expertLoading && (
              <div style={{ background: 'linear-gradient(135deg,#f0f9ff,#ecfeff)', borderRadius: 12, padding: 32, textAlign: 'center', border: '1.5px dashed rgba(8,145,178,.25)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#52525b', marginBottom: 6 }}>No review run yet</div>
                <div style={{ fontSize: 13, color: '#71717a' }}>Click "Run Review" to check your survey for quality issues before publishing.</div>
              </div>
            )}

            {/* Loading */}
            {expertLoading && (
              <div style={{ padding: 40, textAlign: 'center', color: '#71717a' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #cffafe', borderTopColor: '#0891b2', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
                <div style={{ fontSize: 14 }}>Analyzing survey…</div>
              </div>
            )}

            {/* Results */}
            {expertReview && !expertLoading && (() => {
              const { overall_score, categories, findings } = expertReview
              const scoreColor = overall_score >= 80 ? '#16a34a' : overall_score >= 60 ? '#d97706' : '#dc2626'
              const scoreBg    = overall_score >= 80 ? '#f0fdf4' : overall_score >= 60 ? '#fffbeb' : '#fef2f2'
              const scoreBdr   = overall_score >= 80 ? '#bbf7d0' : overall_score >= 60 ? '#fde68a' : '#fecaca'
              const r = 36, circ = 2 * Math.PI * r
              const dash = circ * (overall_score / 100)
              const warnings    = findings.filter(f => f.severity === 'warning')
              const suggestions = findings.filter(f => f.severity === 'suggestion')
              const passes      = findings.filter(f => f.severity === 'pass')
              return (
                <div>
                  {/* Score + categories row */}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
                    {/* Score ring */}
                    <div style={{ background: scoreBg, border: `1.5px solid ${scoreBdr}`, borderRadius: 14, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, minWidth: 180 }}>
                      <svg width={88} height={88} viewBox="0 0 88 88">
                        <circle cx={44} cy={44} r={r} fill="none" stroke={scoreBdr} strokeWidth={8} />
                        <circle cx={44} cy={44} r={r} fill="none" stroke={scoreColor} strokeWidth={8}
                          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                          transform="rotate(-90 44 44)" />
                        <text x={44} y={44} textAnchor="middle" dominantBaseline="central"
                          fill={scoreColor} fontSize={20} fontWeight={700}>{overall_score}</text>
                      </svg>
                      <div>
                        <div style={{ fontSize: 12, color: '#71717a', marginBottom: 2 }}>Overall score</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: scoreColor }}>
                          {overall_score >= 80 ? 'Good' : overall_score >= 60 ? 'Needs work' : 'Poor'}
                        </div>
                        <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 2 }}>{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>

                    {/* Category bars */}
                    <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                      {categories.map(cat => {
                        const c = cat.score >= 80 ? '#16a34a' : cat.score >= 60 ? '#d97706' : '#dc2626'
                        return (
                          <div key={cat.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span style={{ fontSize: 12, color: '#52525b', fontWeight: 500 }}>{cat.name}</span>
                              <span style={{ fontSize: 12, color: c, fontWeight: 600 }}>{cat.score}</span>
                            </div>
                            <div style={{ height: 6, borderRadius: 4, background: '#f4f4f5' }}>
                              <div style={{ height: 6, borderRadius: 4, background: c, width: `${cat.score}%`, transition: 'width .4s ease' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Findings */}
                  {warnings.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Warnings ({warnings.length})</div>
                      {warnings.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', marginBottom: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', marginRight: 6 }}>{f.category}</span>
                            <span style={{ fontSize: 13, color: '#18181b', lineHeight: 1.5 }}>{f.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Suggestions ({suggestions.length})</div>
                      {suggestions.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#fffbeb', borderRadius: 8, border: '1px solid #fde68a', marginBottom: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706', marginRight: 6 }}>{f.category}</span>
                            <span style={{ fontSize: 13, color: '#18181b', lineHeight: 1.5 }}>{f.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {passes.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Passing checks ({passes.length})</div>
                      {passes.map((f, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', marginBottom: 4, borderBottom: i < passes.length - 1 ? '1px solid rgba(0,0,0,.04)' : 'none' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', marginTop: 5, flexShrink: 0 }} />
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', marginRight: 6 }}>{f.category}</span>
                            <span style={{ fontSize: 13, color: '#52525b', lineHeight: 1.5 }}>{f.text}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                    Rule-based checks flag common issues. AI-powered analysis coming soon.
                  </div>
                </div>
              )
            })()}
          </div>
        )}

      </div>
    </div>

    {showPreview && (
      <PreviewModal
        questions={questions}
        selectedId={editingQId}
        branding={branding}
        surveyTitle={survey.title}
        onClose={() => setShowPreview(false)}
      />
    )}

    {/* ── End screen editor ── */}
    {endScreen && (() => {
      const isThankYou = endScreen === 'thankyou'
      const accent  = isThankYou ? '#16a34a' : '#d97706'
      const soft    = isThankYou ? '#f0fdf4' : '#fffbeb'
      const heading = isThankYou ? cfgThankYouHeading : cfgDisqualifiedHeading
      const setHeading = isThankYou ? setCfgThankYouHeading : setCfgDisqualifiedHeading
      const body    = isThankYou ? cfgThankYouText : cfgScreenOutMsg
      const setBody = isThankYou ? setCfgThankYouText : setCfgScreenOutMsg

      return (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(24,24,27,.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !endScreenSaving) setEndScreen(null) }}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 760, maxHeight: '88vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f4f4f5', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#18181b' }}>
                  {isThankYou ? 'Thank You Screen' : 'Disqualified Screen'}
                </div>
                <div style={{ fontSize: 12, color: '#71717a' }}>
                  {isThankYou
                    ? 'Shown once a respondent finishes the survey.'
                    : 'Shown when a respondent is screened out by logic or a quota.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 0, overflow: 'hidden', flex: 1 }}>
              {/* Fields */}
              <div style={{ flex: 1, padding: '18px 24px', overflowY: 'auto', minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Heading</label>
                <input
                  autoFocus
                  value={heading}
                  onChange={e => setHeading(e.target.value)}
                  placeholder={isThankYou ? 'Thank you!' : 'You do not qualify'}
                  style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 16 }}
                />

                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Message</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={4}
                  style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', resize: 'vertical', marginBottom: 16 }}
                />

                {isThankYou && (
                  <>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Redirect URL <span style={{ fontWeight: 400, color: '#a1a1aa' }}>— optional</span></label>
                    <input
                      value={cfgRedirectUrl}
                      onChange={e => setCfgRedirectUrl(e.target.value)}
                      placeholder="https://yoursite.com/thanks"
                      style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', marginBottom: 12 }}
                    />
                    {cfgRedirectUrl && (
                      <>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#52525b', marginBottom: 6 }}>Redirect after</label>
                        <select
                          value={cfgRedirectDelay}
                          onChange={e => setCfgRedirectDelay(e.target.value)}
                          style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: '#fff' }}
                        >
                          <option value="0">Immediately</option>
                          <option value="3">3 seconds</option>
                          <option value="5">5 seconds</option>
                          <option value="10">10 seconds</option>
                        </select>
                        <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 6 }}>
                          The message above shows for this long before the redirect fires.
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Live preview */}
              <div style={{ width: 300, flexShrink: 0, borderLeft: '1px solid #f4f4f5', background: '#fafafa', padding: '18px 20px', overflowY: 'auto' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Preview</div>
                <div style={{ background: '#fff', border: '1.5px solid #e4e4e7', borderRadius: 12, padding: '28px 20px', textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: soft, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, margin: '0 auto 14px' }}>
                    {isThankYou ? '✓' : '!'}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#18181b', marginBottom: 7, wordBreak: 'break-word' }}>
                    {heading || (isThankYou ? 'Thank you!' : 'You do not qualify')}
                  </div>
                  <div style={{ fontSize: 12.5, color: '#71717a', lineHeight: 1.5, wordBreak: 'break-word' }}>
                    {body || 'Your message appears here.'}
                  </div>
                  {isThankYou && cfgRedirectUrl && (
                    <div style={{ fontSize: 11, color: '#a1a1aa', marginTop: 14, paddingTop: 12, borderTop: '1px solid #f4f4f5' }}>
                      {cfgRedirectDelay === '0'
                        ? 'Redirecting…'
                        : `Redirecting in ${cfgRedirectDelay} seconds…`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: '13px 24px', borderTop: '1px solid #f4f4f5', background: '#fafafa', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn ghost" onClick={() => setEndScreen(null)} disabled={endScreenSaving}>Cancel</button>
              <button
                className="btn"
                disabled={endScreenSaving}
                style={{ background: accent, minWidth: 120 }}
                onClick={async () => {
                  setEndScreenSaving(true)
                  await updateSurvey(id, {
                    settings: buildSettings(),
                    close_date: closeDate || null,
                    response_limit: responseLimit ? parseInt(responseLimit) : null,
                  })
                  setEndScreenSaving(false)
                  setEndScreen(null)
                }}
              >
                {endScreenSaving ? <><span className="spinner" />Saving…</> : 'Save screen'}
              </button>
            </div>
          </div>
        </div>
      )
    })()}
    </>
  )
}

// ── Share Tab ────────────────────────────────────────────────────────────────

function ShareTab({ surveyId, surveyTitle, status, onPublish }: {
  surveyId: string; surveyTitle: string; status: string; onPublish: () => void
}) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { setOrigin(window.location.origin) }, [])

  const respondUrl = `${origin}/surveys/${surveyId}/respond`
  const embedCode  = `<iframe src="${respondUrl}" width="100%" height="680" frameborder="0" allow="clipboard-write"></iframe>`
  const mailtoLink = `mailto:?subject=${encodeURIComponent(`Please take our survey: ${surveyTitle}`)}&body=${encodeURIComponent(`Hi,\n\nWe'd love your feedback. Please take a few minutes to fill out our survey:\n\n${respondUrl}\n\nThank you!`)}`

  const copy = (text: string, key: string) => {
    const fallback = () => {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    try {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(fallback)
      else fallback()
    } catch { fallback() }
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const isLive = status === 'active'

  return (
    <div style={{ padding: 28 }}>
      <h2 style={{ fontFamily: "'Schibsted Grotesk', system-ui", fontWeight: 800, fontSize: 18, margin: '0 0 4px', color: '#18181b' }}>Share & Distribute</h2>
      <div style={{ fontSize: 13, color: '#71717a', marginBottom: 24 }}>
        {isLive ? 'Your survey is live — share the link below to start collecting responses.' : 'Publish your survey first to enable distribution.'}
      </div>

      {!isLive && (
        <button className="btn" onClick={onPublish} style={{ marginBottom: 24, fontSize: 13 }}>
          Publish Survey to Enable Sharing →
        </button>
      )}

      <ShareSection title="🔗 Shareable link" desc="Send this URL directly to respondents.">
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={isLive ? respondUrl : '— publish first —'}
            style={{ flex: 1, border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontFamily: 'monospace', background: isLive ? 'white' : '#f9f9fa', color: isLive ? '#18181b' : '#a1a1aa', outline: 'none' }}
            onFocus={e => e.target.select()} />
          <button className="btn secondary" disabled={!isLive} onClick={() => copy(respondUrl, 'link')} style={{ flexShrink: 0, fontSize: 13 }}>
            {copied === 'link' ? '✓ Copied!' : 'Copy Link'}
          </button>
          {isLive && (
            <a href={respondUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: 10, border: '1.5px solid #e4e4e7', background: 'white', color: '#18181b', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Open ↗
            </a>
          )}
        </div>
      </ShareSection>

      <ShareSection title="</> Embed on your site" desc="Paste this into any webpage to embed the survey inline.">
        <textarea readOnly value={isLive ? embedCode : '— publish first —'} rows={3}
          style={{ width: '100%', border: '1.5px solid #e4e4e7', borderRadius: 10, padding: '10px 12px', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', background: isLive ? 'white' : '#f9f9fa', color: isLive ? '#18181b' : '#a1a1aa', outline: 'none' }}
          onFocus={e => e.target.select()} />
        <button className="btn secondary" disabled={!isLive} onClick={() => copy(embedCode, 'embed')} style={{ marginTop: 8, fontSize: 13 }}>
          {copied === 'embed' ? '✓ Copied!' : 'Copy Embed Code'}
        </button>
      </ShareSection>

      <ShareSection title="✉️ Email invite" desc="Opens your email client with the survey link pre-filled.">
        <a href={isLive ? mailtoLink : '#'}
          style={{ display: 'inline-flex', alignItems: 'center', padding: '10px 18px', borderRadius: 10, border: '1.5px solid #db2777', color: isLive ? '#db2777' : '#a1a1aa', fontWeight: 600, fontSize: 13, textDecoration: 'none', background: 'white', pointerEvents: isLive ? 'auto' : 'none', opacity: isLive ? 1 : 0.5 }}>
          Open Email Client
        </a>
      </ShareSection>

      <ShareSection title="📱 QR Code" desc="Download or screenshot for print materials, slides, or events.">
        {isLive ? (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(respondUrl)}`}
              alt="Survey QR Code" width={140} height={140}
              style={{ border: '1.5px solid #e4e4e7', borderRadius: 10, padding: 6, background: 'white' }} />
            <div>
              <div style={{ fontSize: 13, color: '#71717a', marginBottom: 10 }}>Right-click the QR code to save it, or screenshot it for use in presentations and print materials.</div>
              <div style={{ fontSize: 12, color: '#71717a', fontFamily: 'monospace', wordBreak: 'break-all', background: '#f9f9fa', padding: '6px 10px', borderRadius: 8 }}>{respondUrl}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#a1a1aa' }}>Publish the survey to generate a QR code.</div>
        )}
      </ShareSection>
    </div>
  )
}

function ShareSection({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid rgba(219,39,119,.06)', paddingBottom: 22, marginBottom: 22 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#18181b', marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#71717a', marginBottom: 12 }}>{desc}</div>
      {children}
    </div>
  )
}
