import { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  ExternalLink,
  X,
  SkipBack,
  SkipForward,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Loader2,
} from "lucide-react";
import { formatBytes } from "@/lib/formatters";
import { getFilePreviewUrl } from "@/api/files/files.api";
import type { DriveFile } from "@/types";

interface FilePreviewDialogProps {
  file: DriveFile | null;
  open: boolean;
  onClose: () => void;
}

type PreviewType = "image" | "video" | "audio" | "pdf" | "unsupported";

function getPreviewType(mimeType?: string): PreviewType {
  if (!mimeType) return "unsupported";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  return "unsupported";
}

function getPreviewIcon(type: PreviewType) {
  switch (type) {
    case "image":
      return <ImageIcon className="h-12 w-12 text-purple-400" />;
    case "video":
      return <Film className="h-12 w-12 text-red-400" />;
    case "audio":
      return <Music className="h-12 w-12 text-pink-400" />;
    case "pdf":
      return <FileText className="h-12 w-12 text-orange-400" />;
    default:
      return <FileText className="h-12 w-12 text-muted-foreground" />;
  }
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function FilePreviewDialog({
  file,
  open,
  onClose,
}: FilePreviewDialogProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Video/Audio state
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const previewType = getPreviewType(file?.mimeType);

  const previewUrl =
    file?.googleFileId && file?.driveAccountId
      ? getFilePreviewUrl(file.googleFileId, file.driveAccountId)
      : null;

  // Reset state when file changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [file?.googleFileId]);

  const togglePlay = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const el = mediaRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    const el = mediaRef.current;
    if (!el) return;
    const vol = value[0];
    el.volume = vol;
    setVolume(vol);
    if (vol === 0) {
      el.muted = true;
      setMuted(true);
    } else if (el.muted) {
      el.muted = false;
      setMuted(false);
    }
  }, []);

  const handleSeek = useCallback(
    (value: number[]) => {
      const el = mediaRef.current;
      if (!el || !duration) return;
      el.currentTime = value[0];
      setCurrentTime(value[0]);
    },
    [duration]
  );

  const skip = useCallback((seconds: number) => {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(el.duration, el.currentTime + seconds));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    }
  }, []);

  const onTimeUpdate = useCallback(() => {
    const el = mediaRef.current;
    if (el) setCurrentTime(el.currentTime);
  }, []);

  const onLoadedMetadata = useCallback(() => {
    const el = mediaRef.current;
    if (el) {
      setDuration(el.duration);
      setLoading(false);
    }
  }, []);

  const mediaControls = (
    <div className="space-y-2 pt-3">
      {/* Progress bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-10 text-right">{formatTime(currentTime)}</span>
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={handleSeek}
          className="flex-1"
        />
        <span className="w-10">{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => skip(-10)}>
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="ghost" className="h-9 w-9" onClick={togglePlay}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => skip(10)}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={toggleMute}>
            {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <Slider
            value={[muted ? 0 : volume]}
            max={1}
            step={0.05}
            onValueChange={handleVolumeChange}
            className="w-20"
          />

          {previewType === "video" && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!file || !previewUrl) return null;

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          {getPreviewIcon(previewType)}
          <p className="text-sm text-muted-foreground">Unable to load preview</p>
          <Button variant="outline" size="sm" asChild>
            <a href={file.webViewLink || "#"} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Drive
            </a>
          </Button>
        </div>
      );
    }

    switch (previewType) {
      case "image":
        return (
          <div className="relative flex items-center justify-center max-h-[70vh] overflow-hidden rounded-lg bg-muted/30">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <img
              src={previewUrl}
              alt={file.name}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
            />
          </div>
        );

      case "video":
        return (
          <div ref={containerRef} className="space-y-0">
            <div className="relative bg-black rounded-lg overflow-hidden">
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              <video
                ref={(el) => {
                  mediaRef.current = el;
                }}
                src={previewUrl}
                className="w-full max-h-[60vh] rounded-lg"
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={() => setPlaying(false)}
                onError={() => {
                  setLoading(false);
                  setError(true);
                }}
                onCanPlay={() => setLoading(false)}
                onClick={togglePlay}
                playsInline
              />
            </div>
            {mediaControls}
          </div>
        );

      case "audio":
        return (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 gap-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg">
              <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full">
                <Music className="h-10 w-10 text-white" />
              </div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            </div>
            <audio
              ref={(el) => {
                mediaRef.current = el;
              }}
              src={previewUrl}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onEnded={() => setPlaying(false)}
              onError={() => {
                setLoading(false);
                setError(true);
              }}
              onCanPlay={() => setLoading(false)}
              preload="metadata"
            />
            {mediaControls}
          </div>
        );

      case "pdf":
        return (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <FileText className="h-12 w-12 text-orange-400" />
            <p className="text-sm text-muted-foreground">
              PDF preview is best viewed in Google Drive
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href={file.webViewLink || "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Drive
              </a>
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            {getPreviewIcon(previewType)}
            <p className="text-sm text-muted-foreground">
              Preview not available for this file type
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href={file.webViewLink || "#"} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Google Drive
              </a>
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            {file?.iconLink && (
              <img src={file.iconLink} alt="" className="h-6 w-6 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base">
                {file?.name || "File Preview"}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-xs">
                {file?.mimeType && (
                  <span className="text-muted-foreground">
                    {file.mimeType.split("/").pop()?.toUpperCase()}
                  </span>
                )}
                {file?.size ? (
                  <>
                    <span>•</span>
                    <span>{formatBytes(file.size)}</span>
                  </>
                ) : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-2">{renderPreview()}</div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex gap-2">
            {file?.webContentLink && (
              <Button variant="outline" size="sm" asChild>
                <a href={file.webContentLink} download>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </a>
              </Button>
            )}
            {file?.webViewLink && (
              <Button variant="outline" size="sm" asChild>
                <a href={file.webViewLink} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Drive
                </a>
              </Button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
