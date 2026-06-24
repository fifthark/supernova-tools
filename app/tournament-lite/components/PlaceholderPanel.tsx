export default function PlaceholderPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="tlite-placeholder">
      <h2 className="tlite-placeholder-title">{title}</h2>
      <p className="tlite-placeholder-text">{description}</p>
      <span className="tlite-placeholder-badge">Coming soon</span>
    </div>
  );
}
