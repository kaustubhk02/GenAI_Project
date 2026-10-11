import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { DOC_TYPES } from '../constants.js';

const I18N = {
  ENGLISH: {
    guideTitle: 'OFFICIAL SCHEME INFORMATION & ELIGIBILITY GUIDE',
    portalSub: 'KisanSetu • Government Scheme Eligibility Platform for Farmers',
    govtNotice: 'Official Central & State Government Welfare Documentation',
    schemeCode: 'Scheme Code',
    department: 'Nodal Ministry / Department',
    benefitSection: 'Benefits & Financial Assistance',
    eligibilitySection: 'Eligibility Criteria & Conditions',
    requiredDocsSection: 'Mandatory Documents for Verification',
    applySection: 'Application Procedure & Guidelines',
    conditionsSection: 'Important Rules & Operational Notes',
    sourceSection: 'Official Source & Verification Reference',
    disclaimerTitle: 'Official Disclaimer',
    disclaimerText: 'This information guide is compiled from verified government notifications. Eligibility evaluation is automated and advisory. Final sanction is subject to verification by the competent government authority.',
    verifiedBadge: 'Verified Official Government Information',
    downloadBtn: 'Download PDF Guide',
    downloadingBtn: 'Generating PDF...',
    printBtn: 'Print / Save as PDF',
    closeBtn: 'Close Guide',
    annualBenefit: 'Annual Financial Benefit',
    applyOnline: 'Official Application Portal',
    langLabel: 'Document Language',
    printNote: 'You can print this guide or save it as a PDF for offline reference.'
  },
  MARATHI: {
    guideTitle: 'अधिकृत योजना माहिती व पात्रता मार्गदर्शक',
    portalSub: 'किसानसेतू • शेतकऱ्यांसाठी शासकीय योजना व कल्याणकारी व्यासपीठ',
    govtNotice: 'अधिकृत केंद्र व राज्य शासन कल्याणकारी योजना दस्तऐवज',
    schemeCode: 'योजना कोड',
    department: 'नोडल मंत्रालय / कृषी विभाग',
    benefitSection: 'योजनेचे लाभ व आर्थिक सहाय्य',
    eligibilitySection: 'पात्रता निकष व आवश्यक अटी',
    requiredDocsSection: 'पडताळणीसाठी आवश्यक कागदपत्रे',
    applySection: 'अर्ज करण्याची अधिकृत कार्यपद्धती',
    conditionsSection: 'महत्त्वाच्या अटी व मार्गदर्शक सूचना',
    sourceSection: 'अधिकृत स्त्रोत व सत्यापन संदर्भ',
    disclaimerTitle: 'अधिकृत अस्वीकरण (Disclaimer)',
    disclaimerText: 'ही माहिती अधिकृत शासन निर्णयांवर आधारित आहे. ही पात्रता पडताळणी मार्गदर्शक स्वरूपाची असून अंतिम मंजुरी संबंधित सक्षम शासकीय प्राधिकरणाद्वारे केली जाते.',
    verifiedBadge: 'सत्यापित अधिकृत शासन माहिती',
    downloadBtn: 'PDF मार्गदर्शक डाउनलोड करा',
    downloadingBtn: 'PDF तयार होत आहे...',
    printBtn: 'प्रिंट करा / सेव्ह करा',
    closeBtn: 'बंद करा',
    annualBenefit: 'वार्षिक आर्थिक लाभ',
    applyOnline: 'अधिकृत अर्ज संकेतस्थळ',
    langLabel: 'कागदपत्र भाषा निवडा',
    printNote: 'तुम्ही हे मार्गदर्शक प्रिंट करू शकता किंवा ऑफलाइन संदर्भासाठी PDF म्हणून सेव्ह करू शकता.'
  },
  HINDI: {
    guideTitle: 'आधिकारिक योजना जानकारी एवं पात्रता मार्गदर्शिका',
    portalSub: 'किसानसेतु • किसानों के लिए सरकारी योजना एवं कल्याणकारी मंच',
    govtNotice: 'आधिकारिक केंद्र एवं राज्य सरकार कल्याणकारी योजना दस्तावेज़',
    schemeCode: 'योजना कोड',
    department: 'नोडल मंत्रालय / कृषि विभाग',
    benefitSection: 'योजना के लाभ एवं वित्तीय सहायता',
    eligibilitySection: 'पात्रता मानदंड एवं अनिवार्य शर्तें',
    requiredDocsSection: 'सत्यापन हेतु आवश्यक दस्तावेज़',
    applySection: 'आवेदन प्रक्रिया एवं दिशा-निर्देश',
    conditionsSection: 'महत्वपूर्ण शर्तें एवं दिशानिर्देश',
    sourceSection: 'आधिकारिक स्रोत एवं सत्यापन संदर्भ',
    disclaimerTitle: 'आधिकारिक अस्वीकरण',
    disclaimerText: 'यह जानकारी आधिकारिक सरकारी अधिसूचनाओं से संकलित है। यह पात्रता जांच केवल सलाहकारी है। अंतिम स्वीकृति संबंधित सक्षम सरकारी प्राधिकरण द्वारा की जाएगी।',
    verifiedBadge: 'सत्यापित आधिकारिक सरकारी जानकारी',
    downloadBtn: 'PDF मार्गदर्शिका डाउनलोड करें',
    downloadingBtn: 'PDF तैयार हो रही है...',
    printBtn: 'प्रिंट करें / सुरक्षित करें',
    closeBtn: 'बंद करें',
    annualBenefit: 'वार्षिक वित्तीय लाभ',
    applyOnline: 'आधिकारिक आवेदन पोर्टल',
    langLabel: 'दस्तावेज़ भाषा चुनें',
    printNote: 'आप इस गाइड को प्रिंट कर सकते हैं या ऑफलाइन संदर्भ के लिए PDF डाउनलोड कर सकते हैं।'
  }
};

