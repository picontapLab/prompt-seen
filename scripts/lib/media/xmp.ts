import type { MediaSource } from '../content/schemas';

// IPTC photo metadata as an XMP packet (design doc §9.7). Sharp drops EXIF, IPTC and XMP when it
// re-encodes, so media:import writes these fields into the `detail` and `og` variants:
// Creator, Credit Line, Copyright Notice, Web Statement of Rights, Licensor URL and Digital
// Source Type. Google Images reads them for the creator and "Licensable" details.

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const DIGITAL_SOURCE_TYPE_URI = 'http://cv.iptc.org/newscodes/digitalsourcetype/';

export function buildXmp(credit: MediaSource['credit'], provenance: MediaSource['provenance']): string {
  const lines: string[] = [];
  if (credit.creator)
    lines.push(`<dc:creator><rdf:Seq><rdf:li>${escape(credit.creator)}</rdf:li></rdf:Seq></dc:creator>`);
  if (credit.copyrightNotice)
    lines.push(
      `<dc:rights><rdf:Alt><rdf:li xml:lang="x-default">${escape(credit.copyrightNotice)}</rdf:li></rdf:Alt></dc:rights>`,
    );
  if (credit.creditText) lines.push(`<photoshop:Credit>${escape(credit.creditText)}</photoshop:Credit>`);
  if (credit.licenseUrl) lines.push(`<xmpRights:WebStatement>${escape(credit.licenseUrl)}</xmpRights:WebStatement>`);
  if (credit.acquireLicenseUrl)
    lines.push(
      `<plus:Licensor><rdf:Seq><rdf:li rdf:parseType="Resource"><plus:LicensorURL>${escape(credit.acquireLicenseUrl)}</plus:LicensorURL></rdf:li></rdf:Seq></plus:Licensor>`,
    );
  lines.push(
    `<Iptc4xmpExt:DigitalSourceType>${DIGITAL_SOURCE_TYPE_URI}${provenance.digitalSourceType}</Iptc4xmpExt:DigitalSourceType>`,
  );

  return [
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '<rdf:Description rdf:about=""',
    ' xmlns:dc="http://purl.org/dc/elements/1.1/"',
    ' xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"',
    ' xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"',
    ' xmlns:plus="http://ns.useplus.org/ldf/xmp/1.0/"',
    ' xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/">',
    ...lines,
    '</rdf:Description>',
    '</rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join('\n');
}
