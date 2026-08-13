import { ReactNode, RefObject, useEffect, useRef, useState } from 'react';

interface PreviewProps {
  cardRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}

const CARD_WIDTH = 760;

export default function Preview({ cardRef: _cardRef, children }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [fitZoom, setFitZoom] = useState(1);
  const [zoomStep, setZoomStep] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setFitZoom(Math.min(1, Math.max(.42, (el.clientWidth - 72) / CARD_WIDTH)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const zoom = Math.min(1.25, Math.max(.35, fitZoom + zoomStep * .08));
  const zoomPercent = Math.round(zoom * 100);

  return (
    <section className="preview-panel">
      <div className="preview-head">
        <div>
          <div className="control-kicker">LIVE PREVIEW</div>
          <div className="preview-title-row">
            <h2>分享卡片预览</h2>
            <span className="preview-size">760px · 自动高度</span>
          </div>
        </div>
        <div className="zoom-control" aria-label="预览缩放">
          <button type="button" onClick={() => setZoomStep((value) => value - 1)} aria-label="缩小">−</button>
          <button type="button" className="zoom-value" onClick={() => setZoomStep(0)} title="恢复自适应缩放">{zoomPercent}%</button>
          <button type="button" onClick={() => setZoomStep((value) => value + 1)} aria-label="放大">＋</button>
        </div>
      </div>

      <div ref={containerRef} className="preview-canvas">
        <div
          className="preview-card-wrap"
          style={{
            zoom,
            width: CARD_WIDTH,
          }}
        >
          {children}
        </div>
      </div>

      <div className="preview-foot">
        <span><span className="live-dot" /> 所有修改都会实时同步</span>
        <span>PNG 导出使用原始 760px 宽度，不受预览缩放影响</span>
      </div>
    </section>
  );
}