const DOC_NAMES_I18N = {
  AADHAAR: {
    ENGLISH: 'Aadhaar Card (Unique Identification)',
    MARATHI: 'आधार कार्ड (ओळख व e-KYC पडताळणी)',
    HINDI: 'आधार कार्ड (पहचान व ई-केवाईसी)'
  },
  LAND_RECORD: {
    ENGLISH: 'Land Record / 7/12 Extract / Khasra / Khatauni',
    MARATHI: '७/१२ उतारा व जमिनीची अधिकृत नोंद (भूमी अभिलेख)',
    HINDI: 'भू-अभिलेख / खसरा / खतौनी / 7/12 नकल'
  },
  EIGHT_A_EXTRACT: {
    ENGLISH: '8A Land Holding Extract (Khate Extract)',
    MARATHI: '८-अ उतारा (जमीन खाते नोंद)',
    HINDI: '8-ए जोत खाता विवरण'
  },
  INCOME_CERTIFICATE: {
    ENGLISH: 'Income Certificate (Authorized Tehsildar)',
    MARATHI: 'उत्पन्न दाखला / प्रमाणपत्र (तहसीलदार प्राधिकृत)',
    HINDI: 'आय प्रमाण पत्र (सक्षम अधिकारी द्वारा जारी)'
  },
  CASTE_CERTIFICATE: {
    ENGLISH: 'Caste Certificate (For reserved category benefits)',
    MARATHI: 'जात प्रमाणपत्र (सवलतीसाठी)',
    HINDI: 'जाति प्रमाण पत्र'
  },
  BANK_PASSBOOK: {
    ENGLISH: 'Bank Passbook / Cancelled Cheque (Aadhaar linked)',
    MARATHI: 'बँक पासबुक / रद्द केलेला धनादेश (आधार संलग्न बँक खाते)',
    HINDI: 'बैंक पासबुक / रद्द चेक (आधार लिंक बैंक खाता)'
  },
  DOMICILE_CERTIFICATE: {
    ENGLISH: 'Domicile / Residence Certificate',
    MARATHI: 'रहिवासी दाखला / अधिवास प्रमाणपत्र',
    HINDI: 'निवास प्रमाण पत्र'
  },
  CROP_SOWING_CERTIFICATE: {
    ENGLISH: 'Crop Sowing Proof (E-Pik Pahani / Girdawari)',
    MARATHI: 'ई-पीक पाहणी / पेरणी नोंदणी दाखला',
    HINDI: 'ई-पीक पाहणी / गिरदावरी / फसल बुवाई प्रमाणपत्र'
  },
  DISABILITY_CERTIFICATE: {
    ENGLISH: 'Disability Certificate / UDID Card',
    MARATHI: 'दिव्यांग प्रमाणपत्र / UDID ओळखपत्र',
    HINDI: 'दिव्यांगता प्रमाण पत्र / UDID कार्ड'
  },
  RATION_CARD: {
    ENGLISH: 'Ration Card (NFSA / State Public Distribution)',
    MARATHI: 'रेशन कार्ड / शिधापत्रिका',
    HINDI: 'राशन कार्ड'
  },
  SOIL_HEALTH_CARD: {
    ENGLISH: 'Soil Health Card',
    MARATHI: 'मृदा आरोग्य पत्रिका',
    HINDI: 'मृदा स्वास्थ्य कार्ड'
  },
  KCC_CARD: {
    ENGLISH: 'Kisan Credit Card (KCC)',
    MARATHI: 'किसान क्रेडिट कार्ड',
    HINDI: 'किसान क्रेडिट कार्ड'
  }
};

