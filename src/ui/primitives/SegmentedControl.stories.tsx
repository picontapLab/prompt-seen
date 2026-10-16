import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Forced, StateCell, StateGrid } from '../../../.storybook/states';
import { SegmentedControl } from './SegmentedControl';

const meta = {
  title: 'Primitives/SegmentedControl',
  component: SegmentedControl,
  args: { label: 'Theme', segments: [], value: 'system', onChange: () => {} },
} satisfies Meta<typeof SegmentedControl>;
export default meta;
type Story = StoryObj<typeof meta>;

function Theme({ disabled, initial = 'system' }: { disabled?: 'dark'; initial?: string }) {
  const t = useTranslations('shell.theme');
  const [value, setValue] = useState(initial);
  return (
    <SegmentedControl
      label={t('label')}
      value={value}
      onChange={setValue}
      segments={[
        { id: 'system', label: t('system'), icon: <Monitor aria-hidden="true" /> },
        { id: 'light', label: t('light'), icon: <Sun aria-hidden="true" /> },
        { id: 'dark', label: t('dark'), icon: <Moon aria-hidden="true" />, isDisabled: disabled === 'dark' },
      ]}
    />
  );
}

/** Selected (safelight underline), hover, pressed, focus-visible, disabled option (§11.1.7). */
export const States: Story = {
  render: () => (
    <StateGrid>
      <StateCell label="SELECTED · DEFAULT">
        <Theme />
      </StateCell>
      <StateCell label="HOVER (LIGHT)">
        <Forced states={['hovered']} target="[role=radio]:nth-child(2)">
          <Theme />
        </Forced>
      </StateCell>
      <StateCell label="PRESSED (LIGHT)">
        <Forced states={['pressed']} target="[role=radio]:nth-child(2)">
          <Theme />
        </Forced>
      </StateCell>
      <StateCell label="FOCUS-VISIBLE">
        <Forced states={['focus-visible']} target="[role=radio][aria-checked=true]">
          <Theme initial="light" />
        </Forced>
      </StateCell>
      <StateCell label="DISABLED OPTION">
        <Theme disabled="dark" />
      </StateCell>
    </StateGrid>
  ),
};
