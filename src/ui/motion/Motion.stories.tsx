import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { AnimatePresence, m } from 'motion/react';
import { useState } from 'react';
import { useSample } from '../../../.storybook/samples';
import { Button } from '../primitives/Button';
import { fade, reveal, staggerDelay, step } from './presets';

const meta = { title: 'Motion/Presets' } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      padding: 'var(--space-16)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-panel)',
      background: 'var(--surface-raised)',
    }}
  >
    {children}
  </div>
);

/**
 * Reveal, fade, stagger and the reading-direction step (§12.4). Switch Motion to "Reduced" in the
 * toolbar: movement stops and only fades remain (§12.7). Switch locale to Arabic: steps mirror.
 */
export const Presets: Story = {
  render: function Render() {
    const s = useSample();
    const [round, setRound] = useState(0);
    const [dir, setDir] = useState<1 | -1>(1);
    const rtl = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
    return (
      <div style={{ display: 'grid', gap: 'var(--space-24)', maxInlineSize: '36rem' }}>
        <div style={{ display: 'flex', gap: 'var(--space-12)' }}>
          <Button onPress={() => setRound((r) => r + 1)}>Replay</Button>
          <Button
            onPress={() => {
              setDir((d) => (d === 1 ? -1 : 1));
              setRound((r) => r + 1);
            }}
          >
            {dir === 1 ? 'Next ▸' : '◂ Previous'}
          </Button>
        </div>
        <m.div key={`reveal-${round}`} variants={reveal} initial="hidden" animate="shown">
          <Box>reveal: {s.dialogBody}</Box>
        </m.div>
        <m.div key={`fade-${round}`} variants={fade} initial="hidden" animate="shown">
          <Box>fade: {s.savedDetail}</Box>
        </m.div>
        <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
          {s.styles.map((label, i) => (
            <m.div
              key={`${round}-${label}`}
              variants={reveal}
              initial="hidden"
              animate="shown"
              transition={{ delay: staggerDelay(i) }}
            >
              <Box>{label}</Box>
            </m.div>
          ))}
        </div>
        <AnimatePresence mode="popLayout" initial={false}>
          <m.div key={`step-${round}`} variants={step(dir, rtl)} initial="hidden" animate="shown" exit="exit">
            <Box>step: {s.productValue}</Box>
          </m.div>
        </AnimatePresence>
      </div>
    );
  },
};
