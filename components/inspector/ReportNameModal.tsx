"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ReportNameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onSave: (name: string) => void;
}

export function ReportNameModal({ open, onOpenChange, defaultName, onSave }: ReportNameModalProps) {
  const [reportName, setReportName] = useState(defaultName);

  useEffect(() => {
    if (open) {
      setReportName(defaultName);
    }
  }, [open, defaultName]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSave = () => {
    const trimmed = reportName.trim();
    if (trimmed.length > 0) {
      onSave(trimmed);
      handleClose();
    }
  };

  const canSave = reportName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] min-w-[480px] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="text-xl font-bold">Name Report</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Report name</Label>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter report name"
                className="h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSave) {
                    handleSave();
                  }
                }}
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-500">
              Choose a descriptive name for this analysis report. The report will be saved locally.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose} className="px-6">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6"
              disabled={!canSave}
            >
              Save Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
