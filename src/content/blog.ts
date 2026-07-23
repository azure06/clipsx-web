import type { Locale } from '@/i18n/config';

export interface BlogPostPreview {
  slug: string;
  translationKey: 'privacy' | 'search' | 'office';
  status: 'comingSoon';
}

// This is the publishing boundary for the initial blog. Replace previews with
// localized article content when the editorial workflow is selected.
export const blogPostPreviews: Record<Locale, BlogPostPreview[]> = {
  en: [
    { slug: 'local-first-clipboard-privacy', translationKey: 'privacy', status: 'comingSoon' },
    { slug: 'local-semantic-and-image-search', translationKey: 'search', status: 'comingSoon' },
    { slug: 'preserving-rich-office-clips', translationKey: 'office', status: 'comingSoon' },
  ],
  ja: [
    { slug: 'local-first-clipboard-privacy', translationKey: 'privacy', status: 'comingSoon' },
    { slug: 'local-semantic-and-image-search', translationKey: 'search', status: 'comingSoon' },
    { slug: 'preserving-rich-office-clips', translationKey: 'office', status: 'comingSoon' },
  ],
};
