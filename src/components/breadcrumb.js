import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import './breadcrumb.css';

/**
 * Breadcrumb component with JSON-LD structured data for SEO
 * Automatically generates breadcrumb navigation based on current route
 */

// Route name mappings for display
const ROUTE_NAMES = {
  '': 'Home',
  'modules': 'Modules',
  'blog': 'Blog',
  'request-demo': 'Request Demo',
  'tailored-pilots': 'Tailored Pilots',
  'expert-consultation': 'Expert Consultation',
  'compliance-privacy': 'Compliance & Privacy',
  'unsubscribe': 'Unsubscribe',
};

const Breadcrumb = ({ customItems, showHome = true }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  
  // Skip breadcrumbs on homepage
  if (pathnames.length === 0 && !customItems) {
    return null;
  }

  // Build breadcrumb items
  let breadcrumbItems = [];
  
  if (showHome) {
    breadcrumbItems.push({
      name: 'Home',
      url: 'https://finaceverse.io/',
      path: '/',
    });
  }

  if (customItems) {
    // Use custom items if provided
    breadcrumbItems = [...breadcrumbItems, ...customItems];
  } else {
    // Auto-generate from path
    let currentPath = '';
    pathnames.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const name = ROUTE_NAMES[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      breadcrumbItems.push({
        name,
        url: `https://finaceverse.io${currentPath}`,
        path: currentPath,
        isLast: index === pathnames.length - 1,
      });
    });
  }

  // Generate JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      <nav className="breadcrumb" aria-label="Breadcrumb navigation">
        <ol className="breadcrumb-list" itemScope itemType="https://schema.org/BreadcrumbList">
          {breadcrumbItems.map((item, index) => (
            <li 
              key={item.path} 
              className="breadcrumb-item"
              itemProp="itemListElement" 
              itemScope 
              itemType="https://schema.org/ListItem"
            >
              {item.isLast || index === breadcrumbItems.length - 1 ? (
                <span 
                  className="breadcrumb-current" 
                  itemProp="name"
                  aria-current="page"
                >
                  {item.name}
                </span>
              ) : (
                <>
                  <Link 
                    to={item.path} 
                    className="breadcrumb-link"
                    itemProp="item"
                  >
                    <span itemProp="name">{item.name}</span>
                  </Link>
                  <span className="breadcrumb-separator" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6"/>
                    </svg>
                  </span>
                </>
              )}
              <meta itemProp="position" content={String(index + 1)} />
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumb;
