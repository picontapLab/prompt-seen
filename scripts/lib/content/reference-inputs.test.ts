import { expect, it } from 'vitest';
import { inputRequirementsSchema } from './schemas';

it('accepts ordered multi-person inputs and rejects contradictory requirements', () => {
  const slots = [
    { id: 'personA', labels: { en: 'First person' }, min: 1, max: 1 },
    { id: 'personB', labels: { en: 'Second person' }, min: 1, max: 1 },
  ];
  expect(inputRequirementsSchema.parse({ referenceImage: 'required', slots }).slots).toHaveLength(2);
  expect(inputRequirementsSchema.safeParse({ referenceImage: 'none', slots }).success).toBe(false);
  expect(inputRequirementsSchema.safeParse({ referenceImage: 'required', slots: [slots[0], slots[0]] }).success).toBe(
    false,
  );
});
