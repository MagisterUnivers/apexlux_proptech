"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ItemCategory,
  CATEGORY_LABELS,
  CATEGORY_EXAMPLES,
} from "@/types/itinerary";
import { AddItemPayload } from "@/app/actions";
import { CATEGORIES } from "@/constants/activity-categories";

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onItemAdd: (data: AddItemPayload) => Promise<void>;
}

const emptyForm = (): AddItemPayload => ({
  category: "DINING",
  title: "",
  description: "",
  scheduledAt: "",
  price: 0,
});

export const AddItemModal = ({ isOpen, onOpenChange, onItemAdd }: Props) => {
  const [form, setForm] = useState<AddItemPayload>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = (open: boolean) => {
    if (!open) {
      setForm(emptyForm());
      setError(null);
    }
    onOpenChange(open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.scheduledAt) {
      setError("Please fill in all fields.");
      return;
    }
    if (form.price <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onItemAdd({
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      });
      setForm(emptyForm());
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item.");
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = form.category as ItemCategory;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Itinerary Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={form.category}
              onValueChange={(val) =>
                setForm((prev) => ({ ...prev, category: val as ItemCategory }))
              }
            >
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_EXAMPLES[selectedCategory]}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g. Private Chef Dinner"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              maxLength={150}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              placeholder="Describe the experience..."
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="scheduledAt">Date & Time</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, scheduledAt: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                min={1}
                step={1}
                placeholder="0"
                value={form.price || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    price: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>

          {error && (
            <p
              role="alert"
              aria-live="assertive"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
