import { useCallback, useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, TextLayer } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "./PdfViewer.css";

GlobalWorkerOptions.workerSrc = workerSrc;

const BASE_SCALE = 1.3;
const ZOOM_STEP = 0.2;
const MIN_ZOOM = 0.7;
const MAX_ZOOM = 2.6;

function PageView({ pdf, pageNumber, zoom, registerPageRef }) {
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const containerRef = useRef(null);
  const [shouldRender, setShouldRender] = useState(false);
  const renderTaskRef = useRef(null);
  const textLayerInstanceRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setShouldRender(true);
      },
      { rootMargin: "800px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldRender) return undefined;
    let cancelled = false;

    async function render() {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: zoom });

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      containerRef.current.style.width = `${viewport.width}px`;
      containerRef.current.style.height = `${viewport.height}px`;

      renderTaskRef.current?.cancel();
      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
      const task = page.render({ canvasContext: ctx, viewport, transform });
      renderTaskRef.current = task;
      await task.promise;
      if (cancelled) return;

      textLayerInstanceRef.current?.cancel();
      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = "";
        textLayerRef.current.style.width = `${viewport.width}px`;
        textLayerRef.current.style.height = `${viewport.height}px`;
      }
      const textContent = await page.getTextContent();
      if (cancelled || !textLayerRef.current) return;
      const textLayer = new TextLayer({
        textContentSource: textContent,
        container: textLayerRef.current,
        viewport,
      });
      textLayerInstanceRef.current = textLayer;
      await textLayer.render();
    }

    render().catch((err) => {
      if (err?.name !== "RenderingCancelledException") console.error(err);
    });

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      textLayerInstanceRef.current?.cancel();
    };
  }, [pdf, pageNumber, zoom, shouldRender]);

  return (
    <div
      className="pdf-page"
      ref={(el) => {
        containerRef.current = el;
        registerPageRef(pageNumber, el);
      }}
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} />
      <div className="textLayer" ref={textLayerRef} />
      {!shouldRender && <div className="pdf-page__placeholder">ページ {pageNumber}</div>}
    </div>
  );
}

export default function PdfViewer({ fileUrl, onSelectionChange, onVisiblePageChange }) {
  const [pdf, setPdf] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(BASE_SCALE);
  const [error, setError] = useState(null);
  const pageRefs = useRef(new Map());
  const scrollRootRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setError(null);
    const loadingTask = getDocument(fileUrl);
    loadingTask.promise
      .then((doc) => {
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
      loadingTask.destroy();
    };
  }, [fileUrl]);

  useEffect(() => {
    function handleSelectionChange() {
      const selection = document.getSelection();
      const text = selection?.toString().trim() ?? "";
      if (!text || selection.rangeCount === 0 || !scrollRootRef.current) {
        onSelectionChange(null);
        return;
      }
      const anchorNode = selection.anchorNode;
      if (!anchorNode || !scrollRootRef.current.contains(anchorNode)) {
        onSelectionChange(null);
        return;
      }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        onSelectionChange(null);
        return;
      }
      onSelectionChange({ text, rect });
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [onSelectionChange]);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return undefined;
    function handleScroll() {
      onSelectionChange(null);
    }
    root.addEventListener("scroll", handleScroll, { passive: true });
    return () => root.removeEventListener("scroll", handleScroll);
  }, [onSelectionChange]);

  useEffect(() => {
    if (!onVisiblePageChange || !numPages) return undefined;
    const root = scrollRootRef.current;
    if (!root) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const pageNumber = Number(visible[0].target.dataset.pageNumber);
        if (pageNumber) onVisiblePageChange(pageNumber);
      },
      { root, threshold: [0.3, 0.6] }
    );
    for (const el of pageRefs.current.values()) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [numPages, onVisiblePageChange]);

  const registerPageRef = useCallback((pageNumber, el) => {
    if (el) pageRefs.current.set(pageNumber, el);
    else pageRefs.current.delete(pageNumber);
  }, []);

  if (error) {
    return <div className="pdf-viewer__error">PDFの読み込みに失敗しました: {error}</div>;
  }

  return (
    <div className="pdf-viewer">
      <div className="pdf-viewer__toolbar">
        <button type="button" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}>
          −
        </button>
        <span>{Math.round((zoom / BASE_SCALE) * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}>
          ＋
        </button>
        {numPages > 0 && <span className="pdf-viewer__pages">全 {numPages} ページ</span>}
      </div>
      <div className="pdf-viewer__scroll" ref={scrollRootRef}>
        {!pdf && <div className="pdf-viewer__loading">読み込み中…</div>}
        {pdf &&
          Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
            <PageView
              key={pageNumber}
              pdf={pdf}
              pageNumber={pageNumber}
              zoom={zoom}
              registerPageRef={registerPageRef}
            />
          ))}
      </div>
    </div>
  );
}
