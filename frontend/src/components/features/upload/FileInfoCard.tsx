"use client";

interface FileMeta {
  id: string;
  name: string;
  size: number;
  format: string;
  estimatedWords: number;
  title?: string | null;
  author?: string | null;
  genre?: string | null;
  style?: string | null;
}

interface FileInfoCardProps {
  file: FileMeta;
  onRemove: () => void;
  onReUpload: (file: File) => void;
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + " B";
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }
}

// 格式化预估字数
function formatEstimatedWords(words: number): string {
  if (words < 10000) {
    return `约 ${words} 字`;
  } else if (words < 100000) {
    return `约 ${(words / 10000).toFixed(1)} 万字`;
  } else if (words < 1000000) {
    return `约 ${Math.floor(words / 10000)} 万字`;
  } else {
    return `约 ${(words / 10000).toFixed(0)} 万字`;
  }
}

// 获取格式对应的图标
function getFormatIcon(format: string): { icon: string; color: string } {
  switch (format.toLowerCase()) {
    case "txt":
    case "text/plain":
      return { icon: "fa-file-alt", color: "text-blue-400" };
    case "md":
    case "markdown":
    case "text/markdown":
    case "text/x-markdown":
      return { icon: "fa-file-code", color: "text-emerald-400" };
    default:
      return { icon: "fa-file", color: "text-slate-400" };
  }
}

export default function FileInfoCard({ file, onRemove, onReUpload }: FileInfoCardProps) {
  const formatIcon = getFormatIcon(file.format);
  const estimatedWordsDisplay = formatEstimatedWords(file.estimatedWords);

  const handleReUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && onReUpload) {
      onReUpload(selectedFile);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  return (
    <div className="has-file rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 p-6">
      <div className="flex items-center gap-4">
        {/* 文件图标 */}
        <div
          className={`w-14 h-14 rounded-xl ${formatIcon.color} bg-current/10 flex items-center justify-center`}
          style={{ backgroundColor: "rgba(16, 185, 129, 0.1)" }}
        >
          <i className={`fas ${formatIcon.icon} text-2xl`} style={{ color: "#34d399" }} />
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{file.title || file.name}</h3>
          {(file.author || file.genre) && (
            <div className="text-xs text-slate-400 mt-0.5">
              {file.author && <span>作者: {file.author}</span>}
              {file.author && file.genre && <span> · </span>}
              {file.genre && <span>{file.genre}</span>}
            </div>
          )}
          <div className="flex items-center gap-4 mt-1 text-sm">
            <span className="text-slate-400">
              <i className="fas fa-hdd mr-1" />
              {formatFileSize(file.size)}
            </span>
            <span className="text-slate-400">
              <i className="fas fa-font mr-1" />
              {estimatedWordsDisplay}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}
            >
              {file.format.toUpperCase()}
            </span>
          </div>
        </div>

        {/* 上传成功标识 */}
        <div className="flex items-center gap-2 text-emerald-400">
          <i className="fas fa-check-circle" />
          <span className="text-sm font-medium">上传成功</span>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5">
        <button
          onClick={onRemove}
          className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <i className="fas fa-trash-alt mr-2" />
          删除
        </button>
        <label className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer">
          <i className="fas fa-redo mr-2" />
          重新上传
          <input
            type="file"
            accept=".txt,.md,.markdown,text/plain,text/markdown"
            className="hidden"
            onChange={handleReUploadChange}
          />
        </label>
      </div>
    </div>
  );
}