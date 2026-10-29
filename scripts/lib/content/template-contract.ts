import { sha256 } from './read';
import { fieldsFileSchema, inputRequirementsSchema } from './schemas';

/** Parsed values make YAML formatting irrelevant to the immutable version contract. */
export function templateContractHash(body: string, fields: unknown[], inputs: unknown) {
  return sha256(
    JSON.stringify({
      body: body.trim(),
      fields: fieldsFileSchema.parse({ fields }).fields,
      inputs: inputs == null ? null : inputRequirementsSchema.parse(inputs),
    }),
  );
}
