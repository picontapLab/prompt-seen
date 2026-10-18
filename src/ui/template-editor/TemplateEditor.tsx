'use client';

import { Download, Link2, RotateCcw, Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import type { ImageRef, LocalizedField, TemplateSample } from '@/modules/content/types';
import { getImage } from '@/modules/media';
import { graphemeLength, renderTemplate, type FieldError, type FieldValues } from '@/modules/template';
import { absoluteUrl } from '@/modules/url';
import { ShareButton } from '@/ui/feedback/ShareButton';
import { textDirection } from '@/ui/prompt-detail/language';
import { PromptSheet } from '@/ui/prompt-detail/PromptSheet';
import { BottomSheet } from '@/ui/primitives/BottomSheet';
import { Button } from '@/ui/primitives/Button';
import { SegmentedControl } from '@/ui/primitives/SegmentedControl';
import { Select } from '@/ui/primitives/Select';
import { TextField } from '@/ui/primitives/TextField';
import { showToast } from '@/ui/primitives/toast-queue';
import { browserStorage, draftKey, readDraft, removeDraft, writeDraft } from './draft';
import { editorReducer, initialEditorState, visibleErrors, type EditorState } from './editor-state';
import { AspectRatioPicker, SwatchPicker } from './Pickers';
import { decodeShare, encodeShare } from './share';
import { TokenInput } from './TokenInput';
import {
  completeValues,
  controlFor,
  fieldsWithErrors,
  groupFields,
  necessityMarker,
  sameValues,
  sampleValues,
  varColor,
} from './values';
import styles from './TemplateEditor.module.css';

/** What the editor needs from the template detail; plain data, so the page passes only this. */
export type EditorModel = {
  templateId: string;
  slug: string;
  /** Internal path of the template page; the share link is its canonical address plus the values. */
  path: string;
  title: string;
  promptLanguage: string;
  version: { id: string; body: string; fields: LocalizedField[]; samples: TemplateSample[] };
  /** Image of the default sample (§11.8.4 示例图说明). */
  cover: ImageRef | null;
};

export type TemplateEditorProps = {
  model: EditorModel;
  /** The prompt language's name in the page language, and whether to explain it (§11.8.3). */
  languageName: string;
  showLanguageNote: boolean;
};

/** Debounce for draft writes (§11.6.2): typing never waits on storage. */
const SAVE_DELAY = 400;

/** Visible while the sheet is collapsed: its head with the copy button, and two lines (§11.8.4). */
const PEEK = 'calc(var(--space-8) + var(--target-min) + var(--space-8) + 3.4rem + var(--space-8))';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.motion === 'reduce');

/** Where focus goes in a field, in order of preference: its text input, the checked option or the selected segment. */
const FOCUS_ORDER = [
  'input:not([type=hidden]):not([type=radio])',
  'textarea',
  'input[type=radio]:checked',
  '[role=radio][aria-checked=true]',
  'button',
];

