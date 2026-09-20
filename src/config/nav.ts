import { documentationConfig } from './site';

export type NavIcon =
  | 'product'
  | 'recall'
  | 'search'
  | 'extensions'
  | 'developers'
  | 'docs'
  | 'github'
  | 'changelog';

export interface NavItem {
  labelKey: string;
  descriptionKey?: string;
  href: string;
  icon?: NavIcon;
  external?: boolean;
  featured?: boolean;
}

export interface NavMenu {
  id: 'product' | 'developers';
  labelKey: string;
  eyebrowKey: string;
  items: NavItem[];
}

export const mainNavMenus: NavMenu[] = [
  {
    id: 'product',
    labelKey: 'Nav.product',
    eyebrowKey: 'Nav.productMenuEyebrow',
    items: [
      { labelKey: 'Nav.productOverview', descriptionKey: 'Nav.productOverviewDescription', href: '/product', icon: 'product' },
      { labelKey: 'Nav.recall', descriptionKey: 'Nav.recallDescription', href: '/recall', icon: 'recall', featured: true },
      { labelKey: 'Nav.meaningSearch', descriptionKey: 'Nav.meaningSearchDescription', href: '/meaning-search', icon: 'search' },
      { labelKey: 'Nav.extensions', descriptionKey: 'Nav.extensionsDescription', href: '/extensions', icon: 'extensions' },
    ],
  },
  {
    id: 'developers',
    labelKey: 'Nav.developers',
    eyebrowKey: 'Nav.developersMenuEyebrow',
    items: [
      { labelKey: 'Nav.developerOverview', descriptionKey: 'Nav.developerOverviewDescription', href: '/developers', icon: 'developers' },
      { labelKey: 'Nav.extensionDocs', descriptionKey: 'Nav.extensionDocsDescription', href: documentationConfig.developerExtensions, icon: 'docs', external: true },
      { labelKey: 'Nav.githubLabel', descriptionKey: 'Nav.githubDescription', href: 'https://github.com/azure06/clipsx', icon: 'github', external: true },
      { labelKey: 'Nav.changelog', descriptionKey: 'Nav.changelogDescription', href: '/changelog', icon: 'changelog' },
    ],
  },
];

export const mainNavLinks: NavItem[] = [
  { labelKey: 'Nav.docs', href: documentationConfig.root, external: true },
  { labelKey: 'Nav.pricing', href: '/pricing' },
];

export const footerNav = {
  product: [
    { labelKey: 'Footer.productLink', href: '/product' },
    { labelKey: 'Footer.recall', href: '/recall' },
    { labelKey: 'Footer.meaningSearch', href: '/meaning-search' },
    { labelKey: 'Footer.extensions', href: '/extensions' },
    { labelKey: 'Footer.pricing', href: '/pricing' },
    { labelKey: 'Footer.download', href: '/download' },
  ],
  company: [
    { labelKey: 'Footer.developers', href: '/developers' },
    { labelKey: 'Footer.docs', href: documentationConfig.root, external: true },
    { labelKey: 'Footer.changelog', href: '/changelog' },
    { labelKey: 'Footer.blog', href: '/blog' },
    { labelKey: 'Footer.contact', href: '/contact' },
    { labelKey: 'Footer.faq', href: '/faq' },
  ],
  legal: [
    { labelKey: 'Footer.privacy', href: '/privacy' },
    { labelKey: 'Footer.terms', href: '/terms' },
  ],
};
