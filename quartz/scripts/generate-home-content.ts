#!/usr/bin/env node
/**
 * Build-time (Node-only) generator for the two data-derived sections of
 * content/index.md: "현재 아카이빙 현황" (archive stats) and "최근 업데이트"
 * (recent updates). Nothing here runs in the browser -- it scans
 * content/*.md ONCE on this machine and writes plain static Markdown back
 * into content/index.md between marker comments, before `npx quartz build`
 * ever runs. The homepage itself ships zero client-side aggregation code.
 *
 * Run before every build:
 *   npx tsx quartz/scripts/generate-home-content.ts
 *   npx quartz build
 *
 * Counting basis (confirmed against the actual content/ tree, not assumed):
 *   - 예술가/단체/작품/공연/공연장 = *.md count directly under the matching
 *     top-level content folder (01 Artists .. 05 Venues).
 *   - 기사 = *.md count under "06 Editorial" (1 file per source article --
 *     editorial_contents is 1:1 with source_articles upstream).
 *   - AI 분석 완료 = of those, how many have a `content_type` frontmatter
 *     value other than "unknown" (i.e. actually classified by the v2 AI
 *     pipeline, not just a placeholder row).
 *   - 마지막 업데이트 = the most recent mtime among all counted content
 *     files (index.md itself is excluded, since editing the homepage isn't
 *     a data update).
 *   - 최근 업데이트 = content files grouped by the local calendar date of
 *     their mtime, for the most recent dates that exist (up to 5). Labeled
 *     "갱신" (updated), not "추가" (added) -- file birthtime was checked
 *     and found to collapse to the same dates as mtime on this filesystem
 *     after a re-export, so there is no reliable signal here to claim an
 *     item is literally new vs. re-written, and this script does not
 *     fabricate that distinction.
 */
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, "..", "..")
const CONTENT_DIR = path.join(ROOT, "content")
const INDEX_PATH = path.join(CONTENT_DIR, "index.md")

interface FolderSpec {
  folder: string
  label: string
  unit: string
}

// Order matches the display order requested for "현재 아카이빙 현황".
const STAT_FOLDERS: FolderSpec[] = [
  { folder: "01 Artists", label: "예술가", unit: "명" },
  { folder: "02 Companies", label: "단체", unit: "개" },
  { folder: "03 Works", label: "작품", unit: "개" },
  { folder: "04 Performances", label: "공연", unit: "건" },
  { folder: "05 Venues", label: "공연장", unit: "곳" },
  { folder: "06 Editorial", label: "기사", unit: "건" },
]

const EDITORIAL_FOLDER = "06 Editorial"

function listMarkdownFiles(folder: string): string[] {
  const dir = path.join(CONTENT_DIR, folder)
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(dir, f))
}

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR")
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}.${m}.${day}`
}

function formatShortDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${m}.${day}`
}

function localDateKey(mtimeMs: number): string {
  const d = new Date(mtimeMs)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Extracts a single frontmatter scalar value, e.g. `content_type: "review"` -> "review". */
function readFrontmatterField(filePath: string, field: string): string | null {
  const text = fs.readFileSync(filePath, "utf-8")
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return null
  const line = fmMatch[1]
    .split("\n")
    .find((l) => l.startsWith(`${field}:`))
  if (!line) return null
  return line
    .slice(field.length + 1)
    .trim()
    .replace(/^"(.*)"$/, "$1")
}

function buildStatsSection(): string {
  const lines: string[] = []
  let editorialFiles: string[] = []
  let lastUpdatedMs = 0

  for (const spec of STAT_FOLDERS) {
    const files = listMarkdownFiles(spec.folder)
    if (spec.folder === EDITORIAL_FOLDER) editorialFiles = files
    for (const f of files) {
      const mtime = fs.statSync(f).mtimeMs
      if (mtime > lastUpdatedMs) lastUpdatedMs = mtime
    }
    lines.push(`| ${spec.label} | ${formatNumber(files.length)}${spec.unit} |`)
  }

  const aiDone = editorialFiles.filter((f) => {
    const contentType = readFrontmatterField(f, "content_type")
    return contentType !== null && contentType !== "unknown"
  }).length
  lines.push(`| AI 분석 완료 | ${formatNumber(aiDone)}건 |`)

  const lastUpdated = lastUpdatedMs > 0 ? formatDate(new Date(lastUpdatedMs)) : "집계 준비 중"
  lines.push(`| 마지막 업데이트 | ${lastUpdated} |`)

  return ["| 항목 | 수치 |", "|---|---|", ...lines].join("\n")
}

function buildUpdatesSection(): string {
  const byDate = new Map<string, Map<string, number>>() // dateKey -> label -> count
  const dateLabelToDate = new Map<string, Date>()
  const labelToUnit = new Map(STAT_FOLDERS.map((s) => [s.label, s.unit]))

  for (const spec of STAT_FOLDERS) {
    for (const f of listMarkdownFiles(spec.folder)) {
      const mtimeMs = fs.statSync(f).mtimeMs
      const key = localDateKey(mtimeMs)
      dateLabelToDate.set(key, new Date(mtimeMs))
      if (!byDate.has(key)) byDate.set(key, new Map())
      const perLabel = byDate.get(key)!
      perLabel.set(spec.label, (perLabel.get(spec.label) ?? 0) + 1)
    }
  }

  const sortedDateKeys = [...byDate.keys()].sort(
    (a, b) => dateLabelToDate.get(b)!.getTime() - dateLabelToDate.get(a)!.getTime(),
  )

  if (sortedDateKeys.length === 0) {
    return "업데이트 기록 준비 중"
  }

  const recentKeys = sortedDateKeys.slice(0, 5)
  const blocks: string[] = []
  for (const key of recentKeys) {
    const date = dateLabelToDate.get(key)!
    const perLabel = byDate.get(key)!
    const sortedLabels = [...perLabel.entries()].sort((a, b) => b[1] - a[1])
    const bulletLines = sortedLabels.map(
      ([label, count]) => `- ${label} ${formatNumber(count)}${labelToUnit.get(label) ?? "건"} 갱신`,
    )
    blocks.push([`**${formatShortDate(date)}**`, ...bulletLines].join("\n"))
  }

  return blocks.join("\n\n")
}

function replaceMarkedSection(content: string, marker: string, body: string): string {
  const re = new RegExp(`(<!-- ${marker}:START -->)[\\s\\S]*?(<!-- ${marker}:END -->)`)
  if (!re.test(content)) {
    throw new Error(`Marker block "${marker}" not found in ${INDEX_PATH}`)
  }
  return content.replace(re, `$1\n${body}\n$2`)
}

function main() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error(`[generate-home-content] ${INDEX_PATH} 없음`)
    process.exit(1)
  }

  let content = fs.readFileSync(INDEX_PATH, "utf-8")
  content = replaceMarkedSection(content, "STATS", buildStatsSection())
  content = replaceMarkedSection(content, "UPDATES", buildUpdatesSection())
  fs.writeFileSync(INDEX_PATH, content, "utf-8")

  console.log("[generate-home-content] content/index.md 통계/업데이트 섹션 갱신 완료")
}

main()
