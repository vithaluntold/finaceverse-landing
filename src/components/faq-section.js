import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import './faq-section.css';

/**
 * FAQ Section component with JSON-LD structured data for SEO
 * Implements FAQPage schema for rich snippets in Google search
 */

const DEFAULT_FAQS = [
  {
    question: "What is a Cognitive Operating System?",
    answer: "A Cognitive Operating System (COS) is a foundational AI infrastructure that unifies understanding, execution, structure, and optimization across an entire enterprise. Unlike traditional software that automates individual tasks, a COS creates a continuous intelligence cycle where the enterprise itself becomes intelligent — learning, adapting, and evolving autonomously."
  },
  {
    question: "How is FinACEverse different from traditional accounting software?",
    answer: "Traditional accounting software is built for record-keeping and transaction processing. FinACEverse is built for cognitive autonomy. Where legacy systems require manual inputs and produce static outputs, FinACEverse uses AI to understand context, execute complex workflows, optimize processes in real-time, and evolve its own structure based on learnings. It's not an app — it's a cognitive infrastructure."
  },
  {
    question: "What industries can benefit from FinACEverse?",
    answer: "FinACEverse is designed for any organization managing complex financial operations: accounting firms, tax practitioners, corporate finance departments, auditors, financial advisors, and enterprise CFO offices. Any entity dealing with multi-source data, compliance requirements, and the need for real-time financial intelligence can benefit from our Cognitive OS."
  },
  {
    question: "What is the implementation timeline?",
    answer: "Pilot programs typically run 8-12 weeks, with initial value demonstration within the first 30 days. Full enterprise deployments vary based on complexity, but our modular architecture allows for phased rollouts — you can start with one module like Accute or Luca and expand as you see results."
  },
  {
    question: "How does FinACEverse ensure data security and compliance?",
    answer: "Security is foundational, not an afterthought. FinACEverse implements enterprise-grade encryption (AES-256), SOC 2 Type II compliance, complete audit trails for every transaction, role-based access controls, and data residency options. Our compliance causality engine ensures every output can be traced back to source documents with mathematical certainty."
  },
  {
    question: "What is VAMN-70B?",
    answer: "VAMN-70B (Verified Agentic Multimodal Neural Network) is our proprietary 70-billion parameter AI model trained specifically for financial cognition. Unlike general-purpose LLMs, VAMN-70B understands accounting principles, tax regulations, audit requirements, and financial causality at a native level — making it the cognitive core that powers all FinACEverse modules."
  },
  {
    question: "Can FinACEverse integrate with our existing systems?",
    answer: "Yes. Accute, our orchestration layer, is designed to connect with your existing ERP, accounting software, document management, and data sources. We support standard APIs, file imports, and custom integrations. The goal is to unify your tech stack under one cognitive infrastructure, not replace everything overnight."
  },
  {
    question: "What ROI can we expect?",
    answer: "Pilot program results show an average 2.5x capacity increase, 90% reduction in manual data entry, and 60% faster month-end close times. Most firms see full ROI payback within 6-12 months. We provide detailed ROI projections during your consultation based on your specific firm profile."
  }
];

const FAQSection = ({ faqs = DEFAULT_FAQS, title = "Frequently Asked Questions", subtitle }) => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Generate JSON-LD structured data for FAQPage schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>
      <section className="faq-section" id="faq">
        <div className="container-wrapper">
          <div className="section-header centered">
            <h2 className="section-title">
              <span>Frequently </span>
              <span className="text-gradient">Asked Questions</span>
            </h2>
            {subtitle && <p className="section-subtitle">{subtitle}</p>}
          </div>
          
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div 
                key={index} 
                className={`faq-item ${openIndex === index ? 'open' : ''}`}
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <button
                  className="faq-question"
                  onClick={() => toggleFAQ(index)}
                  aria-expanded={openIndex === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span itemProp="name">{faq.question}</span>
                  <span className="faq-icon" aria-hidden="true">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </span>
                </button>
                <div 
                  id={`faq-answer-${index}`}
                  className="faq-answer"
                  itemScope
                  itemProp="acceptedAnswer"
                  itemType="https://schema.org/Answer"
                  role="region"
                  aria-hidden={openIndex !== index}
                >
                  <div className="faq-answer-content" itemProp="text">
                    {faq.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="faq-cta">
            <p>Still have questions?</p>
            <a href="/expert-consultation" className="btn btn-primary">
              Schedule a Consultation
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default FAQSection;
