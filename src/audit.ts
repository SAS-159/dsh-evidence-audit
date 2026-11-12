import type { ChatNode, ToolNode, Translate } from './dsh-runtime'

/** Path-looking tokens. */
const PATH_RE =
  /(?:[A-Za-z]:\\[^\s，。；、,;)）]+|(?:[\w.@+-]+\/)+[\w.@+-]+\.(?:tsx?|jsx?|mjs|cjs|json|md|ya?ml|css|html?|py|go|rs|java|sql|sh|ps1|toml|txt|svg|png))/g
/** A number carrying a unit, which is what makes it checkable. */
const UNIT_RE = /(?<![\w.])\d+(?:\.\d+)?\s?(?:%|ms|s|k|K|M|GB|MB|KB|个|次|行|条|项|万|亿)/g
/** A bare number long enough to be an identifier rather than a word. */
const LONG_NUM_RE = /(?<![\w.])\d{3,}(?![\w.])/g
/** Inline code spans. */
const CODE_RE = /`([^`\n]{2,60})`/g
/** Absolute URLs. */
const URL_RE = /https?:\/\/[^\s)）]+/g

export type ClaimStatus = 'ok' | 'partial' | 'none'

export interface Claim {
  text: string
  anchors: string[]
  missing: string[]
  status: ClaimStatus
}

export interface Audit {
  claims: Claim[]
  ok: number
  partial: number
  none: number
  score: number | null
  evidenceChars: number
  toolCalls: number
  messages: number
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '')
}

export function assistantText(node: ChatNode): string {
  return (node.blocks ?? [])
    .filter((block) => block.kind === 'text' && typeof block.text === 'string')
    .map((block) => (block.text as string).trim())
    .filter((text) => text !== '')
    .join('\n')
}

export function toolEvidence(root: ToolNode | undefined): string {
  if (root === undefined) return ''
  const parts: string[] = []
  if (typeof root.name === 'string') parts.push(root.name)
  if (typeof root.argsRaw === 'string') parts.push(root.argsRaw)
  for (const piece of root.content ?? []) {
    if (piece.type === 'text' && typeof piece.text === 'string') parts.push(piece.text)
  }
  return parts.join('\n')
}

export function collectAnchors(text: string): string[] {
  const found = new Set<string>()
  for (const match of text.matchAll(PATH_RE)) found.add(match[0])
  for (const match of text.matchAll(UNIT_RE)) found.add(match[0])
  for (const match of text.matchAll(LONG_NUM_RE)) found.add(match[0])
  for (const match of text.matchAll(URL_RE)) found.add(match[0])
  for (const match of text.matchAll(CODE_RE)) found.add(match[1])
  return [...found].filter((anchor) => anchor.trim().length > 1).slice(0, 8)
}

export function extractClaims(text: string, limit = 60): Array<{ text: string; anchors: string[] }> {
  const pieces = text
    .split(/\n{2,}|(?<=[。！？!?])\s*/u)
    .map((piece) => piece.replace(/^[#>*\-\s]+/, '').trim())
    .filter((piece) => piece.length >= 8 && piece.length <= 300)

  const claims: Array<{ text: string; anchors: string[] }> = []
  for (const piece of pieces) {
    const anchors = collectAnchors(piece)
    if (anchors.length === 0) continue
    claims.push({ text: piece, anchors })
    if (claims.length >= limit) break
  }
  return claims
}

export function buildAudit(nodes: readonly ChatNode[]): Audit {
  let corpus = ''
  let toolCalls = 0
  let messages = 0
  let answer = ''

  for (const node of nodes) {
    if (node.kind === 'assistant') {
      const text = assistantText(node)
      if (text !== '') {
        messages += 1
        answer = text
      }
    } else if (node.kind === 'tool-call') {
      toolCalls += 1
      corpus += '\n' + toolEvidence(node.data?.root)
    }
  }

  const haystack = normalize(corpus)
  const numberPart = (anchor: string): string | null => {
    const digits = /\d+(?:\.\d+)?/.exec(anchor)
    return digits === null ? null : digits[0]
  }

  const claims: Claim[] = extractClaims(answer).map((claim) => {
    const missing = claim.anchors.filter((anchor) => !haystack.includes(normalize(anchor)))
    // A number that appears without the claimed unit still points at evidence,
    // just not at the same measurement — call that partial, never "no evidence".
    const soft = missing.some((anchor) => {
      const number = numberPart(anchor)
      return number !== null && number.length >= 2 && haystack.includes(number)
    })
    const status: ClaimStatus =
      missing.length === 0 ? 'ok' : missing.length === claim.anchors.length && !soft ? 'none' : 'partial'
    return { text: claim.text, anchors: claim.anchors, missing, status }
  })

  const ok = claims.filter((claim) => claim.status === 'ok').length
  const none = claims.filter((claim) => claim.status === 'none').length
  const partial = claims.length - ok - none

  return {
    claims,
    ok,
    partial,
    none,
    score: claims.length === 0 ? null : Math.round((ok / claims.length) * 100),
    evidenceChars: corpus.length,
    toolCalls,
    messages,
  }
}

export function buildReport(audit: Audit, t: Translate): string {
  const lines: string[] = []
  lines.push(`# ${t('title')}`)
  lines.push('')
  lines.push(
    t('summaryLine', {
      score: audit.score === null ? '—' : `${audit.score}%`,
      ok: audit.ok,
      partial: audit.partial,
      none: audit.none,
      chars: audit.evidenceChars.toLocaleString(),
      tools: audit.toolCalls,
    }),
  )
  lines.push('')
  const groups: Array<[ClaimStatus, string]> = [
    ['none', t('groupNone')],
    ['partial', t('groupPartial')],
    ['ok', t('groupOk')],
  ]
  for (const [status, label] of groups) {
    const claims = audit.claims.filter((claim) => claim.status === status)
    if (claims.length === 0) continue
    lines.push(`## ${label} (${claims.length})`)
    lines.push('')
    for (const claim of claims) {
      lines.push(`- ${claim.text}`)
      if (claim.missing.length > 0) lines.push(`  - ${t('missing')}: ${claim.missing.map((anchor) => `\`${anchor}\``).join(', ')}`)
    }
    lines.push('')
  }
  lines.push('---')
  lines.push(t('footer'))
  return lines.join('\n')
}
