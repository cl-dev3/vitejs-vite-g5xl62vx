import { buildAttachMarkers } from '../chart/attachMarkers'
import { buildGeometry } from '../chart/geometry'
import { computeProject } from '../domain/compute'
import type { Project } from '../domain/types'
import { ensureJapaneseFont, forgetJapaneseFont } from './fonts'
import { buildPartRenders } from './partRender'
import { fileBaseName } from './printText'

export type PdfState =
  | { status: 'idle' }
  | { status: 'working' }
  | { status: 'done'; blob: Blob; fileName: string; fontFamily: string }
  | { status: 'error'; message: string }

export async function exportPdf(
  project: Project,
): Promise<{ blob: Blob; fileName: string; fontFamily: string }> {
  try {
    const [pdfLib, docModule] = await Promise.all([
      import('@react-pdf/renderer'),
      import('./PatternDocument'),
    ])
    const PatternDocument = docModule.default

    const fontFamily = await ensureJapaneseFont(pdfLib.Font)
    const computed = computeProject(project.rows)
    const geometry = buildGeometry(project.rows)
    const parts = buildPartRenders(project)
    const markers = buildAttachMarkers(project, geometry)

    const blob = await pdfLib
      .pdf(
        <PatternDocument
          project={project}
          computed={computed}
          geometry={geometry}
          fontFamily={fontFamily}
          parts={parts}
          markers={markers}
        />,
      )
      .toBlob()

    return {
      blob,
      fileName: `${fileBaseName(project.meta.title, new Date())}.pdf`,
      fontFamily,
    }
  } catch (e) {
    forgetJapaneseFont()
    throw e
  }
}