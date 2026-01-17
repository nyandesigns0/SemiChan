"use client";

import { useEffect, useState } from "react";
import { Compass, DatabaseZap } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { AnchorAxis } from "@/types/anchor-axes";

interface AxisInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddAxis: (axis: AnchorAxis) => void;
}

function parseSeeds(value: string): string[] {
  return value
    .split(/[,\\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AxisInputModal({ open, onOpenChange, onAddAxis }: AxisInputModalProps) {
  const [activeTab, setActiveTab] = useState("create");
  const [axisName, setAxisName] = useState("New Axis");
  const [negativeLabel, setNegativeLabel] = useState("Negative");
  const [positiveLabel, setPositiveLabel] = useState("Positive");
  const [negativeSeeds, setNegativeSeeds] = useState("");
  const [positiveSeeds, setPositiveSeeds] = useState("");

  const resetForm = () => {
    setAxisName("New Axis");
    setNegativeLabel("Negative");
    setPositiveLabel("Positive");
    setNegativeSeeds("");
    setPositiveSeeds("");
    setActiveTab("create");
  };

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSave = () => {
    const axis: AnchorAxis = {
      id: `axis-${Date.now()}`,
      name: axisName.trim() || "New Axis",
      negativePole: { label: negativeLabel.trim() || "Negative", seedPhrases: parseSeeds(negativeSeeds) },
      positivePole: { label: positiveLabel.trim() || "Positive", seedPhrases: parseSeeds(positiveSeeds) },
    };
    onAddAxis(axis);
    handleClose();
  };

  const canSave = axisName.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] min-w-[640px] min-h-[60vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="text-xl font-bold">Create Anchored Axis</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-6 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="create" className="flex-1">
                <Compass className="mr-2 h-4 w-4" />
                Create Axis
              </TabsTrigger>
              <TabsTrigger value="import" className="flex-1" disabled>
                <DatabaseZap className="mr-2 h-4 w-4" />
                Import (soon)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="flex-1 overflow-auto mt-0">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-700">Axis name</Label>
                  <Input
                    value={axisName}
                    onChange={(e) => setAxisName(e.target.value)}
                    placeholder="Axis name (e.g., Pragmatic vs Aesthetic)"
                    className="h-9"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
                        Negative Pole
                      </Label>
                      <Input
                        value={negativeLabel}
                        onChange={(e) => setNegativeLabel(e.target.value)}
                        placeholder="Negative pole label"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Seed phrases</Label>
                      <Textarea
                        value={negativeSeeds}
                        onChange={(e) => setNegativeSeeds(e.target.value)}
                        className="min-h-[110px] text-xs"
                        placeholder="Comma or newline separated phrases that represent this pole"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
                        Positive Pole
                      </Label>
                      <Input
                        value={positiveLabel}
                        onChange={(e) => setPositiveLabel(e.target.value)}
                        placeholder="Positive pole label"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Seed phrases</Label>
                      <Textarea
                        value={positiveSeeds}
                        onChange={(e) => setPositiveSeeds(e.target.value)}
                        className="min-h-[110px] text-xs"
                        placeholder="Comma or newline separated phrases that represent this pole"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="import" className="flex-1 overflow-auto mt-0">
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                Import from saved configs will be available soon.
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
          <p className="text-xs text-slate-500">Seed phrases guide how the embedding engine orients this axis.</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6"
              disabled={!canSave}
            >
              Save Axis
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
