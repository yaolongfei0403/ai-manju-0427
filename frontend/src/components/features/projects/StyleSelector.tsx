"use client";

import { useState } from "react";

// Style options
const STYLES = [
  { code: "scifi-real", name: "写实科幻", desc: "电影级质感，真实光影", image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&auto=format&fit=crop&q=60" },
  { code: "anime", name: "二次元动漫", desc: "日系画风，鲜明色彩", image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=60" },
  { code: "ink", name: "国风水墨", desc: "水墨意境，东方美学", image: "https://images.unsplash.com/photo-1515405295579-ba7b45403062?w=400&auto=format&fit=crop&q=60" },
  { code: "comic", name: "欧美漫画", desc: "美漫风格，强烈对比", image: "https://images.unsplash.com/photo-1612036782180-6f0b6cd846fe?w=400&auto=format&fit=crop&q=60" },
  { code: "pixel", name: "像素风格", desc: "复古像素，游戏质感", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&auto=format&fit=crop&q=60" },
  { code: "3d", name: "3D渲染", desc: "C4D质感，立体光影", image: "https://images.unsplash.com/photo-1633218388467-539651dcf81a?w=400&auto=format&fit=crop&q=60" },
  { code: "sketch", name: "手绘素描", desc: "铅笔质感，艺术线条", image: "https://images.unsplash.com/photo-1544531585-9847b68c8c86?w=400&auto=format&fit=crop&q=60" },
  { code: "custom", name: "自定义风格", desc: "上传参考图定义", image: null },
];

// Style tags
const STYLE_TAGS = [
  "赛博朋克", "太空歌剧", "未来都市", "机甲", "异星文明",
  "时间旅行", "人工智能", "末日废土", "基因改造", "量子科技",
  "魔法", "异世界", "冒险", "修仙", "古风", "神兽",
];

interface StyleSelectorProps {
  selectedStyle: string;
  styleTags: string[];
  coverUrl?: string;
  coverWidth?: number;
  coverHeight?: number;
  onStyleChange: (style: string) => void;
  onTagsChange: (tags: string[]) => void;
  onCoverChange: (url: string, width?: number, height?: number) => void;
}

export default function StyleSelector({
  selectedStyle,
  styleTags,
  coverUrl,
  coverWidth,
  coverHeight,
  onStyleChange,
  onTagsChange,
  onCoverChange,
}: StyleSelectorProps) {
  const [isUploading, setIsUploading] = useState(false);

  const toggleTag = (tag: string) => {
    if (styleTags.includes(tag)) {
      onTagsChange(styleTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...styleTags, tag]);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (response.ok && result.data?.url) {
        onCoverChange(result.data.url, result.data.width, result.data.height);
        // Automatically switch to custom style when uploading a cover
        if (selectedStyle !== "custom") {
          onStyleChange("custom");
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCover = () => {
    onCoverChange("", undefined, undefined);
  };

  // Get current style image (use uploaded cover for custom, otherwise use predefined)
  const currentStyle = STYLES.find((s) => s.code === selectedStyle);
  const displayImage = selectedStyle === "custom" && coverUrl ? coverUrl : currentStyle?.image;

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="section-badge bg-secondary/10 text-secondary border border-secondary/20">
            <i className="fas fa-palette text-[10px]" />
            <span>视觉风格</span>
          </div>
        </div>
        <span className="text-xs text-slate-500">选择后将作为项目默认风格，各分集可单独调整</span>
      </div>

      {/* Style Grid */}
      <div className="grid grid-cols-4 gap-4">
        {STYLES.map((style) => (
          <div
            key={style.code}
            onClick={() => {
              // Custom style without cover should open upload dialog
              if (style.code === "custom" && !coverUrl) {
                document.getElementById("custom-cover-upload")?.click();
              } else {
                onStyleChange(style.code);
              }
            }}
            className={`style-card rounded-xl border bg-surface/50 overflow-hidden cursor-pointer ${
              selectedStyle === style.code ? "active" : ""
            }`}
            style={{
              borderColor: selectedStyle === style.code ? "#6366f1" : "rgba(255,255,255,0.1)",
            }}
          >
            <div className="aspect-[4/3] relative">
              {style.code === "custom" ? (
                // Custom style - show upload interface
                coverUrl ? (
                  <>
                    <img src={coverUrl} alt="自定义封面" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white text-xs cursor-pointer hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          document.getElementById("custom-cover-upload")?.click();
                        }}
                      >
                        更换
                      </button>
                    </div>
                  </>
                ) : isUploading ? (
                  <div className="w-full h-full flex items-center justify-center bg-surface">
                    <i className="fas fa-circle-notch fa-spin text-primary text-lg" />
                  </div>
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center bg-surface/50 hover:bg-surface cursor-pointer transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById("custom-cover-upload")?.click();
                    }}
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center mb-1">
                      <i className="fas fa-plus text-slate-500 text-sm" />
                    </div>
                    <span className="text-[10px] text-slate-500">上传参考图</span>
                  </div>
                )
              ) : style.image ? (
                <img src={style.image} alt={style.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-surface">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center mx-auto mb-1">
                      <i className="fas fa-plus text-slate-500 text-sm" />
                    </div>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-sm font-bold text-white">{style.name}</div>
                <div className="text-[10px] text-slate-300 mt-0.5">{style.desc}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Style Tags */}
      <div className="mt-5">
        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
          风格关键词（多选）
        </label>
        <div className="flex flex-wrap gap-2">
          {STYLE_TAGS.map((tag) => (
            <span
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`tag-pill px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
                styleTags.includes(tag)
                  ? "bg-indigo-500/20 border-indigo-500 text-indigo-300"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-indigo-500/15"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Hidden file input for custom cover */}
      <input
        id="custom-cover-upload"
        type="file"
        accept="image/*"
        onChange={handleCoverUpload}
        className="hidden"
      />
    </div>
  );
}
