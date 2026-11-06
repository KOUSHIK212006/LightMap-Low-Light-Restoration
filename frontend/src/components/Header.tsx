interface HeaderProps {
  backendHealthy: boolean | null;
}

export default function Header({ backendHealthy }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-top">
        <div className="brand-wrap">
          <div className="brand-mark">LM</div>
          <div>
            <div className="brand">LightMap</div>
            <div className="brand-tag">Explainable Low-Light Image Restoration</div>
          </div>
        </div>

        <div className="status-cluster">
          <span className={`system-status ${backendHealthy === false ? 'offline' : 'online'}`}>
            <span className="status-dot" />
            {backendHealthy === false ? 'Backend offline' : 'System online'}
          </span>
        </div>
      </div>

      <div className="hero-section">
        <div>
          <p className="eyebrow">Recovery-aware CV workflow</p>
          <h1 className="title">Restore What Darkness Hides.</h1>
        </div>
        <p className="subtitle">
          Review low-light scenes, compare restoration profiles, and inspect the explainability signals behind each result.
        </p>
      </div>
    </header>
  );
}
