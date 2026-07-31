import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Editor } from '@tiptap/core';
import Image from '@tiptap/extension-image';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { UnderlineWithMarkdown } from '../../lib/tiptap-underline-markdown.extension';

type ToolbarButton = {
  id: string;
  label: string;
  ariaLabel: string;
  isActive: (editor: Editor) => boolean;
  toggle: (editor: Editor) => void;
};

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
  template: `
    <div class="rte-wrapper" [class.rte-disabled]="disabled">
      <div
        class="rte-toolbar flex flex-wrap gap-1 p-1.5 border border-b-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 rounded-t-md"
        role="toolbar"
        aria-label="Text formatting"
      >
        @for (btn of toolbarButtons; track btn.id) {
          <button
            type="button"
            class="rte-btn px-2 py-1 text-xs font-medium rounded-md border border-transparent text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#39704D] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            [class.rte-btn-active]="editor && btn.isActive(editor)"
            [attr.aria-label]="btn.ariaLabel"
            [attr.aria-pressed]="editor ? btn.isActive(editor) : false"
            [disabled]="disabled || !editor"
            (click)="runToolbarAction(btn)"
          >
            @switch (btn.id) {
              @case ('bold') {
                <span class="rte-toolbar-glyph rte-toolbar-glyph-bold">B</span>
              }
              @case ('italic') {
                <span class="rte-toolbar-glyph rte-toolbar-glyph-italic">I</span>
              }
              @case ('underline') {
                <span class="rte-toolbar-glyph rte-toolbar-glyph-underline">U</span>
              }
              @default {
                <span [innerHTML]="btn.label"></span>
              }
            }
          </button>
        }
      </div>
      <div
        #host
        class="rte-host w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-b-md bg-inset-surface text-gray-900 dark:text-gray-100"
        [attr.aria-label]="ariaLabel || 'Rich text editor'"
        [attr.data-placeholder]="placeholder"
        [style.min-height]="minHeight"
      ></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .rte-wrapper.rte-disabled {
        opacity: 0.7;
        pointer-events: none;
      }
      .rte-btn-active {
        background-color: rgba(57, 112, 77, 0.12);
        border-color: rgba(57, 112, 77, 0.4) !important;
        color: #39704d !important;
      }
      :host-context(.dark) .rte-btn-active {
        background-color: rgba(95, 184, 118, 0.18);
        border-color: rgba(95, 184, 118, 0.5) !important;
        color: #5fb876 !important;
      }
      .rte-toolbar-glyph-bold {
        font-weight: 700;
      }
      /* Glyphs are real template nodes so styles apply (innerHTML strips most inline styles). */
      .rte-toolbar-glyph-italic {
        display: inline-block;
        font-style: italic;
        font-family: Georgia, 'Times New Roman', Times, serif;
        transform: skewX(-12deg);
      }
      .rte-toolbar-glyph-underline {
        text-decoration: underline;
        text-underline-offset: 2px;
      }
      :host ::ng-deep .rte-host .ProseMirror img {
        display: block;
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 0.75rem 0;
      }
      :host ::ng-deep .rte-host .ProseMirror {
        outline: none !important;
        min-height: inherit;
        background: transparent !important;
        border: 0 !important;
      }
      :host ::ng-deep .rte-host .ProseMirror *:not(code):not(pre):not(blockquote) {
        outline: none !important;
        box-shadow: none !important;
        background: transparent !important;
        border: 0 !important;
      }
      :host ::ng-deep .rte-host .ProseMirror p {
        margin: 0 0 0.5rem 0;
      }
      :host ::ng-deep .rte-host .ProseMirror > :last-child {
        margin-bottom: 0;
      }
      :host ::ng-deep .rte-host .ProseMirror ul,
      :host ::ng-deep .rte-host .ProseMirror ol {
        padding-left: 1.5rem;
        margin: 0.25rem 0 0.5rem 0;
      }
      :host ::ng-deep .rte-host .ProseMirror ul {
        list-style: disc;
      }
      :host ::ng-deep .rte-host .ProseMirror ol {
        list-style: decimal;
      }
      :host ::ng-deep .rte-host .ProseMirror blockquote {
        margin: 0.5rem 0;
        padding: 0.25rem 0.75rem;
        border-left: 3px solid rgba(57, 112, 77, 0.5) !important;
        opacity: 0.9;
      }
      :host ::ng-deep .rte-host .ProseMirror h3 {
        font-size: 1.05em;
        font-weight: 600;
        margin: 0.5rem 0 0.25rem 0;
      }
      :host ::ng-deep .rte-host .ProseMirror h4 {
        font-size: 1em;
        font-weight: 600;
        margin: 0.5rem 0 0.25rem 0;
      }
      :host ::ng-deep .rte-host .ProseMirror code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.9em;
        padding: 0.1em 0.3em;
        background: rgba(0, 0, 0, 0.06);
        border-radius: 3px;
      }
      :host-context(.dark) ::ng-deep .rte-host .ProseMirror code {
        background: rgba(255, 255, 255, 0.08);
      }
      /* Placeholder: tiptap renders empty doc as <p><br></p>; we fake a placeholder with :empty-ish */
      :host ::ng-deep .rte-host .ProseMirror.is-empty::before {
        content: attr(data-placeholder);
        float: left;
        color: rgba(107, 114, 128, 0.8);
        pointer-events: none;
        height: 0;
      }
    `,
  ],
})
export class RichTextEditorComponent
  implements AfterViewInit, OnChanges, OnDestroy, ControlValueAccessor
{
  @ViewChild('host', { static: true }) hostRef!: ElementRef<HTMLDivElement>;

  @Input() value = '';
  @Input() placeholder = 'Type here…';
  @Input() minHeight = '6rem';
  @Input() ariaLabel = '';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();

  editor: Editor | null = null;
  private lastEmitted = '';

  toolbarButtons: ToolbarButton[] = [
    {
      id: 'bold',
      label: '',
      ariaLabel: 'Bold',
      isActive: (e) => e.isActive('bold'),
      toggle: (e) => {
        e.chain().focus().toggleBold().run();
      },
    },
    {
      id: 'italic',
      label: '',
      ariaLabel: 'Italic',
      isActive: (e) => e.isActive('italic'),
      toggle: (e) => {
        e.chain().focus().toggleItalic().run();
      },
    },
    {
      id: 'underline',
      label: '',
      ariaLabel: 'Underline',
      isActive: (e) => e.isActive('underline'),
      toggle: (e) => {
        e.chain().focus().toggleUnderline().run();
      },
    },
    {
      id: 'bulletList',
      label: '&bull; List',
      ariaLabel: 'Bullet list',
      isActive: (e) => e.isActive('bulletList'),
      toggle: (e) => {
        e.chain().focus().toggleBulletList().run();
      },
    },
    {
      id: 'orderedList',
      label: '1. List',
      ariaLabel: 'Numbered list',
      isActive: (e) => e.isActive('orderedList'),
      toggle: (e) => {
        e.chain().focus().toggleOrderedList().run();
      },
    },
    {
      id: 'blockquote',
      label: '&ldquo; Quote',
      ariaLabel: 'Blockquote',
      isActive: (e) => e.isActive('blockquote'),
      toggle: (e) => {
        e.chain().focus().toggleBlockquote().run();
      },
    },
  ];

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(@Inject(ChangeDetectorRef) private cdr: ChangeDetectorRef) {}

  ngAfterViewInit(): void {
    this.editor = new Editor({
      element: this.hostRef.nativeElement,
      extensions: [
        StarterKit.configure({
          heading: { levels: [3, 4] },
          codeBlock: false,
          horizontalRule: false,
          underline: false,
        }),
        UnderlineWithMarkdown,
        // Required so Markdown `![alt](https://…)` survives paste / getMarkdown (broadcast screenshots).
        Image.configure({
          allowBase64: false,
          inline: false,
        }),
        Markdown.configure({
          html: false,
          linkify: true,
          breaks: true,
          transformCopiedText: true,
          transformPastedText: true,
        }),
      ],
      content: this.value || '',
      editable: !this.disabled,
      onUpdate: ({ editor }) => {
        const storage = editor.storage as unknown as Record<string, { getMarkdown?: () => string } | undefined>;
        const md = storage['markdown']?.getMarkdown?.() ?? '';
        this.lastEmitted = md;
        this.onChange(md);
        this.valueChange.emit(md);
        this.cdr.markForCheck();
      },
      onBlur: () => {
        this.onTouched();
      },
      onSelectionUpdate: () => {
        this.cdr.markForCheck();
      },
      onTransaction: () => {
        this.updateEmptyState();
      },
    });
    this.updateEmptyState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.editor) return;
    if (changes['value'] && !changes['value'].firstChange) {
      const incoming = this.value || '';
      if (incoming !== this.lastEmitted) {
        this.editor.commands.setContent(incoming);
        this.lastEmitted = incoming;
        this.updateEmptyState();
      }
    }
    if (changes['disabled']) {
      this.editor.setEditable(!this.disabled);
    }
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.editor = null;
  }

  runToolbarAction(btn: ToolbarButton): void {
    if (!this.editor || this.disabled) return;
    btn.toggle(this.editor);
    this.cdr.markForCheck();
  }

  /**
   * Push the latest Markdown from the editor into the bound ControlValueAccessor / ngModel.
   * Call this immediately before reading the model on form submit so lists and the last
   * keystroke are not lost (ProseMirror may not have fired onUpdate yet).
   */
  flushMarkdownToForm(): void {
    if (!this.editor || this.disabled) return;
    const storage = this.editor.storage as unknown as Record<string, { getMarkdown?: () => string } | undefined>;
    const md = storage['markdown']?.getMarkdown?.() ?? '';
    this.lastEmitted = md;
    this.onChange(md);
    this.valueChange.emit(md);
    this.cdr.markForCheck();
  }

  /** Exposes plain text length (useful for required-validation callers). */
  getPlainText(): string {
    return this.editor?.getText() ?? '';
  }

  private updateEmptyState(): void {
    if (!this.editor) return;
    const el = this.hostRef.nativeElement.querySelector('.ProseMirror');
    if (!el) return;
    if (this.editor.isEmpty) {
      el.classList.add('is-empty');
    } else {
      el.classList.remove('is-empty');
    }
  }

  writeValue(value: string): void {
    const incoming = value ?? '';
    this.value = incoming;
    if (this.editor) {
      if (incoming !== this.lastEmitted) {
        this.editor.commands.setContent(incoming);
        this.lastEmitted = incoming;
        this.updateEmptyState();
      }
    }
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    if (this.editor) {
      this.editor.setEditable(!isDisabled);
    }
    this.cdr.markForCheck();
  }
}
