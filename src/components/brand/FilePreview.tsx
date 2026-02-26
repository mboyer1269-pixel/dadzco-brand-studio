import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, X, FileText, Image as ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

interface FilePreviewProps {
  fileName: string;
  storagePath: string;
  fileType: string;
}

function getPublicUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from("brand-book-files")
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

function isImageFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "webp", "svg"].includes(ext);
}

function isPdfFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}

/** Inline thumbnail for image files */
export function FileThumbnail({ fileName, storagePath }: { fileName: string; storagePath: string }) {
  const url = useMemo(() => getPublicUrl(storagePath), [storagePath]);

  if (!isImageFile(fileName)) {
    return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
  }

  return (
    <img
      src={url}
      alt={fileName}
      className="h-8 w-8 rounded object-cover border border-border shrink-0 bg-muted"
      loading="lazy"
      onError={(e) => {
        // Fallback to icon if image fails to load
        e.currentTarget.style.display = "none";
        e.currentTarget.parentElement?.querySelector(".fallback-icon")?.classList.remove("hidden");
      }}
    />
  );
}

/** Preview button + dialog for viewing files */
export function FilePreviewButton({ fileName, storagePath, fileType }: FilePreviewProps) {
  const [open, setOpen] = useState(false);
  const url = useMemo(() => getPublicUrl(storagePath), [storagePath]);
  const isImage = isImageFile(fileName);
  const isPdf = isPdfFile(fileName);

  if (!isImage && !isPdf) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
          >
            <Eye className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Prévisualiser</p>
        </TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-body font-medium flex items-center gap-2">
              {isImage ? (
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground" />
              )}
              {fileName}
            </DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4 overflow-auto max-h-[calc(90vh-60px)]">
            {isImage && (
              <img
                src={url}
                alt={fileName}
                className="w-full h-auto rounded-md border border-border bg-muted"
              />
            )}
            {isPdf && (
              <iframe
                src={`${url}#toolbar=1&navpanes=0`}
                title={fileName}
                className="w-full rounded-md border border-border bg-background"
                style={{ height: "75vh" }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
