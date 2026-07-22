import path from "node:path"
import fs from "node:fs/promises"
import { QuartzEmitterPlugin } from "../types"
import { FilePath, FullSlug, joinSegments } from "../../util/path"
import { BuildCtx } from "../../util/ctx"
import { ProcessedContent } from "../vfile"

// Minimal per-page record the Explorer sidebar needs to build its folder tree.
// Deliberately excludes body text/tags/links -- those live only in
// static/contentIndex.json, which only the search plugin should fetch.
export type ExplorerEntry = {
  slug: FullSlug
  title: string
  filePath: string
}

const write = async (ctx: BuildCtx, content: string): Promise<FilePath> => {
  const pathToPage = joinSegments(ctx.argv.output, "static/explorerIndex.json") as FilePath
  const dir = path.dirname(pathToPage)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(pathToPage, content)
  return pathToPage
}

const buildIndex = (content: ProcessedContent[]): Record<string, ExplorerEntry> => {
  const index: Record<string, ExplorerEntry> = {}
  for (const [, file] of content) {
    const data = (file.data as Record<string, unknown>) ?? {}
    if (data.unlisted === true) continue
    const slug = data.slug as FullSlug
    const frontmatter = (data.frontmatter as Record<string, unknown> | undefined) ?? {}
    index[slug] = {
      slug,
      title: (frontmatter.title as string) ?? "",
      filePath: (data.relativePath as string) ?? "",
    }
  }
  return index
}

export const ExplorerIndex: QuartzEmitterPlugin = () => ({
  name: "ExplorerIndex",
  emit: async (ctx, content) => [await write(ctx, JSON.stringify(buildIndex(content)))],
  partialEmit: async (ctx, content) => [await write(ctx, JSON.stringify(buildIndex(content)))],
})
