import Link from "next/link";

interface Props {
  children: React.ReactNode;
  href: string;
  title: string;
  description: string;
}

export const WelcomeCard = ({ children, href, title, description }: Props) => {
  return (
    <li>
      <Link
        href={href}
        aria-label={title}
        className="group flex flex-col gap-3 rounded-xl border bg-card p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="flex items-center justify-between">
          <div className="rounded-lg bg-primary/10 p-2" aria-hidden="true">
            {children}
          </div>
          <span className="text-xs text-muted-foreground font-mono">{href}</span>
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </Link>
    </li>
  );
};
