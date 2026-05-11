import type { Asset, GenerateMemoirPayload, Memoir, Theme, Tone } from './types.ts'

type CreateMemoirDraftInput = {
  assets: Asset[]
  tone: Tone
  theme: Theme
  notes: string
  musicCue: string
  payload: GenerateMemoirPayload
}

export type SectionField = 'caption' | 'body'

function nowIso() {
  return new Date().toISOString()
}

export function createMemoirDraft({ assets, tone, theme, notes, musicCue, payload }: CreateMemoirDraftInput): Memoir {
  const timestamp = nowIso()

  return {
    id: crypto.randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
    title: payload.title,
    summary: payload.summary,
    quote: payload.quote,
    tone,
    theme,
    notes,
    musicCue,
    assets,
    sections: payload.sections,
    diagnostics: payload.diagnostics,
  }
}

export function updateMemoir(memoir: Memoir, patch: Partial<Memoir>): Memoir {
  return {
    ...memoir,
    ...patch,
    updatedAt: nowIso(),
  }
}

export function updateMemoirSection(memoir: Memoir, sectionId: string, field: SectionField, value: string): Memoir {
  const hasTarget = memoir.sections.some((section) => section.id === sectionId)
  if (!hasTarget) {
    return memoir
  }

  return updateMemoir(memoir, {
    sections: memoir.sections.map((section) =>
      section.id === sectionId ? { ...section, [field]: value } : section,
    ),
  })
}

export function moveMemoirSection(memoir: Memoir, sectionId: string, direction: -1 | 1): Memoir {
  const index = memoir.sections.findIndex((section) => section.id === sectionId)
  const nextIndex = index + direction

  if (index < 0 || nextIndex < 0 || nextIndex >= memoir.sections.length) {
    return memoir
  }

  const sections = [...memoir.sections]
  const [target] = sections.splice(index, 1)

  if (!target) {
    return memoir
  }

  sections.splice(nextIndex, 0, target)
  return updateMemoir(memoir, { sections })
}

export function upsertMemoirInArchive(memoirs: Memoir[], memoir: Memoir): Memoir[] {
  return [memoir, ...memoirs.filter((current) => current.id !== memoir.id)]
}