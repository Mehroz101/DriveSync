import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DeleteFileDialogProps {
  onConfirm: () => Promise<void> | void;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function DeleteFileDialog({
  onConfirm,
  trigger,
  title = "Confirm Deletion",
  description = "This action is irreversible. The file will be permanently removed from your workspace.",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
}: DeleteFileDialogProps) {

  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      // Ensure we catch errors in the caller so the dialog doesn't swallow them
      await Promise.resolve(onConfirm());
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      {/* Trigger Button (or any element passed as trigger) */}
      <AlertDialogTrigger asChild>
        {trigger ?? <Button variant="destructive">Delete</Button>}
      </AlertDialogTrigger>

      {/* Modal Content */}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>

          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>

          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Deleting..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
