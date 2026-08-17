export interface PromptCsvRow {
  title: string;
  type: string;
  description: string;
  valid: boolean;
  error?: string;
}

export type PromptManagerRowAction =
  | { type: 'edit' }
  | { type: 'delete' };

export const PROMPT_SEARCH_MIN_CHARS = 2;
export const PROMPT_SEARCH_DEBOUNCE_MS = 350;

export function formatPromptDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export function formatPromptTypeNames(types: { name: string }[]): string {
  return types.map((t) => t.name).join(', ');
}

export function countValidPromptCsvRows(rows: PromptCsvRow[]): number {
  return rows.filter((r) => r.valid).length;
}

export function countInvalidPromptCsvRows(rows: PromptCsvRow[]): number {
  return rows.filter((r) => !r.valid).length;
}

export function parsePromptCsvText(
  text: string,
  validTypes: string[],
): { rows: PromptCsvRow[]; error?: string } {
  const lines = text.split('\n').filter((line) => line.trim());

  if (lines.length < 2) {
    return {
      rows: [],
      error: 'CSV file must have at least a header row and one data row',
    };
  }

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const titleIdx = headers.indexOf('title');
  const typeIdx = headers.indexOf('type');
  const descIdx = headers.indexOf('description');

  if (titleIdx === -1 || typeIdx === -1 || descIdx === -1) {
    return { rows: [], error: 'CSV must have columns: title, type, description' };
  }

  const rows: PromptCsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]
      .split(',')
      .map((v) => v.trim().replace(/^"|"$/g, ''));
    const title = values[titleIdx] || '';
    const type = values[typeIdx] || '';
    const description = values[descIdx] || '';

    let valid = true;
    let error = '';

    if (!title) {
      valid = false;
      error = 'Missing title';
    } else if (!type) {
      valid = false;
      error = 'Missing type';
    } else if (!validTypes.includes(type)) {
      valid = false;
      error = `Invalid type: ${type}`;
    } else if (!description) {
      valid = false;
      error = 'Missing description';
    }

    rows.push({ title, type, description, valid, error });
  }

  return { rows };
}
