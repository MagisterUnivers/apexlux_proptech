"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  initialNotes: string;
  onClose: () => void;
  onSave: (notes: string) => Promise<void>;
}

export const EditNotesModal = ({ open, initialNotes, onClose, onSave }: Props) => {
  const [value, setValue] = useState(initialNotes);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (value.trim() === initialNotes.trim()) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      await onSave(value.trim() || "");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setValue(initialNotes);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Notes</DialogTitle>
        </DialogHeader>

        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Add internal notes for this proposal…"
          rows={4}
          maxLength={1000}
          aria-label="Proposal notes"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
        />
        <p className="text-xs text-muted-foreground text-right -mt-1">
          {value.length}/1000
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} aria-busy={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
