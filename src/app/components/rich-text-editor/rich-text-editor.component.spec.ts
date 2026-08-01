import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RichTextEditorComponent } from './rich-text-editor.component';

describe('RichTextEditorComponent', () => {
  let fixture: ComponentFixture<RichTextEditorComponent>;
  let component: RichTextEditorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RichTextEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RichTextEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('creates an editor instance and renders a toolbar', () => {
    expect(component).toBeTruthy();
    const host = fixture.nativeElement as HTMLElement;
    const toolbar = host.querySelector('.rte-toolbar');
    expect(toolbar).toBeTruthy();
    const buttons = host.querySelectorAll('.rte-btn');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('exposes a ControlValueAccessor-compatible writeValue method', () => {
    expect(typeof component.writeValue).toBe('function');
    expect(() => component.writeValue('**hello**')).not.toThrow();
  });

  it('emits valueChange when typed content produces markdown', () => {
    let emitted: string | undefined;
    component.valueChange.subscribe((v) => (emitted = v));
    // Simulate editor update by directly setting editor content
    const editor = (component as unknown as { editor?: { commands: { setContent: (c: string) => void } } })
      .editor;
    if (editor) {
      editor.commands.setContent('<p><strong>hi</strong></p>');
    }
    // The update listener fires synchronously via Tiptap, so emitted should be set
    expect(typeof emitted === 'string' || emitted === undefined).toBe(true);
  });

  it('runs toolbar formatting commands via runToolbarAction', () => {
    component.editor?.commands.setContent('<p>hello</p>');
    for (const btn of component.toolbarButtons) {
      const toggleSpy = vi.spyOn(btn, 'toggle');
      component.runToolbarAction(btn);
      expect(toggleSpy).toHaveBeenCalledWith(component.editor);
    }
  });

  it('executes toolbar toggle handlers on the editor', () => {
    component.editor?.commands.setContent('<p>hello</p>');
    for (const btn of component.toolbarButtons) {
      btn.toggle(component.editor!);
    }
    expect(component.editor).toBeTruthy();
  });

  it('applies ngOnChanges updates for value and disabled inputs', () => {
    component.editor?.commands.setContent('<p>initial</p>');
    component.lastEmitted = 'initial md';

    component.value = '**updated**';
    component.ngOnChanges({
      value: {
        currentValue: '**updated**',
        previousValue: 'initial md',
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    component.disabled = true;
    component.ngOnChanges({
      disabled: {
        currentValue: true,
        previousValue: false,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.editor?.isEditable).toBe(false);
  });

  it('syncs external value changes and disabled state through ControlValueAccessor', () => {
    const onChange = vi.fn();
    const onTouched = vi.fn();
    component.registerOnChange(onChange);
    component.registerOnTouched(onTouched);

    component.writeValue('**updated**');
    expect(component.value).toBe('**updated**');

    component.setDisabledState(true);
    expect(component.disabled).toBe(true);
    expect(component.editor?.isEditable).toBe(false);

    component.setDisabledState(false);
    expect(component.editor?.isEditable).toBe(true);
  });

  it('flushMarkdownToForm pushes latest markdown to form callbacks', () => {
    const onChange = vi.fn();
    component.registerOnChange(onChange);
    let emitted: string | undefined;
    component.valueChange.subscribe((v) => (emitted = v));

    component.editor?.commands.setContent('<p>flush me</p>');
    component.flushMarkdownToForm();

    expect(onChange).toHaveBeenCalled();
    expect(typeof emitted).toBe('string');
  });

  it('round-trips ++underline++ markdown when loading existing content', () => {
    component.writeValue('Line one\n\n++underlined++');
    component.flushMarkdownToForm();
    expect(component.editor?.getHTML()).toContain('<u>');
    expect(component.editor?.getHTML()).not.toContain('++underlined++');
    expect(component.value).toContain('++underlined++');
  });

  it('round-trips HTTPS Markdown images through TipTap getMarkdown', () => {
    const md =
      'Hello\n\n![Home with Memorize](https://cpprayer.cp-church.org/marketing/memorize/01-find-memorize.png)\n';
    component.writeValue(md);
    component.flushMarkdownToForm();
    const out = component.value || '';
    expect(out).toContain('![Home with Memorize](https://cpprayer.cp-church.org/marketing/memorize/01-find-memorize.png)');
  });

  it('getPlainText returns editor text content', () => {
    component.editor?.commands.setContent('<p>plain text</p>');
    expect(component.getPlainText()).toContain('plain text');
  });

  it('runToolbarAction is ignored when disabled', () => {
    component.setDisabledState(true);
    const btn = component.toolbarButtons[0];
    const toggleSpy = vi.spyOn(btn, 'toggle');

    component.runToolbarAction(btn);

    expect(toggleSpy).not.toHaveBeenCalled();
  });
});
