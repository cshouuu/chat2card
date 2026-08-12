import { useEffect, useRef, useState, ReactNode } from 'react';

interface PreviewProps {
  children: (ref: React.RefObject<HTMLDivElement>) => ReactNode;
}

const CARD_WIDTH = 760;

/** 预览容器:卡片固定 760px,按容器宽度自动缩放(zoom 布局缩放,兼容 Chrome/Edge/Firefox) */
export default function Preview({ children }: PreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setZoom(Math.min(1, el.clientWidth / CARD_WIDTH));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section className="panel panel-preview" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="panel-head">
        <h2>
          <span className="panel-dot" /> 预览
        </h2>
        <span className="panel-hint">导出图片宽度 760px,适合分享</span>
      </div>
      <div
        ref={containerRef}
        className="preview-scroll"
        style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 24 }}
      >
        <div
          style={{
            zoom,
            width: CARD_WIDTH,
            margin: '0 auto',
            transformOrigin: 'top left',
          }}
        >
          {children(cardRef)}
        </div>
      </div>
    </section>
  );
}
