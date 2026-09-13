import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
export default function robots():MetadataRoute.Robots{return{rules:{userAgent:'*',allow:'/',disallow:['/api/','/auth/','/en/account','/ja/account','/en/vault','/ja/vault']},sitemap:`${siteConfig.url}/sitemap.xml`}}
