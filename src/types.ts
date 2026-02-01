// --- Input Types ---

export type SourceFormat = 'html' | 'pdf' | 'text' | 'epub';
export type SourceLocation = 'url' | 'file' | 'directory';

export interface BookSource {
  /** Original input (URL, file path, or directory path) */
  input: string;
  /** Detected location type */
  location: SourceLocation;
  /** Detected content format */
  format: SourceFormat;
  /** Resolved local path(s) after fetching */
  localPaths: string[];
}

// --- Content Types ---

export interface Section {
  title: string;
  content: string;
  level: number;
  wordCount: number;
}

export interface Chapter {
  title: string;
  url?: string;
  sections: Section[];
  wordCount: number;
  order: number;
}

export interface BookMetadata {
  title: string;
  author: string;
  year?: number;
  url?: string;
  license?: string;
  licenseUrl?: string;
  language?: string;
}

export interface BookContent {
  metadata: BookMetadata;
  chapters: Chapter[];
  totalWordCount: number;
  totalChapters: number;
}

// --- Analysis Types ---

export interface Principle {
  name: string;
  description: string;
  sourceChapter: string;
  actionable: boolean;
}

export interface FrameworkStep {
  label: string;
  description: string;
}

export interface Framework {
  name: string;
  description: string;
  type: 'checklist' | 'process' | 'matrix' | 'spectrum';
  steps: FrameworkStep[];
  sourceChapter: string;
}

export interface BookAnalysis {
  summary: string;
  principles: Principle[];
  frameworks: Framework[];
  expertise: string[];
  tone: string;
  audienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  primaryAction: string;
  commandType: 'audit' | 'advisory' | 'consult' | 'generate';
  suggestedCommandName: string;
}

// --- Copyright Types ---

export type LicenseType =
  | 'cc-by'
  | 'cc-by-sa'
  | 'cc-by-nc'
  | 'cc-by-nc-sa'
  | 'cc-by-nd'
  | 'cc-by-nc-nd'
  | 'cc0'
  | 'public-domain'
  | 'mit'
  | 'apache-2.0'
  | 'gpl'
  | 'unknown';

export interface CopyrightInfo {
  license: LicenseType;
  licenseFullName: string;
  licenseUrl?: string;
  author: string;
  year?: number;
  allowsDerivatives: boolean;
  requiresAttribution: boolean;
  commercialUse: boolean;
  verified: boolean;
}

// --- Output Types ---

export type OutputFormat = 'avatar' | 'command' | 'mcp';

export interface GeneratorOutput {
  format: OutputFormat;
  outputDir: string;
  files: string[];
}

// --- Pipeline Types ---

export interface PipelineOptions {
  source: string;
  output: OutputFormat;
  outputDir?: string;
  skipCopyrightCheck?: boolean;
}
