import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const componentCss = readFileSync(join(here, 'presentation.component.css'), 'utf8');
const template = readFileSync(join(here, 'presentation.component.html'), 'utf8');

const TALL_CARD_PX = 480;
const SHORT_CARD_PX = 140;

function ruleBody(source: string, selector: string): string {
  const start = source.indexOf(selector);
  expect(start, selector).toBeGreaterThan(-1);
  const open = source.indexOf('{', start);
  const close = source.indexOf('}', open);
  return source.slice(open + 1, close);
}

function declarations(source: string, selector: string): string[] {
  return ruleBody(source, selector)
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function classAttribute(html: string, token: string): string {
  const match = new RegExp(`class="([^"]*\\b${token}\\b[^"]*)"`).exec(html);
  expect(match?.[1], token).toBeTruthy();
  return match?.[1] ?? '';
}

function shortIncomingCenterJumpPx(
  stage: string[],
  layer: string[],
  scrollClass: string,
  outgoingHeight: number,
  incomingHeight: number,
): number {
  const stageAlign = stage.find((declaration) => declaration.startsWith('align-items:'));
  const layerAlign = layer.find((declaration) => declaration.startsWith('align-self:'));
  const layerHeight = layer.find((declaration) => declaration.startsWith('height:'));
  const eachCardKeepsItsOwnHeight =
    stageAlign === 'align-items: center' &&
    layerAlign !== 'align-self: stretch' &&
    layerHeight !== 'height: 100%' &&
    /\bplace-items-center\b/.test(scrollClass);
  if (eachCardKeepsItsOwnHeight) return 0;
  return (Math.max(outgoingHeight, incomingHeight) - Math.min(outgoingHeight, incomingHeight)) / 2;
}

describe('presentation card slide vertical centering', () => {
  it('keeps a shorter incoming card centered instead of jumping out of the taller card box', () => {
    const stage = declarations(componentCss, '.presentation-card-stage {');
    const layer = declarations(componentCss, '.presentation-card-layer {');
    const scrollClass = classAttribute(template, 'presentation-scroll');

    expect(
      shortIncomingCenterJumpPx(stage, layer, scrollClass, TALL_CARD_PX, SHORT_CARD_PX),
    ).toBe(0);
    expect(stage).toContain('align-items: center');
    expect(layer).toContain('grid-area: 1 / 1');
    expect(layer).not.toContain('height: 100%');
    expect(layer).not.toContain('align-self: stretch');
    expect(scrollClass).toContain('place-items-center');
  });
});
