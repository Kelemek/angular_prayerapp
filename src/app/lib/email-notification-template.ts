import type { EmailTemplate } from "./email-notification-types";

/** Apply `{{variableName}}` placeholders (optional inner whitespace). Missing keys become empty strings. */
export function applyEmailTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(placeholder, value || "");
  }
  return result;
}

export function stringifyEmailTemplateVariables(
  variables: Record<string, string | null | undefined>
): Record<string, string> {
  const stringified: Record<string, string> = {};
  for (const [key, value] of Object.entries(variables)) {
    stringified[key] =
      value !== null && value !== undefined ? String(value) : "";
  }
  return stringified;
}

export function renderEmailFromTemplate(
  template: EmailTemplate,
  textVariables: Record<string, string>,
  htmlVariables: Record<string, string> = textVariables
): { subject: string; body: string; html: string } {
  return {
    subject: applyEmailTemplateVariables(template.subject, textVariables),
    body: applyEmailTemplateVariables(template.text_body, textVariables),
    html: applyEmailTemplateVariables(template.html_body, htmlVariables),
  };
}
