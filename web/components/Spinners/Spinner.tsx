interface Props {
  className?: string;
}

export const Spinner = ({ className }: Props) => {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`h-5 w-5 rounded-full border-2 border-muted border-t-foreground animate-spin ${className ?? ""}`}
    />
  );
};
