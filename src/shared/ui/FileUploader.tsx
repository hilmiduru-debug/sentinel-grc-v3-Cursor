import { FileText, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';

interface FileUploaderProps {
  label?: string;
  compact?: boolean;
  onUpload?: (files: File[]) => void;
  accept?: Record<string, string[]> | string;
  maxSize?: number; // bytes
}

export function FileUploader({
  label = 'Dosya Yükle',
  compact = false,
  onUpload,
  accept,
  maxSize,
}: FileUploaderProps) {
  const [mockFiles, setMockFiles] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build accept string for <input>
  const acceptStr = typeof accept === 'string'
    ? accept
    : accept ? Object.keys(accept).join(',') : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    if (onUpload) {
      onUpload(selected);
    } else {
      setMockFiles((prev) => [...prev, ...selected.map((f) => f.name)]);
    }
    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleMockClick = () => {
    if (inputRef.current) {
      inputRef.current.click();
    } else {
      const mockFile = `Kanıt_Dokumanı_${Math.floor(Math.random() * 100)}.pdf`;
      setMockFiles((prev) => [...prev, mockFile]);
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={acceptStr}
        className="hidden"
        onChange={handleChange}
      />

      <div className={compact ? '' : 'flex items-center justify-between'}>
        {!compact && (
          <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        )}
        <button
          type="button"
          onClick={handleMockClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all"
        >
          <Upload size={12} />
          {compact ? label : 'Seç'}
        </button>
      </div>

      {mockFiles.length > 0 && (
        <div className="space-y-2">
          {mockFiles.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-canvas border border-slate-200 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-indigo-500" />
                <span className="font-medium text-slate-700">{file}</span>
              </div>
              <button
                type="button"
                onClick={() => setMockFiles(mockFiles.filter((_, i) => i !== idx))}
                className="text-slate-400 hover:text-red-500"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}