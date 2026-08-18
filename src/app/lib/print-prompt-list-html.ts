import { buildPrintInfoFooterHtml, getPrintInfoFooterStyles } from './print-info-footer';
import { escapeHtmlForPrint } from './print-html';
import { buildPrintPromptCardHtml } from './print-prompt-card-html';
import {
  getPrintablePromptBlockStyles,
  getPrintPromptTypeColor,
  sortPromptsAlphabeticalByTitle,
  splitPromptsIntoTwoColumnsRowMajor,
} from './print-prompt-layout';

export function buildPrintPromptListDocumentHtml(prompts: Array<{ type: string; title: string }>, infoQrImageSrc: string): string {
const now = new Date();
const today = now.toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
});

const currentTime = now.toLocaleTimeString('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

// Group prompts by type
const promptsByType: { [key: string]: any[] } = {};

prompts.forEach(prompt => {
  if (!promptsByType[prompt.type]) {
    promptsByType[prompt.type] = [];
  }
  promptsByType[prompt.type].push(prompt);
});

// Get types in the order they appear in the already-sorted prompts array
const sortedTypes: string[] = [];
prompts.forEach(prompt => {
  if (!sortedTypes.includes(prompt.type)) {
    sortedTypes.push(prompt.type);
  }
});

let promptSectionsHTML = '';

sortedTypes.forEach(type => {
  const typePrompts = sortPromptsAlphabeticalByTitle(promptsByType[type]);
  const color = getPrintPromptTypeColor(type);

  const { col1, col2 } = splitPromptsIntoTwoColumnsRowMajor(typePrompts);

  const col1HTML = col1.map((prompt: any) => buildPrintPromptCardHtml(prompt)).join('');
  const col2HTML = col2.map((prompt: any) => buildPrintPromptCardHtml(prompt)).join('');

  promptSectionsHTML += `
    <div class="type-section">
      <h2 style="color: ${color}; border-bottom: 2px solid ${color}; padding-bottom: 2px; margin-bottom: 2px; margin-top: 4px; font-size: 14px;">
        ${escapeHtmlForPrint(type)} Prompts (${typePrompts.length})
      </h2>
      <div class="columns">
        <div class="col">${col1HTML}</div>
        <div class="col">${col2HTML}</div>
      </div>
    </div>
  `;
});

return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prayer Prompts - ${today}</title>
  <style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  line-height: 1.3;
  color: #222;
  background: white;
  padding: 8px;
  max-width: 1000px;
  margin: 0 auto;
  font-size: 12px;
}

.header {
  margin-bottom: 4px;
  padding-bottom: 3px;
  border-bottom: 2px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.header-right {
  font-size: 12px;
  color: #6b7280;
  white-space: nowrap;
}

.header h1 {
  font-size: 16px;
  color: #1f2937;
  margin: 0;
}

${getPrintablePromptBlockStyles({ includeStandaloneResponsive: true })}
${getPrintInfoFooterStyles()}

@media screen and (max-width: 768px) {
  body {
    padding: 15px;
    font-size: 16px;
  }

  .header h1 {
    font-size: 24px;
  }
}

@media print {
  body {
    padding: 15px;
  }

  .no-print {
    display: none !important;
  }

  .print-info-footer {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}

@page {
  margin: 0.5in;
}
  </style>
</head>
<body>
  <div class="header">
<div class="header-left">
  <h1>🙏 Prayer Prompts</h1>
</div>
<div class="header-right">
  Generated: ${today} at ${currentTime}
</div>
  </div>
  ${promptSectionsHTML}
  ${buildPrintInfoFooterHtml(infoQrImageSrc)}

  <script>
window.onload = function() {
  window.print();
};
  </script>
</body>
</html>
`.trim();
}
