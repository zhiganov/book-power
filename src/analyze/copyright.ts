import type { CopyrightInfo, LicenseType } from '../types.js';
import { log } from '../logger.js';

interface LicensePattern {
  pattern: RegExp;
  type: LicenseType;
  fullName: string;
  allowsDerivatives: boolean;
  requiresAttribution: boolean;
  commercialUse: boolean;
}

const LICENSE_PATTERNS: LicensePattern[] = [
  {
    pattern: /creative\s*commons\s*(?:attribution[- ]share\s*alike|cc\s*by[- ]sa)\s*(\d\.\d)?/i,
    type: 'cc-by-sa',
    fullName: 'Creative Commons Attribution-ShareAlike',
    allowsDerivatives: true,
    requiresAttribution: true,
    commercialUse: true,
  },
  {
    pattern: /creative\s*commons\s*(?:attribution[- ]non\s*commercial[- ]share\s*alike|cc\s*by[- ]nc[- ]sa)\s*(\d\.\d)?/i,
    type: 'cc-by-nc-sa',
    fullName: 'Creative Commons Attribution-NonCommercial-ShareAlike',
    allowsDerivatives: true,
    requiresAttribution: true,
    commercialUse: false,
  },
  {
    pattern: /creative\s*commons\s*(?:attribution[- ]non\s*commercial[- ]no\s*deriv|cc\s*by[- ]nc[- ]nd)\s*(\d\.\d)?/i,
    type: 'cc-by-nc-nd',
    fullName: 'Creative Commons Attribution-NonCommercial-NoDerivatives',
    allowsDerivatives: false,
    requiresAttribution: true,
    commercialUse: false,
  },
  {
    pattern: /creative\s*commons\s*(?:attribution[- ]non\s*commercial|cc\s*by[- ]nc)\s*(\d\.\d)?/i,
    type: 'cc-by-nc',
    fullName: 'Creative Commons Attribution-NonCommercial',
    allowsDerivatives: true,
    requiresAttribution: true,
    commercialUse: false,
  },
  {
    pattern: /creative\s*commons\s*(?:attribution[- ]no\s*deriv|cc\s*by[- ]nd)\s*(\d\.\d)?/i,
    type: 'cc-by-nd',
    fullName: 'Creative Commons Attribution-NoDerivatives',
    allowsDerivatives: false,
    requiresAttribution: true,
    commercialUse: true,
  },
  {
    pattern: /creative\s*commons\s*(?:attribution|cc\s*by)\s*(\d\.\d)?/i,
    type: 'cc-by',
    fullName: 'Creative Commons Attribution',
    allowsDerivatives: true,
    requiresAttribution: true,
    commercialUse: true,
  },
  {
    pattern: /cc\s*0|creative\s*commons\s*zero|public\s*domain\s*dedication/i,
    type: 'cc0',
    fullName: 'Creative Commons Zero (Public Domain Dedication)',
    allowsDerivatives: true,
    requiresAttribution: false,
    commercialUse: true,
  },
  {
    pattern: /public\s*domain/i,
    type: 'public-domain',
    fullName: 'Public Domain',
    allowsDerivatives: true,
    requiresAttribution: false,
    commercialUse: true,
  },
  {
    pattern: /MIT\s*License/i,
    type: 'mit',
    fullName: 'MIT License',
    allowsDerivatives: true,
    requiresAttribution: true,
    commercialUse: true,
  },
  {
    pattern: /Apache\s*License.*2\.0/i,
    type: 'apache-2.0',
    fullName: 'Apache License 2.0',
    allowsDerivatives: true,
    requiresAttribution: true,
    commercialUse: true,
  },
  {
    pattern: /GNU\s*(?:General\s*Public|GPL)/i,
    type: 'gpl',
    fullName: 'GNU General Public License',
    allowsDerivatives: true,
    requiresAttribution: true,
    commercialUse: true,
  },
];

const CC_URL_PATTERN = /creativecommons\.org\/licenses\/(by(?:-(?:sa|nc|nd))*)\/([\d.]+)/i;

/**
 * Detect license from book text content.
 * Searches through the text for known license patterns.
 */
export function detectLicense(text: string): CopyrightInfo {
  // Check for CC license URLs first (most reliable)
  const urlMatch = text.match(CC_URL_PATTERN);
  if (urlMatch) {
    const licenseCode = urlMatch[1].toLowerCase();
    const version = urlMatch[2];
    const type = `cc-${licenseCode}` as LicenseType;
    const pattern = LICENSE_PATTERNS.find((p) => p.type === type);

    if (pattern) {
      log.success(`Detected license: ${pattern.fullName} ${version}`);
      return {
        license: type,
        licenseFullName: `${pattern.fullName} ${version}`,
        licenseUrl: `https://creativecommons.org/licenses/${licenseCode}/${version}/`,
        author: extractCopyrightHolder(text),
        year: extractCopyrightYear(text),
        allowsDerivatives: pattern.allowsDerivatives,
        requiresAttribution: pattern.requiresAttribution,
        commercialUse: pattern.commercialUse,
        verified: true,
      };
    }
  }

  // Try pattern matching on text
  for (const pattern of LICENSE_PATTERNS) {
    if (pattern.pattern.test(text)) {
      log.success(`Detected license: ${pattern.fullName}`);
      return {
        license: pattern.type,
        licenseFullName: pattern.fullName,
        author: extractCopyrightHolder(text),
        year: extractCopyrightYear(text),
        allowsDerivatives: pattern.allowsDerivatives,
        requiresAttribution: pattern.requiresAttribution,
        commercialUse: pattern.commercialUse,
        verified: false, // Pattern match only, not URL confirmed
      };
    }
  }

  log.warn('Could not detect license automatically');
  return {
    license: 'unknown',
    licenseFullName: 'Unknown',
    author: extractCopyrightHolder(text),
    year: extractCopyrightYear(text),
    allowsDerivatives: false,
    requiresAttribution: true,
    commercialUse: false,
    verified: false,
  };
}

/**
 * Check if a license allows derivative works (required for all output types).
 */
export function licenseAllowsDerivatives(info: CopyrightInfo): boolean {
  return info.allowsDerivatives;
}

function extractCopyrightHolder(text: string): string {
  // Look for "Copyright (C) YYYY Name" or "by Author Name"
  const copyrightMatch = text.match(
    /copyright\s*(?:\(c\)|©)\s*\d{4}(?:[–-]\d{4})?\s+([^\n.]+)/i
  );
  if (copyrightMatch) return copyrightMatch[1].trim();

  const byMatch = text.match(/(?:written|authored)\s+by\s+([^\n.]+)/i);
  if (byMatch) return byMatch[1].trim();

  return '';
}

function extractCopyrightYear(text: string): number | undefined {
  const match = text.match(/copyright\s*(?:\(c\)|©)\s*(\d{4})/i);
  if (match) return parseInt(match[1]);

  const yearMatch = text.match(/(?:published|written).*?(\d{4})/i);
  if (yearMatch) return parseInt(yearMatch[1]);

  return undefined;
}
