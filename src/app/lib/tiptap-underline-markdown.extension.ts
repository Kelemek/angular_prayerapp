import Underline from '@tiptap/extension-underline';
import type MarkdownIt from 'markdown-it';

function registerUnderlineMarkdownParser(md: MarkdownIt): void {
  md.inline.ruler.before('emphasis', 'underline', (state, silent) => {
    if (state.src.charCodeAt(state.pos) !== 0x2b /* + */) {
      return false;
    }
    if (state.src.charCodeAt(state.pos + 1) !== 0x2b) {
      return false;
    }

    const start = state.pos + 2;
    const max = state.posMax;
    let pos = start;

    while (pos < max) {
      if (
        state.src.charCodeAt(pos) === 0x2b &&
        state.src.charCodeAt(pos + 1) === 0x2b
      ) {
        if (pos === start) {
          return false;
        }
        if (!silent) {
          const openToken = state.push('underline_open', 'u', 1);
          openToken.markup = '++';
          const textToken = state.push('text', '', 0);
          textToken.content = state.src.slice(start, pos);
          const closeToken = state.push('underline_close', 'u', -1);
          closeToken.markup = '++';
        }
        state.pos = pos + 2;
        return true;
      }
      pos++;
    }

    return false;
  });

  md.renderer.rules['underline_open'] = () => '<u>';
  md.renderer.rules['underline_close'] = () => '</u>';
}

/**
 * With `tiptap-markdown` and `html: false`, marks without a `storage.markdown.serialize`
 * spec fall back to the internal "HTMLMark" serializer, which outputs nothing for
 * non-HTML mode — so underline was dropped on `getMarkdown()`. This mirrors the
 * `++text++` format from `@tiptap/extension-underline` / `tiptap-markdown` tokenizers.
 */
export const UnderlineWithMarkdown = Underline.extend({
  addStorage() {
    return {
      markdown: {
        serialize: {
          open: '++',
          close: '++',
          expelEnclosingWhitespace: true,
        },
        parse: {
          setup(md: MarkdownIt) {
            registerUnderlineMarkdownParser(md);
          },
        },
      },
    };
  },
});
