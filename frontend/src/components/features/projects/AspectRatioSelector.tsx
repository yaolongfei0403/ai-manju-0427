"use client";

import { useState, useEffect } from "react";

// Aspect ratio options
const ASPECT_RATIOS = [
  { code: "16:9", name: "横屏宽画幅", width: 1024, height: 576, recommended: true },
  { code: "9:16", name: "竖屏短视频", width: 576, height: 1024, recommended: false },
  { code: "1:1", name: "方形构图", width: 1024, height: 1024, recommended: false },
  { code: "4:3", name: "标准画幅", width: 1024, height: 768, recommended: false },
];

interface AspectRatioSelectorProps {
  selectedRatio: string;
  width: number;
  height: number;
  onRatioChange: (ratio: string, width: number, height: number) => void;
  onDimensionChange: (width: number, height: number) => void;
}

export default function AspectRatioSelector({
  selectedRatio,
  width,
  height,
  onRatioChange,
  onDimensionChange,
}: AspectRatioSelectorProps) {
  const [customW, setCustomW] = useState(width.toString());
  const [customH, setCustomH] = useState(height.toString());

  useEffect(() => {
    setCustomW(width.toString());
    setCustomH(height.toString());
  }, [width, height]);

  const handleRatioSelect = (ratio: typeof ASPECT_RATIOS[0]) => {
    onRatioChange(ratio.code, ratio.width, ratio.height);
    setCustomW(ratio.width.toString());
    setCustomH(ratio.height.toString());
  };

  const handleCustomChange = (w: string, h: string) => {
    setCustomW(w);
    setCustomH(h);
    const wNum = parseInt(w) || 0;
    const hNum = parseInt(h) || 0;
    if (wNum > 0 && hNum > 0) {
      onDimensionChange(wNum, hNum);
    }
  };

  // Calculate GCD for ratio display
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const ratioDisplay = () => {
    if (width === 0 || height === 0) return "—";
    const g = gcd(width, height);
    return `${width/g}:${height/g}`;
  };

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="section-badge bg-cyan/10 text-cyan border border-cyan/20">
            <i className="fas fa-crop-simple text-[10px]" />
            <span>画面尺寸</span>
          </div>
        </div>
        <span className="text-xs text-slate-500">决定分镜图的分辨率与宽高比</span>
      </div>

      {/* Ratio Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {ASPECT_RATIOS.map((ratio) => (
          <div
            key={ratio.code}
            onClick={() => handleRatioSelect(ratio)}
            className={`ratio-card rounded-xl border bg-surface/30 p-4 text-center cursor-pointer ${
              selectedRatio === ratio.code ? "active" : ""
            }`}
            style={{
              borderColor: selectedRatio === ratio.code ? "#6366f1" : "rgba(255,255,255,0.1)",
              background: selectedRatio === ratio.code ? "rgba(99,102,241,0.08)" : undefined,
            }}
          >
            <div
              className="bg-surface border border-white/10 rounded-lg mb-3 mx-auto flex items-center justify-center text-[10px] text-slate-500"
              style={{
                width: "60px",
                height: ratio.code === "9:16" ? "107px" : ratio.code === "1:1" ? "60px" : ratio.code === "4:3" ? "45px" : "60px",
              }}
            >
              {ratio.code}
            </div>
            <div className="text-sm font-medium text-white">{ratio.name}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{ratio.width} × {ratio.height}</div>
            {ratio.recommended && (
              <div className="text-[10px] text-emerald-400 mt-1">
                <i className="fas fa-check mr-1" />
                推荐
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Custom Dimensions */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
            自定义宽度
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customW}
              onChange={(e) => handleCustomChange(e.target.value, customH)}
              className="input-field w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-sm text-white focus:outline-none text-center font-mono"
              min={64}
              max={4096}
            />
            <span className="text-slate-500 text-sm">px</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
            自定义高度
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={customH}
              onChange={(e) => handleCustomChange(customW, e.target.value)}
              className="input-field w-full px-4 py-2.5 bg-surface border border-white/10 rounded-xl text-sm text-white focus:outline-none text-center font-mono"
              min={64}
              max={4096}
            />
            <span className="text-slate-500 text-sm">px</span>
          </div>
        </div>
      </div>

      {/* Current Ratio Display */}
      <div className="mt-4 text-xs text-slate-500 text-center">
        当前比例: <span className="text-white font-mono">{ratioDisplay()}</span>
      </div>
    </div>
  );
}
