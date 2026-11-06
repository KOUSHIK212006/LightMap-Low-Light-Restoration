interface ImagePreviewProps {
  imageSrc?: string;
  label: string;
}

export default function ImagePreview({ imageSrc, label }: ImagePreviewProps) {
  return (
    <div className="preview-card">
      <div className="preview-header">{label}</div>
      {imageSrc ? (
        <img className="preview-image" src={imageSrc} alt={label} />
      ) : (
        <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', color: '#94a3b8', padding: 20 }}>
          No image selected yet.
        </div>
      )}
    </div>
  );
}
