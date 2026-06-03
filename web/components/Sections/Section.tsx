import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  classNames?: string;
  bare?: boolean;
}

export const Section = ({ children, bare, classNames }: Props) => {
  return (
    <section className={cn(!bare && "p-20 h-full w-full", classNames)}>
      {children}
    </section>
  );
};
