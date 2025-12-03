import React from 'react';
import { WorkflowStep } from '../types';

interface StepIndicatorProps {
  currentStep: WorkflowStep;
}

const steps = [
  { id: WorkflowStep.UPLOAD, label: 'Documentos' },
  { id: WorkflowStep.DATA_ENTRY, label: 'Dados' },
  { id: WorkflowStep.REVIEW, label: 'Liquidação' },
  { id: WorkflowStep.COMPLETED, label: 'Conclusão' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const getStepStatus = (stepId: WorkflowStep, index: number) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id, index);
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 
                ${status === 'completed' ? 'bg-blue-600 border-blue-600 text-white' : 
                  status === 'current' ? 'border-blue-600 text-blue-600 font-bold' : 
                  'border-slate-300 text-slate-400'}`}>
                {status === 'completed' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span className={`ml-2 text-sm font-medium ${status === 'current' ? 'text-blue-900' : 'text-slate-500'}`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className="w-8 h-0.5 mx-2 bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};