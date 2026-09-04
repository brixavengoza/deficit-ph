import { parseCallbackParams } from '@/lib/oauth-callback';

describe('parseCallbackParams', () => {
  it('reads the PKCE code from a query string', () => {
    expect(parseCallbackParams('trackk://auth/callback?code=abc123')).toEqual({ code: 'abc123' });
  });

  it('reads params from a hash fragment', () => {
    expect(parseCallbackParams('trackk://auth/callback#code=abc123&state=xyz')).toEqual({
      code: 'abc123',
      state: 'xyz',
    });
  });

  it('uses whichever separator comes first', () => {
    expect(parseCallbackParams('trackk://cb?code=fromQuery#code=fromHash').code).toBe('fromQuery');
  });

  it('returns empty for a URL with no params', () => {
    expect(parseCallbackParams('trackk://auth/callback')).toEqual({});
  });

  it('returns empty for an empty string', () => {
    expect(parseCallbackParams('')).toEqual({});
  });

  it('decodes percent-encoding and plus-as-space', () => {
    expect(
      parseCallbackParams('trackk://cb?error_description=Invalid+request%20here').error_description
    ).toBe('Invalid request here');
  });

  it('surfaces provider errors', () => {
    const params = parseCallbackParams('trackk://cb?error=access_denied&error_description=Denied');
    expect(params.error).toBe('access_denied');
    expect(params.error_description).toBe('Denied');
  });

  it('ignores a duplicated key so a crafted URL cannot override the real code', () => {
    expect(parseCallbackParams('trackk://cb?code=real&code=injected').code).toBe('real');
  });

  it('skips malformed segments without throwing', () => {
    expect(parseCallbackParams('trackk://cb?&=&novalue&code=ok')).toEqual({ code: 'ok' });
  });
});
