export interface NavItem {
  labelKey: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { labelKey: 'Nav.product', href: '/product' },
  { labelKey: 'Nav.extensions', href: '/extensions' },
  { labelKey: 'Nav.developers', href: '/developers' },
  { labelKey: 'Nav.docs', href: '/docs' },
  { labelKey: 'Nav.blog', href: '/blog' },
  { labelKey: 'Nav.pricing', href: '/pricing' },
];

export const footerNav = {
  product: [
    { labelKey: 'Footer.productLink', href: '/product' },
    { labelKey: 'Footer.extensions', href: '/extensions' },
    { labelKey: 'Footer.pricing', href: '/pricing' },
    { labelKey: 'Footer.download', href: '/download' },
    { labelKey: 'Footer.changelog', href: '/changelog' },
    { labelKey: 'Footer.blog', href: '/blog' },
  ],
  company: [
    { labelKey: 'Footer.developers', href: '/developers' },
    { labelKey: 'Footer.docs', href: '/docs' },
    { labelKey: 'Footer.contact', href: '/contact' },
    { labelKey: 'Footer.faq', href: '/faq' },
  ],
  legal: [
    { labelKey: 'Footer.privacy', href: '/privacy' },
    { labelKey: 'Footer.terms', href: '/terms' },
  ],
};
