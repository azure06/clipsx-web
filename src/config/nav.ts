export interface NavItem {
  labelKey: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { labelKey: 'Nav.features', href: '/features' },
  { labelKey: 'Nav.pricing', href: '/pricing' },
  { labelKey: 'Nav.download', href: '/download' },
  { labelKey: 'Nav.changelog', href: '/changelog' },
  { labelKey: 'Nav.faq', href: '/faq' },
];

export const footerNav = {
  product: [
    { labelKey: 'Footer.features', href: '/features' },
    { labelKey: 'Footer.pricing', href: '/pricing' },
    { labelKey: 'Footer.download', href: '/download' },
    { labelKey: 'Footer.changelog', href: '/changelog' },
  ],
  company: [
    { labelKey: 'Footer.contact', href: '/contact' },
    { labelKey: 'Footer.faq', href: '/faq' },
  ],
  legal: [
    { labelKey: 'Footer.privacy', href: '/privacy' },
    { labelKey: 'Footer.terms', href: '/terms' },
  ],
};
