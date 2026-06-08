import React from 'react';
import LegalDocument from '../components/Legal/LegalDocument';
import privacyPolicyContent from '../content/legal/privacy-policy.md?raw';

const PrivacyPolicyPage: React.FC = () => (
  <LegalDocument title="プライバシーポリシー" content={privacyPolicyContent} />
);

export default PrivacyPolicyPage;
