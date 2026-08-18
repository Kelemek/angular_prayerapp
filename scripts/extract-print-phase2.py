#!/usr/bin/env python3
"""Extract print.service HTML generators into lib modules (phase 2)."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SERVICE = ROOT / "src/app/services/print.service.ts"
lines = SERVICE.read_text().splitlines()

def slice_lines(start: int, end: int) -> list[str]:
    return lines[start - 1 : end]

def deindent_class_body(chunk: list[str], spaces: int = 4) -> list[str]:
    prefix = " " * spaces
    out = []
    for line in chunk:
        if line.startswith(prefix):
            out.append(line[spaces:])
        elif line.strip() == "":
            out.append("")
        else:
            out.append(line)
    return out

def join_body(chunk: list[str]) -> str:
    return "\n".join(deindent_class_body(chunk)).strip()

def write_lib(rel: str, content: str) -> None:
    path = ROOT / rel
    path.write_text(content.rstrip() + "\n")
    print(f"  wrote {rel} ({len(content.splitlines())} lines)")

def replace_list_html(body: str) -> str:
    return (
        body.replace("this.generatePrayerHTML", "buildPrintPrayerCardHtml")
        .replace("this.resolveInfoQrImageSrc()", "infoQrImageSrc")
        .replace("this.generatePersonalPrayerHTML", "buildPrintPersonalPrayerCardHtml")
        .replace("this.getCategoryColor", "getPrintCategoryColor")
        .replace("this.generatePromptHTML", "buildPrintPromptCardHtml")
    )

def replace_booklet_html(body: str) -> str:
    return (
        body.replace("this.getBookletSortedFirstUpdateMarkdown", "getBookletSortedFirstUpdateMarkdown")
        .replace("this.getBookletDescriptionSegmentMaxChars", "getBookletDescriptionSegmentMaxChars")
        .replace("this.splitBookletMarkdownIntoPanelParts", "splitBookletMarkdownIntoPanelParts")
        .replace("this.generatePrayerHTML", "buildPrintPrayerCardHtml")
        .replace("this.estimateBookletUnitWeight", "estimateBookletUnitWeight")
        .replace("this.packBookletUnitsIntoPageChunks", "packBookletUnitsIntoPageChunks")
        .replace("this.buildBookletInsertPageHtml", "buildBookletInsertPageHtml")
        .replace("this.buildBookletPromptBatchHtml", "buildBookletPromptBatchHtml")
        .replace("this.resolveInfoQrImageSrc()", "infoQrImageSrc")
        .replace("this.buildBookletFrontQrFooterHtml", "buildPrintBookletFrontQrFooterHtml")
        .replace("this.getBookletAppIconUrl()", "appIconUrl")
        .replace("this.getBookletNotesHeadingHtml()", "getPrintBookletNotesHeadingHtml()")
        .replace("this.encodeUtf8Base64", "encodePrintUtf8Base64")
    )

# --- Small utilities ---
write_lib(
    "src/app/lib/print-render-markdown.ts",
    """import { markdownToSafeHtml } from '../../utils/markdown';

/** Render markdown to sanitized HTML for printable pages. */
export function renderPrintMarkdown(text: string | null | undefined): string {
  return markdownToSafeHtml(text || '');
}
""",
)

write_lib(
    "src/app/lib/print-category-colors.ts",
    f"""/** Section heading color for personal prayer categories in printable HTML. */
export function getPrintCategoryColor(category: string): string {{
{join_body(slice_lines(2755, 2782))}
}}
""",
)

write_lib(
    "src/app/lib/print-asset-url.ts",
    f"""/** Ensure print HTML can load images (absolute http(s) or same-origin path). */
export function resolvePrintAssetUrl(url: string): string {{
{join_body(slice_lines(910, 922))}
}}

/** PWA app icon for booklet cover. */
export function getPrintBookletAppIconUrl(): string {{
  return resolvePrintAssetUrl('/icons/icon-512.png');
}}
""",
)

write_lib(
    "src/app/lib/print-booklet-chrome.ts",
    f"""import {{ escapeHtmlForPrint }} from './print-html';

export function getPrintBookletNotesHeadingHtml(): string {{
{join_body(slice_lines(925, 935))}
}}

export function buildPrintBookletFrontQrFooterHtml(qrSrc: string): string {{
{join_body(slice_lines(477, 491))}
}}

export function buildBookletInsertPageHtml(dataUrl: string): string {{
  const src = escapeHtmlForPrint(dataUrl.trim());
  return `<div class="booklet-insert-page"><img class="booklet-insert-img" src="${{src}}" alt="" loading="eager" decoding="sync" /></div>`;
}}
""",
)

prayer_card = join_body(slice_lines(1827, 1954)).replace("this.renderMarkdown", "renderPrintMarkdown")
write_lib(
    "src/app/lib/print-prayer-card-html.ts",
    f"""import type {{ Prayer }} from './print-types';
import {{ escapeHtmlForPrint }} from './print-html';
import {{ renderPrintMarkdown }} from './print-render-markdown';

export type PrintPrayerBookletSlice = {{
  descriptionMarkdown: string;
  partIndex: number;
  partCount: number;
  includeUpdates: boolean;
}};

