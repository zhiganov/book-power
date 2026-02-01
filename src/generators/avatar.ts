import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BookContent, BookAnalysis, CopyrightInfo, GeneratorOutput } from '../types.js';
import { log } from '../logger.js';

/**
 * Generate avatar-sdk compatible config.json + sources.json from book analysis.
 */
export async function generateAvatar(
  book: BookContent,
  analysis: BookAnalysis,
  copyright: CopyrightInfo,
  outputDir: string
): Promise<GeneratorOutput> {
  log.header('Generating avatar configuration...');

  const avatarId = slugify(book.metadata.title);
  const avatarDir = join(outputDir, avatarId);
  const corpusDir = join(avatarDir, 'corpus');
  mkdirSync(corpusDir, { recursive: true });

  const files: string[] = [];

  // 1. Generate config.json
  const config = buildConfig(avatarId, book, analysis);
  writeFileSync(join(avatarDir, 'config.json'), JSON.stringify(config, null, 2), 'utf-8');
  files.push('config.json');
  log.info('Generated config.json');

  // 2. Generate sources.json
  const sources = buildSources(avatarId, book, copyright);
  writeFileSync(join(corpusDir, 'sources.json'), JSON.stringify(sources, null, 2), 'utf-8');
  files.push('corpus/sources.json');
  log.info('Generated corpus/sources.json');

  // 3. Create open-access directory (for downloaded source files)
  mkdirSync(join(corpusDir, 'open-access'), { recursive: true });
  files.push('corpus/open-access/');

  log.success(`Avatar generated at ${avatarDir}`);

  return { format: 'avatar', outputDir: avatarDir, files };
}

interface AvatarConfig {
  id: string;
  name: string;
  description: string;
  expertise: string[];
  corpus: {
    description: string;
    sources: Array<{
      title: string;
      type: string;
      year?: number;
      url?: string;
      verified: boolean;
    }>;
  };
  systemPrompt: {
    identity: string;
    tone: string;
    constraints: string[];
    citationStyle: string;
  };
  vectorStore: {
    table: string;
    embeddingModel: string;
    embeddingDimensions: number;
    chunkSize: number;
    chunkOverlap: number;
  };
}

function buildConfig(
  avatarId: string,
  book: BookContent,
  analysis: BookAnalysis
): AvatarConfig {
  const authorName = book.metadata.author || 'the author';

  return {
    id: avatarId,
    name: `${authorName}'s ${book.metadata.title}`,
    description: `Knowledge avatar grounded in "${book.metadata.title}" by ${authorName}. ${analysis.expertise.slice(0, 3).join(', ')} expertise.`,
    expertise: analysis.expertise,
    corpus: {
      description: `Corpus based on "${book.metadata.title}" by ${authorName}`,
      sources: [
        {
          title: book.metadata.title,
          type: 'book',
          year: book.metadata.year,
          url: book.metadata.url,
          verified: !!book.metadata.url,
        },
      ],
    },
    systemPrompt: {
      identity: `You represent the documented knowledge from "${book.metadata.title}" by ${authorName}. You are a student of this work — not the author. You speak from what the book teaches, citing specific chapters and principles.`,
      tone: analysis.tone,
      constraints: [
        `Only cite actual content from "${book.metadata.title}" — do not invent positions ${authorName} did not articulate`,
        `When uncertain, acknowledge limitations: "The book doesn't directly address this, but based on the principle of..."`,
        `Attribute specific quotes and ideas to ${authorName} explicitly`,
        `Acknowledge the book's publication context and that practices may have evolved`,
        'Do not claim to be the author — you are a knowledgeable student of their work',
      ],
      citationStyle: `Reference chapters by name: "In the chapter on [topic], ${authorName} argues that..."`,
    },
    vectorStore: {
      table: 'avatar_chunks',
      embeddingModel: 'text-embedding-3-small',
      embeddingDimensions: 1536,
      chunkSize: 512,
      chunkOverlap: 50,
    },
  };
}

interface SourcesManifest {
  avatar: string;
  corpus_description: string;
  last_updated: string;
  sources: SourceDocument[];
}

interface SourceDocument {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  type: string;
  description: string;
  url: string;
  license: string;
  format: string;
  verified: boolean;
  priority: 'primary' | 'secondary';
  topics: string[];
}

function buildSources(
  avatarId: string,
  book: BookContent,
  copyright: CopyrightInfo
): SourcesManifest {
  const sourceId = slugify(book.metadata.title);
  const format = book.metadata.url ? 'HTML' : 'PDF';

  return {
    avatar: avatarId,
    corpus_description: `Source materials for the ${book.metadata.title} knowledge avatar`,
    last_updated: new Date().toISOString().split('T')[0],
    sources: [
      {
        id: sourceId,
        title: book.metadata.title,
        authors: [book.metadata.author || 'Unknown'],
        year: book.metadata.year ?? copyright.year,
        type: 'book',
        description: `Full text of "${book.metadata.title}"`,
        url: book.metadata.url || '',
        license: copyright.licenseFullName,
        format,
        verified: !!book.metadata.url,
        priority: 'primary',
        topics: book.chapters.map((ch) => ch.title),
      },
    ],
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}
