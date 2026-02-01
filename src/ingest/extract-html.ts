import * as cheerio from 'cheerio';
import type { Chapter, Section } from '../types.js';
import { fetchUrl, fetchMultiple } from './fetch.js';
import { log } from '../logger.js';

interface ChapterLink {
  title: string;
  url: string;
}

/**
 * Extract chapters from an HTML book.
 * Handles two cases:
 * 1. Single-page: all content in one HTML file, split by headings
 * 2. Multi-page: index page with links to chapter pages (like producingoss.com)
 */
export async function extractHtml(
  html: string,
  baseUrl?: string
): Promise<{ chapters: Chapter[]; title: string; author: string }> {
  const $ = cheerio.load(html);

  // Try to detect if this is an index/TOC page with chapter links
  const chapterLinks = detectChapterLinks($, baseUrl);

  if (chapterLinks.length > 0 && baseUrl) {
    log.info(`Detected multi-page book with ${chapterLinks.length} chapters`);
    return extractMultiPage(chapterLinks, $);
  }

  log.info('Processing as single-page book');
  return extractSinglePage($);
}

function detectChapterLinks($: cheerio.CheerioAPI, baseUrl?: string): ChapterLink[] {
  if (!baseUrl) return [];

  const links: ChapterLink[] = [];
  const seen = new Set<string>();

  // Look for TOC-like structures: lists of links, nav elements, or divs with chapter links
  const tocSelectors = [
    '.toc a',
    '#toc a',
    'nav a',
    '.contents a',
    '#contents a',
    // DocBook/producingoss style
    '.toc dt a',
    '.book .toc a',
    'div.toc a',
  ];

  for (const selector of tocSelectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (!href || !text) return;
      if (href.startsWith('#')) return; // Skip same-page anchors
      if (href.startsWith('mailto:')) return;

      const resolved = resolveUrl(href, baseUrl);
      if (!seen.has(resolved)) {
        seen.add(resolved);
        links.push({ title: text, url: resolved });
      }
    });

    if (links.length >= 3) break; // Found a TOC
  }

  // Fallback: look for ordered list of links in main content
  if (links.length === 0) {
    $('ol a, ul.chapters a, div.book a').each((_, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (!href || !text || href.startsWith('#') || href.startsWith('mailto:')) return;

      const resolved = resolveUrl(href, baseUrl);
      if (!seen.has(resolved) && text.length > 5) {
        seen.add(resolved);
        links.push({ title: text, url: resolved });
      }
    });
  }

  return links;
}

async function extractMultiPage(
  chapterLinks: ChapterLink[],
  indexPage$: cheerio.CheerioAPI
): Promise<{ chapters: Chapter[]; title: string; author: string }> {
  const title = extractTitle(indexPage$);
  const author = extractAuthor(indexPage$);

  const urls = chapterLinks.map((c) => c.url);
  const pages = await fetchMultiple(urls);

  const chapters: Chapter[] = [];

  for (let i = 0; i < chapterLinks.length; i++) {
    const link = chapterLinks[i];
    const html = pages.get(link.url);
    if (!html) continue;

    const $ = cheerio.load(html);
    stripChrome($);
    const sections = extractSections($);
    const wordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);

    if (wordCount < 50) continue; // Skip near-empty pages

    chapters.push({
      title: link.title,
      url: link.url,
      sections,
      wordCount,
      order: i,
    });

    log.info(`  Chapter ${i + 1}: "${link.title}" (${wordCount} words)`);
  }

  return { chapters, title, author };
}

function extractSinglePage(
  $: cheerio.CheerioAPI
): { chapters: Chapter[]; title: string; author: string } {
  const title = extractTitle($);
  const author = extractAuthor($);

  stripChrome($);

  // Split by h1 or h2 headings to create chapters
  const chapters: Chapter[] = [];
  const headings = $('h1, h2');

  if (headings.length === 0) {
    // No headings — treat entire page as one chapter
    const sections = extractSections($);
    const wordCount = sections.reduce((sum, s) => sum + s.wordCount, 0);
    chapters.push({
      title: title || 'Content',
      sections,
      wordCount,
      order: 0,
    });
  } else {
    // Group content between headings
    headings.each((i, el) => {
      const heading = $(el);
      const headingText = heading.text().trim();

      // Collect all siblings until next heading of same or higher level
      const tagLevel = el.tagName === 'h1' ? 1 : 2;
      let content = '';
      let next = heading.next();

      while (next.length) {
        const nextTag = next.prop('tagName')?.toLowerCase() ?? '';
        if (nextTag === 'h1' || (nextTag === 'h2' && tagLevel >= 2)) break;
        content += next.text().trim() + '\n\n';
        next = next.next();
      }

      const wordCount = countWords(content);
      if (wordCount < 20) return; // Skip empty chapters

      const sections: Section[] = [{
        title: headingText,
        content: content.trim(),
        level: tagLevel,
        wordCount,
      }];

      chapters.push({
        title: headingText,
        sections,
        wordCount,
        order: i,
      });
    });
  }

  return { chapters, title, author };
}

function extractSections($: cheerio.CheerioAPI): Section[] {
  const sections: Section[] = [];
  const headings = $('h1, h2, h3, h4');

  if (headings.length === 0) {
    // No sub-headings — one section from body text
    const text = $('body').text().trim();
    if (text) {
      sections.push({
        title: 'Content',
        content: text,
        level: 1,
        wordCount: countWords(text),
      });
    }
    return sections;
  }

  headings.each((_, el) => {
    const heading = $(el);
    const headingText = heading.text().trim();
    const level = parseInt(el.tagName[1]);

    let content = '';
    let next = heading.next();
    while (next.length) {
      const nextTag = next.prop('tagName')?.toLowerCase() ?? '';
      if (/^h[1-4]$/.test(nextTag)) {
        const nextLevel = parseInt(nextTag[1]);
        if (nextLevel <= level) break;
      }
      content += next.text().trim() + '\n\n';
      next = next.next();
    }

    const wordCount = countWords(content);
    if (wordCount > 0) {
      sections.push({
        title: headingText,
        content: content.trim(),
        level,
        wordCount,
      });
    }
  });

  return sections;
}

function extractTitle($: cheerio.CheerioAPI): string {
  return (
    $('h1.title').first().text().trim() ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Untitled'
  );
}

function extractAuthor($: cheerio.CheerioAPI): string {
  return (
    $('meta[name="author"]').attr('content')?.trim() ||
    $('meta[name="dc.creator"]').attr('content')?.trim() ||
    $('.author').first().text().trim() ||
    $('address.author').text().trim() ||
    ''
  );
}

/**
 * Remove navigation, headers, footers, scripts, styles — keep prose content only
 */
function stripChrome($: cheerio.CheerioAPI): void {
  $('script, style, nav, header, footer, .nav, .navbar, .sidebar, .menu, .footer, .header').remove();
  $('[role="navigation"]').remove();
  $('[role="banner"]').remove();
  $('[role="contentinfo"]').remove();
}

function resolveUrl(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}
