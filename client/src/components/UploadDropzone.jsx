import { useCallback, useRef, useState } from "react";
import "./UploadDropzone.css";

export default function UploadDropzone({ onUpload, uploading }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (fileList) => {
      const file = fileList?.[0];
      if (file && file.type === "application/pdf") {
        onUpload(file);
      }
    },
    [onUpload]
  );

  return (
    <div
      className={`dropzone ${isDragOver ? "dropzone--over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {uploading ? (
        <p>アップロード中…</p>
      ) : (
        <>
          <p className="dropzone__title">PDFをドラッグ&ドロップ、またはタップして選択</p>
          <p className="dropzone__hint">論文はライブラリに自動で追加されます</p>
        </>
      )}
    </div>
  );
}
