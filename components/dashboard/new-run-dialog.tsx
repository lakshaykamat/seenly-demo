"use client";

import { useState, cloneElement, isValidElement } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects, type Project } from "@/lib/api/projects";
import { fetcher } from "@/lib/api/fetcher";

type CreatedRun = { id: string };

export function NewRunDialog({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: projects, isLoading: projectsLoading } = useProjects();

  const [open, setOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [newName, setNewName] = useState("");

  const reset = () => {
    setSelectedProjectId("");
    setShowNewProject(false);
    setNewDomain("");
    setNewName("");
  };

  // Create project mutation
  const createProject = useMutation({
    mutationFn: (data: { domain: string; name: string }) =>
      fetcher<Project>("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  // Create run mutation
  const createRun = useMutation({
    mutationFn: (data: { project_id: string }) =>
      fetcher<CreatedRun>("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      toast.success("Run created");
      setOpen(false);
      reset();
      router.push(`/runs/${run.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create run");
    },
  });

  const isPending = createProject.isPending || createRun.isPending;

  const canSubmit = showNewProject
    ? newDomain.trim() !== "" && newName.trim() !== ""
    : selectedProjectId !== "";

  const handleSubmit = async () => {
    let projectId = selectedProjectId;

    // If creating a new project first
    if (showNewProject) {
      try {
        const project = await createProject.mutateAsync({
          domain: newDomain.trim(),
          name: newName.trim(),
        });
        projectId = project.id;
      } catch (error: unknown) {
        const msg =
          error instanceof Error ? error.message : "Failed to create project";
        toast.error(msg);
        return;
      }
    }

    createRun.mutate({ project_id: projectId });
  };

  const trigger = isValidElement<{ onClick?: () => void }>(children)
    ? cloneElement(children, { onClick: () => setOpen(true) })
    : children;

  return (
    <>
      {trigger}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New run</DialogTitle>
          <DialogDescription>
            Select a project to analyze, or create a new one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showNewProject && (
            <div className="space-y-2">
              <Label>Project</Label>
              {projectsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Loading projects...
                </div>
              ) : projects && projects.length > 0 ? (
                <Select
                  value={selectedProjectId}
                  onValueChange={(v) => setSelectedProjectId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{" "}
                          <span className="text-muted-foreground">
                            ({p.domain})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No projects yet. Create one below.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowNewProject(true);
                  setSelectedProjectId("");
                }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="size-3" />
                Create new project
              </button>
            </div>
          )}

          {showNewProject && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">New project</span>
                {projects && projects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowNewProject(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Select existing
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-domain">Domain</Label>
                <Input
                  id="new-domain"
                  placeholder="stripe.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">Project name</Label>
                <Input
                  id="new-name"
                  placeholder="Stripe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit || isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isPending ? "Creating..." : "Start run"}
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}
