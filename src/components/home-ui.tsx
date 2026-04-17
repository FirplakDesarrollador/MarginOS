import Link from 'next/link';
import { LucideIcon, ArrowRight } from 'lucide-react';

interface ActionCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    href: string;
}

export function ActionCard({ icon: Icon, title, description, href }: ActionCardProps) {
    return (
        <Link
            href={href}
            className="group relative flex flex-col p-8 h-full bg-white rounded-2xl border border-border-subtle shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 hover:border-brand-accent/20"
        >
            <div className="mb-6 p-4 w-fit rounded-2xl bg-surface-bg text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
                <Icon className="w-6 h-6" strokeWidth={1.5} />
            </div>

            <div className="flex-1 space-y-3">
                <h3 className="text-lg font-semibold text-text-primary tracking-tight group-hover:text-brand-primary transition-colors">
                    {title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed font-normal">
                    {description}
                </p>
            </div>

            <div className="mt-8 flex items-center text-sm font-medium text-brand-accent opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                Open Tool <ArrowRight className="ml-2 w-4 h-4" />
            </div>
        </Link>
    );
}

interface HeroSectionProps {
    version: string;
    title: string;
    subtitle: string;
    ctaText: string;
    ctaHref: string;
}

export function HeroSection({ version, title, subtitle, ctaText, ctaHref }: HeroSectionProps) {
    return (
        <section className="text-center space-y-10 max-w-4xl mx-auto py-12">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white text-text-muted text-xs font-medium tracking-wider uppercase border border-border-subtle shadow-sm">
                {version}
            </div>

            <div className="space-y-6">
                <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-brand-primary leading-tight">
                    {title}
                </h1>
                <p className="text-xl text-text-muted max-w-2xl mx-auto font-normal leading-relaxed">
                    {subtitle}
                </p>
            </div>

            <div className="pt-8">
                <Link
                    href={ctaHref}
                    className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-brand-primary rounded-2xl hover:bg-brand-accent transition-all duration-300 shadow-lg shadow-brand-primary/20 hover:shadow-brand-accent/40 hover:-translate-y-0.5"
                >
                    {ctaText}
                </Link>
            </div>
        </section>
    );
}
