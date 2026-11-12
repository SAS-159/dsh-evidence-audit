/**
 * The catalog entry for awesome-dsh-plugin, shared by both release paths.
 *
 * Category `session`: the plugin audits the session's own messages against the
 * tool output recorded in the same session. A hand-written `npm:` key is
 * rejected by their CI, so it is deliberately absent.
 */

export function buildEntry(owner, packageName) {
  const description = {
    en: 'Audits the latest answer against what the session’s own tool calls actually returned: every checkable sentence (paths, numbers with units, inline code, URLs) is graded supported, partial or no-evidence, with the anchors it could not find listed. Coverage shows on the composer pill; the report copies as Markdown.',
    zh: '把最后一条回答逐句对回本会话工具调用实际返回的内容：含路径、带单位数字、行内代码或 URL 的句子被判定为有据 / 部分有据 / 无据，并列出找不到的锚点。覆盖率直接显示在输入框胶囊上，报告可复制为 Markdown。',
  }
  const lines = [
    `url: https://github.com/${owner}/${packageName}`,
    `name: ${owner}/${packageName}`,
    'category: session',
    'description:',
    `  en: '${description.en}'`,
    `  zh: '${description.zh}'`,
    `icon: https://raw.githubusercontent.com/${owner}/${packageName}/main/assets/icon-180.png`,
    '',
  ]
  return lines.join('\n')
}

export function buildPullRequestBody(owner, packageName) {
  return [
    `Adds ${owner}/${packageName} to the **Sessions & Messages** category.`,
    '',
    '**What it does.** A composer-dock pill shows an evidence-coverage score for the latest answer, and opens a report that grades each checkable sentence as *supported*, *partial* or *no evidence*, listing the anchors (paths, numbers with units, inline code, URLs) that the session’s tool output never contained.',
    '',
    '**Why it is different.** The plugins around it make the agent stronger or prettier; this one makes its output checkable. It is a trust layer: it never re-runs the model, never calls an LLM, and makes no claim about correctness — only about whether the tools mentioned what the answer says.',
    '',
    '**Capabilities:** none. Client-only bundle — no filesystem, network, shell, environment, credentials or LLM access. It reads the Chat snapshot the page already holds and matches anchors with whitespace-insensitive, case-insensitive substring checks.',
    '',
    '**Manifest:** `package.json` declares `dsh.bundle.patch` with `cordis.patch.yml` at the root, plus `dsh.client` for the browser half. Installable with `dsh plugin --profile web add github:' + owner + '/' + packageName + '`.',
  ].join('\n')
}

export function entryFileName(owner, packageName) {
  return `${owner}__${packageName}.yml`
}