export function buildPrintPrayerCardHtml(
  prayer: Prayer,
  compactBooklet = false,
  bookletSlice?: PrintPrayerBookletSlice,
): string {{
{prayer_card}
}}
""",
)

write_lib(
    "src/app/lib/print-prompt-card-html.ts",
    f"""import {{ escapeHtmlForPrint }} from './print-html';

export function buildPrintPromptCardHtml(prompt: {{ title: string }}): string {{
{join_body(slice_lines(2736, 2742))}
}}
""",
)

personal_card = join_body(slice_lines(2512, 2561)).replace("this.renderMarkdown", "renderPrintMarkdown")
write_lib(
    "src/app/lib/print-personal-prayer-card-html.ts",
    f"""import {{ escapeHtmlForPrint }} from './print-html';
import {{ renderPrintMarkdown }} from './print-render-markdown';

export function buildPrintPersonalPrayerCardHtml(prayer: {{
  status: string;
  title: string;
  created_at: string;
  description?: string;
  updates?: Array<{{ created_at: string; content: string }}>;
}}): string {{
{personal_card}
}}
""",
)

pack_header = """import {
  PRINT_BOOKLET_CARD_FRAME_CHARS,
  PRINT_BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS,
  PRINT_BOOKLET_MARKDOWN_CHARS_PER_PANEL,
  PRINT_BOOKLET_MARKDOWN_LIST_LINE_PREMIUM,
  PRINT_BOOKLET_MARKDOWN_TO_HTML_WEIGHT,
  PRINT_BOOKLET_MAX_UNITS_PER_PANEL_CHUNK,
  PRINT_BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM,
  PRINT_BOOKLET_UPDATES_MARKDOWN_FACTOR,
} from './print-booklet-constants';
import type { BookletPackUnit, Prayer } from './print-types';

"""

def pack_fn(name: str, sig: str, start: int, end: int, doc: str = "") -> str:
    body = join_body(slice_lines(start, end))
    body = body.replace("this.estimateBookletCompactUpdatesBlockWeight", "estimateBookletCompactUpdatesBlockWeight")
    body = body.replace("this.partitionBookletUnitsIntoChunks", "partitionBookletUnitsIntoChunks")
    doc_line = f"{doc}\n" if doc else ""
    return f"{doc_line}export function {name}{sig} {{\n{body}\n}}\n\n"

pack_body = pack_header + pack_fn(
    "encodePrintUtf8Base64",
    "(raw: string): string",
    1629,
    1638,
    "/** UTF-8 JSON payload for inlined booklet layout script. */",
) + pack_fn(
    "getBookletSortedFirstUpdateMarkdown",
    "(prayer: Prayer): string | null",
    1643,
    1653,
) + pack_fn(
    "estimateBookletCompactUpdatesBlockWeight",
    "(updateMarkdown: string): number",
    1675,
    1694,
) + pack_fn(
    "getBookletDescriptionSegmentMaxChars",
    "(firstUpdateMarkdown: string | null): number",
    1659,
    1669,
) + pack_fn(
    "estimateBookletUnitWeight",
    "(descriptionMarkdown: string, compactUpdatesMarkdown: string | null): number",
    1700,
    1717,
) + pack_fn(
    "partitionBookletUnitsIntoChunks",
    "(units: { html: string; weight: number }[], panelBudget: number, sectionH2Reserve: number, bottomMarginSlack: number): BookletPackUnit[][]",
    330,
    370,
) + pack_fn(
    "packBookletUnitsIntoPageChunks",
    "(units: { html: string; weight: number }[], sectionH2: string, panelBudget: number, sectionH2Reserve: number, bottomMarginSlack: number): string[]",
    1723,
    1750,
) + pack_fn(
    "splitBookletMarkdownIntoPanelParts",
    "(markdown: string, maxChars: number): string[]",
    1758,
    1797,
) + pack_fn(
    "hardSplitBookletMarkdown",
    "(text: string, maxChars: number): string[]",
    1798,
    1826,
)
write_lib("src/app/lib/print-booklet-pack.ts", pack_body)

batch_body = join_body(slice_lines(313, 325)).replace("this.generatePromptHTML", "buildPrintPromptCardHtml")
write_lib(
    "src/app/lib/print-booklet-prompt-batch.ts",
    f"""import {{ escapeHtmlForPrint }} from './print-html';
import {{ splitPromptsIntoTwoColumnsRowMajor }} from './print-prompt-layout';
import {{ buildPrintPromptCardHtml }} from './print-prompt-card-html';

export function buildBookletPromptBatchHtml(
  typeName: string,
  batchPrompts: Array<{{ title: string }}>,
  opts: {{ continued: boolean; totalCountInType: number }},
): string {{
{batch_body}
}}
""",
)

prayer_list_body = replace_list_html(join_body(slice_lines(496, 885)))
write_lib(
    "src/app/lib/print-prayer-list-html.ts",
    f"""import {{ buildPrintInfoFooterHtml, getPrintInfoFooterStyles }} from './print-info-footer';
