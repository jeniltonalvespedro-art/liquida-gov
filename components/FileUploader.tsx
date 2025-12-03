import React from 'react';

interface FileUploaderProps {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  icon?: React.ReactNode;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ label, file, onFileChange, accept = "image/*,application/pdf", icon }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0]);
    }
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors
        ${file ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 bg-white'}`}>
        
        {file ? (
          <div className="text-center w-full">
            <div className="flex items-center justify-center text-blue-600 mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-900 truncate max-w-xs mx-auto">{file.name}</p>
            <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
            <button 
              onClick={() => onFileChange(null)}
              className="mt-3 text-xs text-red-600 hover:text-red-800 underline"
            >
              Remover arquivo
            </button>
          </div>
        ) : (
          <label className="cursor-pointer w-full flex flex-col items-center">
            <div className="text-slate-400 mb-3">
              {icon || (
                <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <span className="text-sm text-blue-600 font-medium hover:underline">Clique para selecionar</span>
            <span className="text-xs text-slate-500 mt-1">PDF ou Imagem (JPG, PNG)</span>
            <input 
              type="file" 
              className="hidden" 
              onChange={handleFileChange}
              accept={accept}
            />
          </label>
        )}
      </div>
    </div>
  );
};