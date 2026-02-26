"use client";

import { useRef, useState } from "react";
import { User, X, Camera } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  value?: string;
  onChange: (dataUrl: string) => void;
  size?: number;
  label?: string;
}

export function PhotoUpload({
  value,
  onChange,
  size = 96,
  label = "Upload Photo",
}: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) onChange(result);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex cursor-pointer items-center justify-center rounded-full border-2 border-dashed transition-colors",
          "border-muted-foreground/25 hover:border-primary/50",
          "bg-muted/50 dark:bg-muted/30",
          dragOver && "border-primary bg-primary/10",
        )}
        style={{ width: size, height: size }}
      >
        {value ? (
          <>
            <Image
              src={value}
              alt="Photo"
              fill
              unoptimized
              className="rounded-full object-cover"
            />
            {/* Remove button */}
            <button
              type="button"
              onClick={handleRemove}
              className={cn(
                "absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full",
                "bg-destructive text-destructive-foreground shadow-sm",
                "hover:bg-destructive/90 transition-colors",
              )}
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {/* Camera overlay on hover */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <User
              className="text-muted-foreground/50"
              style={{ width: size * 0.4, height: size * 0.4 }}
            />
            <span className="text-[10px] text-muted-foreground/60">Photo</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
      />

      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
