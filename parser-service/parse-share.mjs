import {
  detectServerPlatform,
  parsePublicShare as parseLegacyPublicShare,
  ShareParseError,
} from './parsers.mjs';
import { parseDoubaoShare } from './providers/doubao.mjs';

export { ShareParseError };

/**
 * Stable parser-service entrypoint. Provider-specific fixes can live in small
 * modules while the normalized result remains { title, messages, source }.
 */
export async function parsePublicShare(rawUrl) {
  const platform = detectServerPlatform(rawUrl);
  if (!platform || platform === 'unknown') {
    throw new ShareParseError('Unsupported or invalid share URL.', 400);
  }
  if (platform === 'doubao') return parseDoubaoShare(rawUrl);
  return parseLegacyPublicShare(rawUrl);
}