function focusTarget(shell: HTMLElement): HTMLElement | null {
  for (const selector of FOCUS_ORDER) {
    const el = shell.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

/**
 * The template editor (design doc §11.4, §11.8.4): fields on one side, the live prompt on the
 * other. The prompt is rendered on every render by the same pure function as the build (§6.3),
 * so the preview, the copied text and the downloaded file are one string, and none can lag
 * behind the values (§11.6.4). The first render uses the default sample, as the HTML does;
 * a shared link or a saved draft is applied after hydration (§11.6.3).
 */
export function TemplateEditor({ model, languageName, showLanguageNote }: TemplateEditorProps) {
  const t = useTranslations('templates.editor');
  const d = useTranslations('detail');
  const id = useId();
  const { version } = model;
  const fields = version.fields;
  const spec = useMemo(() => ({ body: version.body, fields }), [version.body, fields]);
  const defaults = useMemo(() => sampleValues(fields, version.samples, 0), [fields, version.samples]);
  const key = draftKey(model.templateId, version.id);
  const marker = necessityMarker(fields);
  const groups = useMemo(() => groupFields(fields), [fields]);

  const [state, dispatch] = useReducer(editorReducer, defaults, initialEditorState);
  const [active, setActive] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const latest = useRef(state);
  const initial = useRef(state);
  const shells = useRef(new Map<string, HTMLElement>());
  const previewId = `${id}-prompt`;

  useLayoutEffect(() => {
    latest.current = state;
  });

  const result = renderTemplate(spec, state.values);
  const missing = fieldsWithErrors(fields, result.errors);
  const shown = visibleErrors(state, result.errors);

  // --- After hydration: values from a shared link, else from a draft (§11.6.3, §11.8.4).
  useEffect(() => {
    function fromFragment(): boolean {
      const shared = decodeShare(window.location.hash, fields);
      if (!shared) return false;
      if (shared.version === version.id)
        dispatch({
          type: 'load',
          values: completeValues(fields, shared.values),
          sample: 0,
          notice: { kind: 'shared' },
        });
      else
        dispatch({ type: 'load', values: defaults, sample: 0, notice: { kind: 'mismatch', version: shared.version } });
      // The values now live in the editor (and its draft); a reload must not apply them again.
      const { pathname, search } = window.location;
      window.history.replaceState(window.history.state, '', pathname + search);
      return true;
    }
    if (!fromFragment()) {
      const draft = readDraft(browserStorage(), key, fields);
      if (draft && !sameValues(draft, defaults))
        dispatch({ type: 'load', values: draft, notice: { kind: 'restored' } });
    }
    const onHash = () => fromFragment();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [defaults, fields, key, version.id]);

  // --- Drafts (§11.6.2): saved shortly after a change; the default sample is no draft. Values
  // that are still the first render's (or put back by a reset) are never written, so opening a
  // link for another version leaves this version's draft alone.
  useEffect(() => {
    if (state.values === initial.current.values) return;
    const timer = setTimeout(() => {
      if (sameValues(state.values, defaults)) removeDraft(browserStorage(), key);
      else writeDraft(browserStorage(), key, state.values);
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [state.values, defaults, key]);

  // --- The focused field's variables come into view in the preview (§11.8.4 双向定位).
  useEffect(() => {
    if (!active) return;
    const segment = document.querySelector<HTMLElement>(`#${CSS.escape(previewId)} [data-field="${active}"]`);
    const sheet = segment?.closest('[data-sheet-body]')?.parentElement;
    // A docked sheet shows only its first lines; scrolling it would hide the copy button.
    if (!segment || (sheet && getComputedStyle(sheet).position === 'fixed')) return;
    segment.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [active, previewId]);

  function focusField(name: string) {
    const shell = shells.current.get(name);
    if (!shell) return;
    setSheetOpen(false);
    shell.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    focusTarget(shell)?.focus({ preventScroll: true });
  }

  /** Copy or download pressed while fields are missing: show every error and go to the first (§11.4). */
  function onBlocked() {
    dispatch({ type: 'reveal' });
    const first = fieldsWithErrors(fields, renderTemplate(spec, latest.current.values).errors)[0];
    if (first) focusField(first);
  }

  /** The prompt for the values at this moment, or null while any is invalid (§11.6.4). */
  const currentPrompt = () => renderTemplate(spec, latest.current.values).text;

  function load(values: FieldValues, sample: number, done: string) {
    const previous: EditorState = latest.current;
    const changed = !sameValues(previous.values, values);
    dispatch({ type: 'load', values, sample });
    if (!changed) return setAnnouncement(done);
    // Replacing what the user typed can be undone (§11.4 重置, §11.7).
    const edited = !sameValues(previous.values, sampleValues(fields, version.samples, previous.sample));
    if (edited)
      showToast({
        title: done,
        action: {
          label: t('undo'),
          onAction: () => dispatch({ type: 'load', values: previous.values, sample: previous.sample }),
        },
      });
    else setAnnouncement(done);
  }

  const reset = () => {
    load(defaults, 0, t('resetDone'));
    removeDraft(browserStorage(), key);
  };
  const anotherSample = () => {
    const next = (state.sample + 1) % version.samples.length;
    load(
      sampleValues(fields, version.samples, next),
      next,
      t('sampleDone', { n: next + 1, total: version.samples.length }),
    );
  };

  function download() {
    const text = currentPrompt();
    if (text === null) return onBlocked();
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.slug}-${version.id}.txt`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setAnnouncement(t('downloaded'));
  }

  /** A press on a variable in the preview focuses its field, unless text is being selected. */
  function onPreviewClick(event: MouseEvent<HTMLElement>) {
    const segment = (event.target as Element).closest<HTMLElement>('[data-field]');
    if (!segment || !window.getSelection()?.isCollapsed) return;
    focusField(segment.dataset.field!);
  }

  const errorText = (field: LocalizedField, error: FieldError) =>
    t(`errors.${error.code}`, {
      label: field.label,
      limit: error.limit ?? 0,
      actual: error.actual ?? 0,
      item: (error.item ?? 0) + 1,
    });

  // --- Preview text: the first and last literal pieces trimmed, as the copied prompt is.
  const segments = result.segments.map((s, i, all) =>
    s.kind === 'text' && i === 0
      ? { ...s, text: s.text.trimStart() }
      : s.kind === 'text' && i === all.length - 1
        ? { ...s, text: s.text.trimEnd() }
        : s,
  );
  const previewText = result.text ?? segments.map((s) => s.text).join('');

  const notice = state.notice;
  const noticeText =
    notice?.kind === 'restored'
      ? t('restored')
      : notice?.kind === 'shared'
        ? t('shared')
        : notice?.kind === 'mismatch'
          ? t('mismatch', { version: notice.version, current: version.id })
          : '';

  const img = model.cover && getImage(model.cover, 'card');

  return (
    <div className={styles.editor} data-editor={model.templateId} data-version={version.id}>
      <div className={styles.toolbar}>
        <p className={styles.meta}>
          {[d('template.version', { version: version.id }), d('template.fieldCount', { count: fields.length })].join(
            ' · ',
          )}
        </p>
        <p className={styles.notice} role="status" data-notice={notice?.kind}>
          {noticeText}
        </p>
        <Button variant="ghost" icon={<RotateCcw aria-hidden="true" />} onPress={reset} data-action="reset">
          {t('reset')}
        </Button>
      </div>

      <div className={styles.grid}>
        <form
          className={styles.fields}
          aria-label={t('fields')}
          noValidate
          onSubmit={(event) => event.preventDefault()}
        >
          {groups.map((group) => (
            <fieldset key={group.id ?? '_'} className={styles.group}>
              <legend className={group.label ? styles.legend : 'visually-hidden'}>{group.label ?? t('other')}</legend>
              {group.fields.map(({ field, index }) => {
                const errors = shown.filter((e) => e.field === field.name);
                const value = state.values[field.name];
                const message = errors.map((e) => errorText(field, e)).join(' ');
                return (
                  <div
                    key={field.name}
                    ref={(el) => {
                      if (el) shells.current.set(field.name, el);
                      else shells.current.delete(field.name);
                    }}
                    className={styles.field}
                    data-var={varColor(index)}
                    data-field-shell={field.name}
                    data-active={active === field.name || undefined}
                    onFocus={() => setActive(field.name)}
                    onBlur={(event) => {
                      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                      setActive((a) => (a === field.name ? null : a));
                      dispatch({ type: 'touch', field: field.name });
                    }}
                  >
                    <FieldControl
                      field={field}
                      value={value}
                      necessity={field.required === (marker === 'required') ? marker : undefined}
                      lang={model.promptLanguage}
                      errorMessage={message}
                      invalidItems={errors.flatMap((e) => (e.item !== undefined ? [e.item] : []))}
                      onChange={(next) => dispatch({ type: 'edit', field: field.name, value: next })}
                    />
                  </div>
                );
              })}
            </fieldset>
          ))}
        </form>

        <div className={styles.previewColumn}>
          <BottomSheet
            label={t('preview')}
            expandLabel={t('expand')}
            collapseLabel={t('collapse')}
            expanded={sheetOpen}
            onExpandedChange={setSheetOpen}
            peek={PEEK}
            staticFrom="lg"
            className={styles.sheet}
          >
            <div className={styles.preview}>
              <PromptSheet
                copyText={() => currentPrompt() ?? ''}
                copyBlocked={{
                  label: t('missing', { count: Math.max(missing.length, 1) }),
                  active: !result.ok,
                  onPress: onBlocked,
                }}
                fold={false}
                language={model.promptLanguage}
                languageName={languageName}
                showLanguageNote={showLanguageNote}
                characters={graphemeLength(previewText)}
                lines={previewText.split('\n').length}
                textId={previewId}
              >
                {segments.map((s, i) => {
                  if (s.kind === 'text') return <span key={i}>{s.text}</span>;
                  const field = fields[s.fieldIndex];
                  const pulse = state.pulses[s.name] ?? 0;
                  return (
                    <span
                      key={i}
                      className={styles.variable}
                      data-var={varColor(s.fieldIndex)}
                      data-field={s.name}
                      data-label={s.text ? undefined : (field?.label ?? s.name)}
                      data-empty={s.text ? undefined : ''}
                      data-invalid={s.invalid || undefined}
                      data-active={active === s.name || undefined}
                      data-pulse={pulse ? (pulse % 2 ? 'a' : 'b') : undefined}
                      onClick={onPreviewClick}
                    >
                      {s.text}
                    </span>
                  );
                })}
              </PromptSheet>

              <div className={styles.actions}>
                <Button icon={<Download aria-hidden="true" />} onPress={download} data-action="download">
                  {t('download')}
                </Button>
                {version.samples.length > 1 && (
                  <Button
                    variant="ghost"
                    icon={<Shuffle aria-hidden="true" />}
                    onPress={anotherSample}
                    data-action="sample"
                  >
                    {t('anotherSample')}
                  </Button>
                )}
                <ShareButton
                  url={
                    // The default sample needs no values in the link: the page itself shows it.
                    sameValues(state.values, defaults)
                      ? absoluteUrl(model.path)
                      : `${absoluteUrl(model.path)}#${encodeShare(version.id, state.values, fields)}`
                  }
                  title={model.title}
                  labels={{ share: t('share'), copied: t('shareCopied'), failed: t('shareFailed') }}
                  icon={<Link2 aria-hidden="true" />}
                />
              </div>

              {img && (
                <figure className={styles.sample}>
                  <span
                    className={styles.sampleFrame}
                    style={{ '--w': img.width, '--h': img.height, background: img.placeholder } as CSSProperties}
                  >
                    <img
                      src={img.src}
                      srcSet={img.srcSet}
                      sizes="(min-width: 1024px) 240px, 50vw"
                      width={img.width}
                      height={img.height}
                      alt={img.alt}
                      decoding="async"
                    />
                  </span>
                  <figcaption className={styles.sampleNote}>{d('template.sampleImage')}</figcaption>
                </figure>
              )}
            </div>
          </BottomSheet>
        </div>
      </div>

      <span role="status" className="visually-hidden">
        {announcement}
      </span>
    </div>
  );
}

type FieldControlProps = {
  field: LocalizedField;
  value: string | string[] | undefined;
  necessity: 'optional' | 'required' | undefined;
  lang: string;
  errorMessage: string;
  invalidItems: number[];
  onChange: (value: string | string[]) => void;
};

/** The control for one field (§11.8.4 控件选择); see controlFor. */
function FieldControl({ field, value, necessity, lang, errorMessage, invalidItems, onChange }: FieldControlProps) {
  const kind = controlFor(field);
  const invalid = errorMessage !== '';
  const help = field.help ?? undefined;
  const options =
    field.type === 'enum' ? field.options.map((o) => ({ ...o, label: field.optionLabels[o.value] ?? o.value })) : [];
  const text = typeof value === 'string' ? value : '';

  if (field.type === 'string-list')
    return (
      <TokenInput
        label={field.label}
        necessity={necessity}
        description={help}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        maxItems={field.maxItems}
        itemMaxLength={field.itemMaxLength}
        separator={field.separator}
        isInvalid={invalid}
        errorMessage={errorMessage}
        invalidItems={invalidItems}
        lang={lang}
      />
    );

  if (kind === 'ratio' || kind === 'swatch') {
    const Picker = kind === 'ratio' ? AspectRatioPicker : SwatchPicker;
    return (
      <Picker
        label={field.label}
        necessity={necessity}
        description={help}
        options={options}
        value={text}
        onChange={onChange}
      />
    );
  }
  if (kind === 'segments')
    return (
      <SegmentedControl
        label={field.label}
        segments={options.map((o) => ({ id: o.value, label: o.label }))}
        value={text}
        onChange={(next) => onChange(String(next))}
        description={help}
        wrap
      />
    );
  if (kind === 'select')
    return (
      <Select
        label={field.label}
        description={help}
        options={options.map((o) => ({ id: o.value, label: o.label }))}
        selectedKey={text}
        onSelectionChange={(next) => next !== null && onChange(String(next))}
      />
    );

  return (
    <TextField
      label={field.label}
      necessity={necessity}
      description={help}
      multiline={kind === 'textarea'}
      value={text}
      onChange={onChange}
      countLimit={field.type === 'string' ? (field.maxLength ?? undefined) : undefined}
      isRequired={field.required}
      validationBehavior="aria"
      isInvalid={invalid}
      errorMessage={errorMessage}
      inputLang={lang}
      inputDir={textDirection(lang)}
    />
  );
}
