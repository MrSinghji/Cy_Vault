interface PageHeaderProps {
  title: string;
  description?: string;
  mockBanner?: boolean; // shown on every page until real data lands (F3+)
}

export default function PageHeader({ title, description, mockBanner = true }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {mockBanner && (
        <span className="mock-banner" title="Feature 1 uses mock data only">
          MOCK DATA
        </span>
      )}
    </div>
  );
}
