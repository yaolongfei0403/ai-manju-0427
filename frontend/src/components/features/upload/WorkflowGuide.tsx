"use client";

interface WorkflowGuideProps {
  currentStep?: number;
}

export function WorkflowGuide({ currentStep = 1 }: WorkflowGuideProps) {
  const steps = [
    {
      number: 1,
      title: "编辑提示词",
      description: "在此页面修改或润色每个资产的生成提示词",
      color: "#6366f1",
      colorVar: "primary",
    },
    {
      number: 2,
      title: "批量生产",
      description: "根据提示词批量生成资产参考图",
      color: "#06b6d4",
      colorVar: "cyan",
    },
    {
      number: 3,
      title: "审核入库",
      description: "不满意可重新生成，满意后确认入库",
      color: "#10b981",
      colorVar: "emerald",
    },
  ];

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{
        backgroundColor: "rgba(99, 102, 241, 0.05)",
        border: "1px solid rgba(99, 102, 241, 0.15)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ backgroundColor: "rgba(99, 102, 241, 0.2)" }}
        >
          <i className="fas fa-lightbulb text-primary text-sm" style={{ color: "#6366f1" }}></i>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white mb-2">资产生成工作流程</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {steps.map((step) => (
              <div key={step.number} className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${step.color}20` }}
                >
                  <span className="text-[10px] font-bold" style={{ color: step.color }}>
                    {step.number}
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  <span className="text-white font-medium">{step.title}</span>
                  <p className="text-slate-500 mt-0.5">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
