import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../api/client';
import type { Business } from '../types/business';
import type { Package, Service } from '../types/catalog';
import type { Profile } from '../types/user';
import './Setup.css';

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BusinessIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 21v-4h6v4M9 8h1M14 8h1M9 12h1M14 12h1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PackagesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Setup() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[] | null>(null);
  const [packages, setPackages] = useState<Package[] | null>(null);

  useEffect(() => {
    apiGet<Profile>('/api/auth/me').then(setProfile).catch(() => setProfile(null));
    apiGet<Business>('/api/business').then(setBusiness).catch(() => setBusiness(null));
    apiGet<Service[]>('/api/services?active=true').then(setServices).catch(() => setServices(null));
    apiGet<Package[]>('/api/packages').then(setPackages).catch(() => setPackages(null));
  }, []);

  const businessComplete = Boolean(business?.phone);
  const profileComplete = Boolean(profile?.firstName);

  const cards = [
    {
      to: '/profile',
      icon: <PersonIcon />,
      title: 'Personal Profile',
      description: 'Your own name and sign-in email — separate from the studio details.',
      status: profile === null ? 'Loading…' : profileComplete ? 'Complete' : 'Needs setup',
      complete: profileComplete,
    },
    {
      to: '/business',
      icon: <BusinessIcon />,
      title: 'Business Profile',
      description: 'Your business name, logo, contact details, and default proposal terms.',
      status: business === null ? 'Loading…' : businessComplete ? 'Complete' : 'Needs setup',
      complete: businessComplete,
    },
    {
      to: '/services',
      icon: <ServicesIcon />,
      title: 'Services',
      description: 'The catalog of individual services you can add to a proposal.',
      status: services === null ? 'Loading…' : `${services.length} service${services.length === 1 ? '' : 's'}`,
      complete: (services?.length ?? 0) > 0,
    },
    {
      to: '/packages',
      icon: <PackagesIcon />,
      title: 'Packages',
      description: 'Bundles of services you can add to a proposal as one line item.',
      status: packages === null ? 'Loading…' : `${packages.length} package${packages.length === 1 ? '' : 's'}`,
      complete: (packages?.length ?? 0) > 0,
    },
  ];

  return (
    <div className="su-container">
      <div className="su-page-header">
        <h1 className="su-title">Setup</h1>
        <p className="su-subtitle">
          Configure your business profile and catalog before building proposals.
        </p>
      </div>

      <div className="su-grid">
        {cards.map((card) => (
          <Link to={card.to} className="su-card" key={card.to}>
            <div className="su-card-icon">{card.icon}</div>
            <div className="su-card-body">
              <div className="su-card-title-row">
                <span className="su-card-title">{card.title}</span>
                <span className={'su-card-status' + (card.complete ? ' su-card-status-complete' : '')}>
                  {card.status}
                </span>
              </div>
              <p className="su-card-desc">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
