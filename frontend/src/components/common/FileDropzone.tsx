import { useCallback, useState, useRef, type DragEvent } from 'react';
import { Upload, FileIcon } from 'lucide-react';
import { cn } from '@/utils/helpers';
import { formatFileSize } from '@/utils/formatters';
import { validateFile } from '@/utils/validators';
import toast from 'react-hot-toast';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  selectedFile?: File | null;
  accept?: string;
}

export function FileDropzone({ onFileSelect, selectedFile, accept }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={cn('dropzone', isDragging && 'active')}
    >
      <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

      {selectedFile ? (
        <div className="flex flex-col items-center gap-2">
          <FileIcon className="h-10 w-10 text-blue-400" />
          <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
          <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
          <p className="text-xs text-blue-400">Cliquez pour changer</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="h-10 w-10 text-slate-500" />
          <p className="text-sm text-slate-300">
            <span className="font-medium text-blue-400">Cliquez pour sélectionner</span> ou glissez un fichier ici
          </p>
          <p className="text-xs text-slate-500">PDF, Word, Excel, Images — 50 Mo max</p>
        </div>
      )}
    </div>
  );
}