import {{ escapeHtmlForPrint }} from './print-html';
import {{ buildPrintPrayerCardHtml }} from './print-prayer-card-html';
import {{ setPrintStartDateForTimeRange }} from './print-time-range';
import type {{ Prayer, TimeRange }} from './print-types';

export function buildPrintPrayerListDocumentHtml(
  prayers: Prayer[],
  timeRange: TimeRange = 'month',
  infoQrImageSrc: string,
): string {{
{prayer_list_body}
}}
""",
)

prompt_list_body = replace_list_html(join_body(slice_lines(2566, 2731)))
write_lib(
    "src/app/lib/print-prompt-list-html.ts",
    f"""import {{ buildPrintInfoFooterHtml, getPrintInfoFooterStyles }} from './print-info-footer';
import {{ escapeHtmlForPrint }} from './print-html';
import {{ buildPrintPromptCardHtml }} from './print-prompt-card-html';
import {{
  getPrintablePromptBlockStyles,
  getPrintPromptTypeColor,
  sortPromptsAlphabeticalByTitle,
  splitPromptsIntoTwoColumnsRowMajor,
}} from './print-prompt-layout';

export function buildPrintPromptListDocumentHtml(prompts: Array<{{ type: string; title: string }}>, infoQrImageSrc: string): string {{
{prompt_list_body}
}}
""",
)

personal_list_body = replace_list_html(join_body(slice_lines(2153, 2507)))
write_lib(
    "src/app/lib/print-personal-prayer-list-html.ts",
    f"""import {{ escapeHtmlForPrint }} from './print-html';
import {{ getPrintCategoryColor }} from './print-category-colors';
import {{ buildPrintPersonalPrayerCardHtml }} from './print-personal-prayer-card-html';

export function buildPrintPersonalPrayerListDocumentHtml(
  prayers: Array<{{ status: string; title: string; created_at: string; category?: string; description?: string; updates?: Array<{{ created_at: string; content: string }}> }}>,
  categories?: string[],
): string {{
{personal_list_body}
}}
""",
)

booklet_body = replace_booklet_html(join_body(slice_lines(940, 1626)))
write_lib(
    "src/app/lib/print-booklet-html.ts",
    f"""import {{ buildBookletMeasurePackScript }} from './booklet-measure-inline';
import {{
  PRINT_BOOKLET_PANEL_BOTTOM_SLACK,
  PRINT_BOOKLET_PANEL_PACK_BUDGET,
  PRINT_BOOKLET_SECTION_H2_RESERVE,
}} from './print-booklet-constants';
import {{ padToMultipleOfFourWithBackCoverLast, saddleStitchImpose }} from './print-booklet-imposition';
import {{
  buildBookletInsertPageHtml,
  buildPrintBookletFrontQrFooterHtml,
  getPrintBookletNotesHeadingHtml,
}} from './print-booklet-chrome';
import {{ buildBookletPromptBatchHtml }} from './print-booklet-prompt-batch';
import {{
  encodePrintUtf8Base64,
  estimateBookletUnitWeight,
  getBookletDescriptionSegmentMaxChars,
  getBookletSortedFirstUpdateMarkdown,
  packBookletUnitsIntoPageChunks,
  splitBookletMarkdownIntoPanelParts,
}} from './print-booklet-pack';
import {{ escapeHtmlForPrint }} from './print-html';
import {{ buildPrintPrayerCardHtml }} from './print-prayer-card-html';
import {{ estimateBookletPromptBatchWeight }} from './print-prompt-layout';
import {{ setPrintStartDateForTimeRange }} from './print-time-range';
import type {{ BookletInsertPage, BookletPackUnit, BookletTimeRange, Prayer }} from './print-types';
import {{ getPrintablePromptBlockStyles }} from './print-prompt-layout';

export function buildSaddleStitchBookletHtml(
  prayers: Prayer[],
  timeRange: BookletTimeRange,
  coverLogoUrl: string,
  embeddedQrDataUrl: string | null = null,
  embeddedAppIconDataUrl: string | null = null,
  embeddedBackLogoDataUrl: string | null = null,
  bookletPromptSections: Array<{{ typeName: string; prompts: Array<{{ title: string }}> }}> = [],
  bookletInsertPages: BookletInsertPage[] = [],
  infoQrImageSrc: string,
  appIconUrl: string,
): string {{
{booklet_body}
}}
""",
)

# Remove extracted ranges from service (1-based inclusive), keep branding helper
REMOVE_RANGES = [
    (313, 325),
    (330, 370),
    (440, 443),  # buildBookletInsertPageHtml body - keep method as delegate? remove entirely
    (477, 491),
    (496, 885),
    (906, 922),
    (925, 935),
    (940, 1826),
    (1827, 1954),
    (2153, 2782),
]

remove_set = set()
for start, end in REMOVE_RANGES:
    for i in range(start, end + 1):
        remove_set.add(i)

new_lines = []
for i, line in enumerate(lines, start=1):
    if i in remove_set:
        continue
    new_lines.append(line)

SERVICE.write_text("\n".join(new_lines) + "\n")
print(f"  slimmed print.service.ts to {len(new_lines)} lines")
