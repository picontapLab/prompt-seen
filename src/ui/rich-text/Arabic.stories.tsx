import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { RichText } from './RichText';

const meta = { title: 'Typography/Arabic', component: RichText, globals: { locale: 'ar' } } satisfies Meta<
  typeof RichText
>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Joining, diacritics and nested language boundaries, in both Storybook themes. */
export const DiacriticsAndCode: Story = {
  args: {
    locale: 'ar',
    blocks: [
      { t: 'h2', id: 'arabic-sample', c: [{ t: 'text', v: 'أَوَامِرُ الصُّوَرِ: إِضَاءَةٌ وَتَكْوِينٌ' }] },
      {
        t: 'p',
        c: [
          {
            t: 'text',
            v: 'اكتب وصفًا واضحًا للمشهد، ثم انسخ الأمر كاملًا. احتفظ بالكلمات الأصلية والأرقام كما أُدخلت: ',
          },
          { t: 'code', v: 'GPT Image 2.6 / 16:9' },
        ],
      },
      {
        t: 'p',
        c: [
          {
            t: 'text',
            v: 'لا تُغيِّر علامات الترقيم داخل الشفرة أو الروابط. النص الطويل مع التشكيل يختبر ارتفاع السطر واتصال الحروف دون تباعد مصطنع.',
          },
        ],
      },
    ],
  },
};
