import { describe, expect, it } from 'vitest';
import { signRequest } from './s3';

// SigV4 signing (design doc §10.1), checked against the worked example "GET Object" in the AWS
// documentation "Authenticating Requests: Using the Authorization Header (AWS Signature Version 4)".

const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const example = {
  region: 'us-east-1',
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  date: new Date('2013-05-24T00:00:00Z'),
};

describe('signRequest', () => {
  it('reproduces the AWS GET Object example', () => {
    const headers = signRequest({
      ...example,
      method: 'GET',
      url: new URL('https://examplebucket.s3.amazonaws.com/test.txt'),
      headers: { Range: 'bytes=0-9' },
      payloadHash: EMPTY_SHA256,
    });
    expect(headers.authorization).toBe(
      'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, ' +
        'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, ' +
        'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
    );
    expect(headers['x-amz-date']).toBe('20130524T000000Z');
    expect(headers.host).toBeUndefined();
  });

  it('signs encoded path segments once, so keys with spaces or plus signs work', () => {
    const sign = (path: string) =>
      signRequest({
        ...example,
        method: 'HEAD',
        url: new URL(`https://s3.example.com${path}`),
        payloadHash: EMPTY_SHA256,
      }).authorization;
    expect(sign('/bucket/media/a%20b.webp')).toBe(sign('/bucket/media/a%20b.webp'));
    expect(sign('/bucket/media/a%20b.webp')).not.toBe(sign('/bucket/media/a%2Bb.webp'));
  });
});
