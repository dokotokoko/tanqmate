import React from 'react';
import LegalDocument from '../components/Legal/LegalDocument';
import externalServicesContent from '../content/legal/external-services.md?raw';

const ExternalServicesPage: React.FC = () => (
  <LegalDocument title="外部サービス一覧（別表1）" content={externalServicesContent} />
);

export default ExternalServicesPage;
