"use client";

import { usePathname, useRouter } from "next/navigation";

const STEPS = [
  { num: 1, icon: "fa-upload", label: "上传小说", sub: "TXT/DOCX", path: "/upload" },
  { num: 2, icon: "fa-file-shield", label: "免责确认", sub: "版权授权", path: "/upload/disclaimer" },
  { num: 3, icon: "fa-scissors", label: "拆解分集", sub: "智能拆分", path: "/upload/strategy" },
  { num: 4, icon: "fa-robot", label: "提取资产", sub: "角色场景道具", path: "/upload/strategy" },
  { num: 5, icon: "fa-list-check", label: "确认资产", sub: "编辑筛选", path: "/upload/strategy" },
  { num: 6, icon: "fa-wand-magic-sparkles", label: "批量生产", sub: "生成参考图", path: "/upload/strategy" },
  { num: 7, icon: "fa-check-double", label: "入资产库", sub: "完成入库", path: "/upload/strategy" },
];

export default function StepNav() {
  const pathname = usePathname();
  const router = useRouter();

  const currentStep = getCurrentStep(pathname);

  const handleStepClick = (step: (typeof STEPS)[number]) => {
    if (step.num <= currentStep) {
      router.push(step.path);
    }
  };

  return (
    <div className="h-[72px] md:h-20 glass-panel-strong border-b border-white/5 flex items-center z-40 fixed top-[112px] left-0 right-0 flex-shrink-0 overflow-x-auto custom-scroll">
      <div className="flex items-center max-w-5xl w-full px-3 md:px-6 mx-auto gap-1 md:gap-2">
        {STEPS.map((step, index) => {
          const status = step.num < currentStep ? "completed" : step.num === currentStep ? "active" : "pending";
          return (
            <div key={step.num} className="flex items-center">
              <button
                type="button"
                className={`flex items-center gap-2 flex-shrink-0 px-1.5 py-1.5 rounded-xl transition-all ${
                  step.num <= currentStep ? "hover:bg-white/[0.03] cursor-pointer" : "cursor-default"
                }`}
                onClick={() => handleStepClick(step)}
                disabled={step.num > currentStep}
              >
                <div
                  className={`step-badge ${status} w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-bold text-xs`}
                >
                  {step.num < currentStep ? (
                    <i className="fas fa-check text-xs" />
                  ) : (
                    <i className={`fas ${step.icon}`} />
                  )}
                </div>
                <div className="step-text-short hidden lg:block">
                  <div
                    className={`text-xs md:text-sm font-semibold whitespace-nowrap ${
                      status === "active" ? "text-white" : status === "completed" ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </div>
                  <div className="text-[10px] text-slate-400 whitespace-nowrap">{step.sub}</div>
                </div>
              </button>
              {index < STEPS.length - 1 && (
                <div className="w-5 md:w-8 h-0.5 mx-0.5 bg-surface-light rounded-full overflow-hidden flex-shrink-0 step-line-dot">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: step.num < currentStep ? "100%" : "0%",
                      background: "linear-gradient(to right, #6366f1, #8b5cf6)",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getCurrentStep(pathname: string): number {
  if (pathname.includes("/upload/disclaimer")) return 2;
  if (pathname.includes("/upload/strategy/executing")) return 3;
  if (pathname.includes("/upload/split-result")) return 3;
  if (pathname.includes("/upload/strategy")) return 3;
  return 1;
}
