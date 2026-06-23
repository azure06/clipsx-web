export interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: '0.1.0',
    date: '2025-06-19',
    items: [
      'Initial public beta release',
      'Clipboard capture and history for macOS, Windows, Linux',
      'Full-text search across all clips',
      'Semantic search with local embeddings',
      'Auto OCR for image and office clips',
      'Smart content detection (URL, code, JSON, JWT, CSV, color)',
      'Tags and notes with full-text index',
      'In-app auto-updater',
    ],
  },
];
