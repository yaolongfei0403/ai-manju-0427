"use client";

import { useState, useRef, useCallback } from "react";

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  uploadStatus: "idle" | "uploading" | "uploaded" | "error";
  error: string | null;
}

const ALLOWED_TYPES = ["text/plain", "text/markdown", "text/x-markdown"];
const ALLOWED_EXTENSIONS = [".txt", ".md", ".markdown"];
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export default function FileDropzone({
  onFileSelect,
  isUploading,
  uploadStatus,
  error,
}: FileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // 检查文件类型
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    const isValidType =
      ALLOWED_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension);

    if (!isValidType) {
      return "仅支持TXT/Markdown格式";
    }

    // 检查文件大小
    if (file.size > MAX_SIZE) {
      return "文件大小不能超过50MB";
    }

    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        alert(validationError);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const isDisabled = isUploading || uploadStatus === "uploading";

  return (
    <div className="w-full">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.markdown,text/plain,text/markdown"
        className="hidden"
        onChange={handleInputChange}
        disabled={isDisabled}
      />

      {/* 拖拽区域 */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          drop-zone relative rounded-2xl p-12 cursor-pointer
          flex flex-col items-center justify-center gap-4
          transition-all duration-200
          ${isDragOver ? "dragover" : ""}
          ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"}
        `}
      >
        {isUploading || uploadStatus === "uploading" ? (
          /* 上传中状态 */
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <i className="fas fa-spinner fa-spin text-primary text-2xl" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">上传中...</p>
              <p className="text-slate-400 text-sm mt-1">请稍候</p>
            </div>
          </div>
        ) : (
          /* 默认状态 */
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <i className="fas fa-cloud-upload-alt text-primary text-2xl" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium mb-1">
                拖拽小说文件到此处
              </p>
              <p className="text-slate-400 text-sm">
                或<span className="text-primary cursor-pointer hover:underline">点击选择文件</span>
              </p>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="px-3 py-1 rounded-full bg-surface border border-white/10 text-xs text-slate-400">
                <i className="fas fa-file-alt mr-1" />
                TXT
              </span>
              <span className="px-3 py-1 rounded-full bg-surface border border-white/10 text-xs text-slate-400">
                <i className="fas fa-file-code mr-1" />
                Markdown
              </span>
              <span className="px-3 py-1 rounded-full bg-surface border border-white/10 text-xs text-slate-400">
                <i className="fas fa-database mr-1" />
                最大 50MB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <p className="text-rose-400 text-sm text-center">
            <i className="fas fa-exclamation-circle mr-2" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