/**
 * Extracts rule labels recursively from machine-readable rules tree
 */
function extractRuleLabels(rules) {
  if (!rules) return [];
  const labels = [];
  const walk = (node) => {
    if (!node) return;
    if (Array.isArray(node.all)) node.all.forEach(walk);
    else if (Array.isArray(node.any)) node.any.forEach(walk);
    else if (node.not) walk(node.not);
    else if (node.label) labels.push(node.label);
    else if (node.field) labels.push(`${node.field} ${node.operator} ${JSON.stringify(node.value)}`);
  };
  walk(rules);
  return labels;
}

export default function SchemePdfModal({ scheme, evaluationItem, onClose }) {
  const [lang, setLang] = useState('MARATHI');
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  if (!scheme) return null;

  const t = I18N[lang] || I18N.ENGLISH;

  // Derive eligibility items
  const ruleList = evaluationItem?.matchedRules?.length
    ? evaluationItem.matchedRules.map((r) => r.label || `${r.field} ${r.operator} ${r.value}`)
    : extractRuleLabels(scheme.rules);

  const reqDocs = scheme.requiredDocuments || [];

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setDownloading(true);

    try {
      // High-resolution capture
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1024,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Add subsequent pages if content exceeds A4 height
      while (heightLeft > 5) {
        position = position - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const safeName = (scheme.code || 'Scheme').replace(/[^a-zA-Z0-9_-]/g, '_');
      pdf.save(`${safeName}_Guide_${lang}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF directly. Please use "Print / Save as PDF" option.');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pdf-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Bar */}
        <div className="pdf-modal-header">
          <div className="pdf-modal-title">
            <span style={{ fontSize: '1.25rem' }}>📄</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                {scheme.name}
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>
                {t.guideTitle}
              </span>
            </div>
          </div>

          <div className="pdf-modal-actions">
            {/* Language Switcher */}
            <div className="pdf-lang-switcher" title={t.langLabel}>
              {['MARATHI', 'HINDI', 'ENGLISH'].map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`pdf-lang-btn ${lang === l ? 'active' : ''}`}
                  onClick={() => setLang(l)}
                >
                  {l === 'MARATHI' ? 'मराठी' : l === 'HINDI' ? 'हिंदी' : 'English'}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="secondary btn"
              onClick={handlePrint}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>🖨️</span> {t.printBtn}
            </button>

            <button
              type="button"
              className="primary btn"
              onClick={handleDownloadPdf}
              disabled={downloading}
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span>⬇️</span> {downloading ? t.downloadingBtn : t.downloadBtn}
            </button>

            <button
              type="button"
              className="pdf-close-btn"
              onClick={onClose}
              aria-label={t.closeBtn}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas View */}
        <div className="pdf-modal-body">
          <div className="pdf-sheet" ref={printRef}>
            {/* Official Header */}
            <div className="pdf-sheet-header">
              <div className="pdf-emblem-row">
                <div className="pdf-emblem">🇮🇳</div>
                <div className="pdf-header-titles">
                  <div className="pdf-super-title">GOVERNMENT OF INDIA / STATE WELFARE DIRECTORY</div>
                  <div className="pdf-main-title">{t.guideTitle}</div>
                  <div className="pdf-sub-title">{t.portalSub}</div>
                </div>
                <div className="pdf-stamp-badge">
                  <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#047857' }}>✓ VERIFIED</span>
                  <span style={{ fontSize: '0.62rem', color: '#64748b' }}>OFFICIAL PORTAL</span>
                </div>
              </div>
              <div className="pdf-header-divider" />
            </div>

            {/* Scheme Title Banner */}
            <div className="pdf-scheme-banner">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <span className="pdf-code-badge">{scheme.code}</span>
                  <h1 className="pdf-scheme-name">{scheme.name}</h1>
                  <p className="pdf-scheme-dept">
                    🏛️ <strong>{t.department}:</strong> {scheme.department || 'Ministry of Agriculture & Farmers Welfare'}
                  </p>
                </div>
                {scheme.benefitAmountPerYear > 0 && (
                  <div className="pdf-benefit-badge">
                    <span className="pdf-benefit-sub">{t.annualBenefit}</span>
                    <span className="pdf-benefit-val">₹{scheme.benefitAmountPerYear.toLocaleString('en-IN')}/year</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 1: Financial Benefits */}
            <div className="pdf-section">
              <h2 className="pdf-section-title">
                <span>💰</span> {t.benefitSection}
              </h2>
              <div className="pdf-callout-box">
                <p className="pdf-benefit-summary">
                  {scheme.benefitSummary || 'Direct government assistance and DBT transfer for eligible farming households.'}
                </p>
                {scheme.description && (
                  <p className="pdf-body-text" style={{ marginTop: '0.4rem' }}>
                    {scheme.description}
                  </p>
                )}
              </div>
            </div>

            {/* Section 2: Eligibility Criteria */}
            <div className="pdf-section">
              <h2 className="pdf-section-title">
                <span>📋</span> {t.eligibilitySection}
              </h2>
              <ul className="pdf-criteria-list">
                {ruleList.length > 0 ? (
                  ruleList.map((label, idx) => (
                    <li key={idx} className="pdf-criteria-item">
                      <span className="pdf-check-icon">✓</span>
                      <span>{label}</span>
                    </li>
                  ))
                ) : (
                  <li className="pdf-criteria-item">
                    <span className="pdf-check-icon">✓</span>
                    <span>All landholding farmers and active agricultural families meeting central/state notification norms.</span>
                  </li>
                )}
              </ul>
            </div>

            {/* Section 3: Required Documents */}
            <div className="pdf-section">
              <h2 className="pdf-section-title">
                <span>📁</span> {t.requiredDocsSection}
              </h2>
              <div className="pdf-docs-grid">
                {reqDocs.length > 0 ? (
                  reqDocs.map((docType) => {
                    const localized = DOC_NAMES_I18N[docType]?.[lang] || DOC_TYPES[docType] || docType;
                    return (
                      <div key={docType} className="pdf-doc-item">
                        <span className="pdf-doc-icon">📄</span>
                        <div>
                          <strong>{docType.replace(/_/g, ' ')}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: '0.15rem' }}>
                            {localized}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="pdf-doc-item">
                    <span className="pdf-doc-icon">📄</span>
                    <div>
                      <strong>Aadhaar Card, Land Record (7/12), Bank Passbook</strong>
                      <div style={{ fontSize: '0.78rem', color: '#475569' }}>Standard verification documents</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Application Procedure */}
            <div className="pdf-section">
              <h2 className="pdf-section-title">
                <span>📝</span> {t.applySection}
              </h2>
              <ol className="pdf-steps-list">
                <li>
                  <strong>Document Verification:</strong> Ensure your Aadhaar card is linked to your bank account with active DBT facility, and land records (7/12 / 8A) are up to date.
                </li>
                <li>
                  <strong>Official Portal Application:</strong> Visit the official government application portal:
                  <div style={{ margin: '0.35rem 0' }}>
                    <a
                      href={scheme.officialApplicationUrl || 'https://myscheme.gov.in/'}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="pdf-link-btn"
                    >
                      🔗 {scheme.officialApplicationUrl || 'https://myscheme.gov.in/'}
                    </a>
                  </div>
                </li>
                <li>
                  <strong>Common Service Centres (CSC):</strong> Farmers who prefer in-person assistance can apply via any local CSC / Aaple Sarkar Seva Kendra with original copies of the documents listed above.
                </li>
                <li>
                  <strong>Status Tracking:</strong> Keep your application registration ID / Aadhaar number to track installment and approval status.
                </li>
              </ol>
            </div>

            {/* Section 5: Source & Official Verification */}
            <div className="pdf-section">
              <h2 className="pdf-section-title">
                <span>🏛️</span> {t.sourceSection}
              </h2>
              <div className="pdf-source-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <strong>{scheme.source?.name || 'API Setu / myScheme Government Directory'}</strong>
                    {scheme.source?.url && (
                      <div style={{ fontSize: '0.8rem', color: '#0369a1', marginTop: '0.15rem' }}>
                        Source URL: {scheme.source.url}
                      </div>
                    )}
                    {scheme.source?.note && (
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
                        {scheme.source.note}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'right' }}>
                    <div>Scheme Version: {scheme.version || 1}.0</div>
                    <div>Generated via: KisanSetu Portal</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Disclaimer Footer */}
            <div className="pdf-sheet-footer">
              <div style={{ fontWeight: 'bold', color: '#047857', marginBottom: '0.2rem' }}>
                {t.disclaimerTitle}
              </div>
              <p style={{ margin: 0 }}>{t.disclaimerText}</p>
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                <span>KisanSetu • AI Government Scheme Platform</span>
                <span>Document Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
