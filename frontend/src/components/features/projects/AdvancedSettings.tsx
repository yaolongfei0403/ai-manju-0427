"use client";

import { useState, useEffect } from "react";

interface AdvancedSettingsProps {
  samplingSteps: number;
  cfgScale: number;
  shareAssets: boolean;
  onSamplingStepsChange: (value: number) => void;
  onCfgScaleChange: (value: number) => void;
  onShareAssetsChange: (value: boolean) => void;
}

export default function AdvancedSettings({
  samplingSteps,
  cfgScale,
  shareAssets,
  onSamplingStepsChange,
  onCfgScaleChange,
  onShareAssetsChange,
}: AdvancedSettingsProps) {
  const [localSampling, setLocalSampling] = useState(samplingSteps.toString());
  const [localCfg, setLocalCfg] = useState(cfgScale.toString());

  useEffect(() => {
    setLocalSampling(samplingSteps.toString());
  }, [samplingSteps]);

  useEffect(() => {
    setLocalCfg(cfgScale.toString());
  }, [cfgScale]);

  const handleSamplingChange = (value: string) => {
    setLocalSampling(value);
    const num = parseInt(value);
    if (!isNaN(num) && num >= 20 && num <= 50) {
      onSamplingStepsChange(num);
    }
  };

  const handleCfgChange = (value: string) => {
    setLocalCfg(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 1 && num <= 15) {
      onCfgScaleChange(num);
    }
  };

  // Calculate percentage for slider background
  const samplingPercent = ((samplingSteps - 20) / (50 - 20)) * 100;
  const cfgPercent = ((cfgScale - 1) / (15 - 1)) * 100;

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="section-badge bg-surface border border-white/10 text-slate-400">
          <i className="fas fa-sliders text-[10px]" />
          <span>高级设置</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-white/10 text-slate-500">可选</span>
      </div>

      <div className="space-y-5">
        {/* Sampling Steps */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
              采样步数
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="20"
                max="50"
                value={samplingSteps}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onSamplingStepsChange(val);
                }}
                className="flex-1 h-1 bg-surface-light rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #6366f1 ${samplingPercent}%, #334155 ${samplingPercent}%)`,
                }}
              />
              <span className="text-sm text-white font-mono w-8 text-right">{samplingSteps}</span>
            </div>
          </div>

          {/* CFG Scale */}
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
              CFG Scale
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={cfgScale}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  onCfgScaleChange(val);
                }}
                className="flex-1 h-1 bg-surface-light rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #6366f1 ${cfgPercent}%, #334155 ${cfgPercent}%)`,
                }}
              />
              <span className="text-sm text-white font-mono w-8 text-right">{cfgScale}</span>
            </div>
          </div>
        </div>

        {/* Share Assets Toggle */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-surface/30 border border-white/5">
          <input
            type="checkbox"
            id="shareAssets"
            checked={shareAssets}
            onChange={(e) => onShareAssetsChange(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-transparent text-primary focus:ring-primary focus:ring-offset-0 mt-0.5 cursor-pointer"
          />
          <div>
            <label htmlFor="shareAssets" className="text-sm text-white font-medium cursor-pointer">
              项目内资产共享
            </label>
            <p className="text-xs text-slate-400 mt-1">
              开启后，从小说中提取的角色、场景、道具等资产将在项目内所有分集中共享使用。建议保持开启。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
