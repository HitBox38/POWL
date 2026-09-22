/** Links are opened only by an explicit user tap, including links imported in backups. */
export function parseConnectionUrl(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new Error('Enter a website URL or an app link.');
  const url = value.trim();
  if (!url) return undefined;
  if (url.length > 2048 || /[\s\u0000-\u001f\u007f]/.test(url)) throw new Error('Enter a link without spaces, up to 2048 characters.');
  // Require an explicit scheme; disallow executable, file, system, and recursive POWL links.
  const match = /^([a-z][a-z0-9+.-]*):\/\/(.+)$/i.exec(url);
  if (!match || /^(javascript|data|file|content|intent|powl|tel|sms|mailto)$/i.test(match[1])) {
    throw new Error('Use http://, https://, or an app’s supported scheme:// link.');
  }
  if (/^https?$/i.test(match[1])) {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname || parsed.username || parsed.password) throw new Error();
    } catch { throw new Error('Enter a valid website URL without a username or password.'); }
  }
  return url;
}
