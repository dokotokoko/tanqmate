import React from 'react';
import LegalDocument from '../components/Legal/LegalDocument';
import termsOfServiceContent from '../content/legal/terms-of-service.md?raw';

const TermsOfServicePage: React.FC = () => (
  <LegalDocument title="利用規約" content={termsOfServiceContent} />
);

export default TermsOfServicePage;
