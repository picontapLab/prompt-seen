import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Copy, Heart, Share2, X } from 'lucide-react';
import { Forced, StateCell, StateGrid, type ForcedState } from '../../../.storybook/states';
import { useSample } from '../../../.storybook/samples';
import { Button, IconButton, type ButtonVariant } from './Button';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  args: { children: 'Copy prompt', variant: 'primary' },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

const forced: [string, ForcedState[]][] = [
  ['DEFAULT', []],
  ['HOVER', ['hovered']],
  ['PRESSED', ['pressed']],
  ['FOCUS-VISIBLE', ['focus-visible']],
];

function Row({ variant }: { variant: ButtonVariant }) {
  const s = useSample();
  const icon = variant === 'primary' ? <Copy aria-hidden="true" /> : <Share2 aria-hidden="true" />;
  const label = variant === 'primary' ? s.copy : s.share;
  return (
    <StateGrid>
      {forced.map(([name, states]) => (
        <StateCell key={name} label={`${variant.toUpperCase()} · ${name}`}>
          <Forced states={states}>
            <Button variant={variant} icon={icon}>
              {label}
            </Button>
          </Forced>
        </StateCell>
      ))}
      <StateCell label={`${variant.toUpperCase()} · DISABLED`}>
        <Button variant={variant} icon={icon} isDisabled disabledReason={s.reason}>
          {label}
        </Button>
      </StateCell>
      <StateCell label={`${variant.toUpperCase()} · LOADING`}>
        <Button variant={variant} icon={icon} isPending>
          {label}
        </Button>
      </StateCell>
    </StateGrid>
  );
}

/** Every state of each variant (§11.1.7). Selected and invalid do not apply to buttons. */
export const States: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 'var(--space-40)' }}>
      <Row variant="primary" />
      <Row variant="secondary" />
      <Row variant="ghost" />
    </div>
  ),
};

/** Icon-only buttons: 44 × 44, accessible name, tooltip after about 500 ms (§11.1.6). */
export const IconOnly: Story = {
  render: function Render() {
    const s = useSample();
    return (
      <StateGrid>
        {forced.map(([name, states]) => (
          <StateCell key={name} label={`ICON · ${name}`}>
            <Forced states={states}>
              <IconButton icon={<Heart aria-hidden="true" />} label={s.save} />
            </Forced>
          </StateCell>
        ))}
        <StateCell label="ICON · GHOST">
          <IconButton variant="ghost" icon={<X aria-hidden="true" />} label="Close" />
        </StateCell>
        <StateCell label="ICON · DISABLED">
          <IconButton icon={<Heart aria-hidden="true" />} label={s.save} isDisabled />
        </StateCell>
      </StateGrid>
    );
  },
};

export const Large: Story = { args: { size: 'lg', icon: <Copy aria-hidden="true" /> } };
