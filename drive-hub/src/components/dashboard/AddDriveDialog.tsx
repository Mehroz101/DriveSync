import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { ExternalLink, Plus } from "lucide-react";
import { useAddDrive } from "@/mutations/drive/useAddDrive";
const BASE_URL = "http://localhost:4000";
const AddDriveDialog = ({
  isAddDialogOpen,
  setIsAddDialogOpen,
}: {
  isAddDialogOpen: boolean;
  setIsAddDialogOpen: (open: boolean) => void;
}) => {
  const { mutateAsync, isPending } = useAddDrive();
  const handleAddDrive = async () => {
    try {
      const response = await mutateAsync();
      const { authUrl } = response;

      if (!authUrl) {
        throw new Error("Missing OAuth URL");
      }

      // 🔐 Full redirect to backend OAuth flow
      window.location.href = authUrl;
    } catch (error) {
      console.error("Add Drive failed:", error);
      alert("Unable to connect Google Drive. Please try again.");
    }
  };
  return (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Google Drive</DialogTitle>
          <DialogDescription>
            Sign in with your Google account to connect a new Drive.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
            <svg viewBox="0 0 87.3 78" className="h-10 w-10">
              <path
                d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z"
                fill="#0066da"
              />
              <path
                d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z"
                fill="#00ac47"
              />
              <path
                d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z"
                fill="#ea4335"
              />
              <path
                d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z"
                fill="#00832d"
              />
              <path
                d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z"
                fill="#2684fc"
              />
              <path
                d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z"
                fill="#ffba00"
              />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-medium">Google Drive OAuth</p>
            <p className="text-sm text-muted-foreground">
              Click below to authorize access to your Drive
            </p>
          </div>
          <Button
            disabled={isPending}
            onClick={handleAddDrive}
            className="gap-2 gradient-primary"
          >
            <ExternalLink className="h-4 w-4" />
            {isPending ? "Redirecting…" : "Sign in with Google"}
          </Button>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => setIsAddDialogOpen(false)}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddDriveDialog;
