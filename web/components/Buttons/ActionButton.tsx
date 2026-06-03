"use client";

import { Button } from "@/components/ui/button";

interface Props {
  children: React.ReactNode;
  title: string;
  classname?: string;
  disabled?: boolean;
  onClickF: () => void;
}

export const ActionButton = ({
  children,
  disabled,
  classname,
  title,
  onClickF,
}: Props) => {
  return (
    <Button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClickF}
      className={classname}
    >
      {children}
    </Button>
  );
};
