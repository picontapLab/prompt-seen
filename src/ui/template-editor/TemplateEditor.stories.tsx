import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { LocalizedField } from '@/modules/content/types';
import { TemplateEditor, type EditorModel } from './TemplateEditor';

// The product poster template (content/templates/t_001, v2) with English labels, inline so the
// story needs no content build.
const base = { help: null, groupLabel: null, optionLabels: {} };
const fields: LocalizedField[] = [
  {
    ...base,
    name: 'product',
    label: 'Product',
    help: 'Name the object and its material, e.g. “a speckled ceramic mug”.',
    type: 'string',
    required: true,
    group: 'subject',
    groupLabel: 'Subject',
    default: null,
    minLength: null,
    maxLength: 80,
    multiline: false,
  },
  {
    ...base,
    name: 'sellingPoints',
    label: 'Selling points',
    type: 'string-list',
    required: true,
    group: 'subject',
    groupLabel: 'Subject',
    default: null,
    minItems: 1,
    maxItems: 3,
    itemMaxLength: 40,
    separator: '; ',
  },
  {
    ...base,
    name: 'palette',
    label: 'Palette',
    type: 'enum',
    required: true,
    group: 'style',
    groupLabel: 'Style',
    default: 'warm neutral',
    options: [
      { value: 'warm neutral', swatch: ['#E8DCC8', '#B9A58E', '#3E3129'] },
      { value: 'sage green', swatch: ['#DCE6DD', '#6E9C88', '#2F5D50'] },
    ],
    optionLabels: { 'warm neutral': 'Warm neutral', 'sage green': 'Sage green' },
  },
  {
    ...base,
    name: 'aspectRatio',
    label: 'Aspect ratio',
    type: 'enum',
    required: true,
    group: 'composition',
    groupLabel: 'Composition',
    default: '4:5',
    options: ['4:5', '1:1', '16:9'].map((value) => ({ value, swatch: null })),
    optionLabels: { '4:5': '4:5', '1:1': '1:1', '16:9': '16:9' },
  },
  {
    ...base,
    name: 'headline',
    label: 'Headline',
    help: 'Optional. Short words render more reliably.',
    type: 'string',
    required: false,
    group: 'text',
    groupLabel: 'Text',
    default: null,
    minLength: null,
    maxLength: 32,
    multiline: false,
  },
];

const model: EditorModel = {
  templateId: 't_story',
  slug: 'product-poster',
  path: '/en/templates/product-poster/',
  title: 'Product poster',
  promptLanguage: 'en',
  cover: null,
  version: {
    id: 'v2',
    body:
      'Create an editorial product poster for {{product}}, shown as a clean flat-vector illustration.\n' +
      'Key selling points to suggest visually: {{sellingPoints}}.\nPalette: {{palette}}.\n' +
      'Aspect ratio: {{aspectRatio}}.\nOptional headline (leave out if blank): {{headline}}\n',
    fields,
    samples: [
      {
        name: 'default',
        values: {
          product: 'a speckled handmade ceramic mug',
          sellingPoints: ['glazed by hand', 'keeps coffee warm'],
          palette: 'warm neutral',
          aspectRatio: '4:5',
          headline: 'Made slowly',
        },
      },
      {
        name: 'tea-tin',
        values: {
          product: 'a loose-leaf green tea tin',
          sellingPoints: ['airtight lid'],
          palette: 'sage green',
          aspectRatio: '1:1',
        },
      },
    ],
  },
};

const meta = {
  title: 'Template editor/TemplateEditor',
  component: TemplateEditor,
  parameters: { layout: 'padded' },
  args: { model, languageName: 'English', showLanguageNote: false },
} satisfies Meta<typeof TemplateEditor>;
export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Fields and the live prompt (§11.8.4): focus a field to mark its variables, press a variable to
 * focus its field, empty a required field to see the blocked copy. Below 1024 px the preview docks
 * to the bottom. Drafts save to this browser's storage under a story-only template ID.
 */
export const Editor: Story = {};
