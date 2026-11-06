import { useRef, useState } from 'react';

interface ImageUploaderProps {
  onFileSelected: (file: File) => void;
  onRemove: () => void;
  selectedFileName?: string;
}

export default function ImageUploader({ onFileSelected, onRemove, selectedFileName }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      onFileSelected(selectedFile);
    }
    event.target.value = '';
  };

  return (
    <div>
      <div
        className={`upload-box ${isDragging ? 'dragging' : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          const droppedFile = event.dataTransfer.files?.[0];
          if (droppedFile) {
            onFileSelected(droppedFile);
          }
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          className="hidden-input"
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFileInput}
        />

        <div className="upload-icon" aria-hidden="true">⬆</div>
        <p className="upload-title">{selectedFileName ? 'Replace image' : 'Upload a low-light image'}</p>
        <p className="upload-subtitle">PNG, JPG, or JPEG up to 10 MB</p>

        {selectedFileName && (
          <div className="upload-meta">
            <span>{selectedFileName}</span>
            <button
              type="button"
              className="text-button"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
