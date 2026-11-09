import { sha256 } from './read';
import { fieldsFileSchema, inputRequirementsSchema } from './schemas';

/** Parsed values make YAML formatting irrelevant to the immutable version contract. */
export function legacyTemplateContractHash(body: string, fields: unknown[], inputs: unknown) {
  return sha256(
    JSON.stringify({
      body: body.trim(),
      fields: fieldsFileSchema.parse({ fields }).fields,
      inputs: inputs == null ? null : inputRequirementsSchema.parse(inputs),
    }),
  );
}

/** UI translations do not change the renderer contract or historical generation evidence. */
export function templateContractHash(body: string, fields: unknown[], inputs: unknown) {
  const parsedInputs = inputs == null ? null : inputRequirementsSchema.parse(inputs);
  return sha256(JSON.stringify({
    body: body.trim(),
    fields: fieldsFileSchema.parse({ fields }).fields.map((field) => {
      const { labels, help, ...semantic } = field;
      void labels; void help;
      return semantic.type === 'enum'
        ? { ...semantic, options: semantic.options.map(({ labels, ...option }) => { void labels; return option; }) }
        : semantic;
    }),
    inputs: parsedInputs === null ? null : {
      referenceImage: parsedInputs.referenceImage,
      slots: parsedInputs.slots.map(({ labels, ...slot }) => { void labels; return slot; }),
    },
  }));
}
