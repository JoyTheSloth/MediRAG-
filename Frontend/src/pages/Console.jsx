import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Evaluate from './Evaluate';
import Dashboard from './Dashboard';
import Governance from './Governance';
import PatientExperience from './PatientExperience';
import HospitalPanel from './HospitalPanel';
import './Console.css';
import './home-mobile.css';

const Console = () => {
    const location = useLocation();
    const [activeSection, setActiveSection] = useState('dashboard');
    const [activeSubSection, setActiveSubSection] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const SECTION_INSTRUCTIONS = {
        researcher: {
            title: "🔬 Researcher Lab",
            intro: "A medical research laboratory to check if your AI model is accurate or hallucinating facts.",
            steps: [
                "Type your health question, or click the 'Use PICO Builder' button to easily structure it into Population, Intervention, Comparison, and Outcome.",
                "Paste medical journal articles in the center box as facts, or leave it empty to search PubMed and clinical guidelines automatically.",
                "Paste an answer in the third box to check its facts, or leave it empty for the AI to answer for you.",
                "Click 'Run Evaluation'. The safety engine scans every claim and shows an interactive GRADE table, PRISMA funnel, and a Hallucination Risk Score.",
                "Appraise the safety of the recommendation using the 'Clinician Delphi Consensus' slider panel at the bottom."
            ]
        },
        patient: {
            title: "📁 Data Upload Zone",
            intro: "An app safety sandbox to upload patient medical records and audit standard health questions (like dosage limits or drug safety).",
            steps: [
                "Under 'Step 1: Clinical Document Ingestion', upload a patient record (PDF, TXT, or DOC) such as a Discharge Summary or Radiology Report.",
                "Under 'Step 2: Evaluation Context', select which online pharmacy platform you are testing (like Apollo 247 or Tata 1mg).",
                "Under 'Step 3: Safety Verification', select a common clinical question from the dropdown (e.g., 'Is the dosage correct?') or type your own custom question.",
                "Click 'Run Safety Audit' to trigger the evaluation job.",
                "Review the Safety Report on the right side: inspect the Hallucination Risk Score, critical NIH drug-drug interaction warnings, and reliability gauges."
            ]
        },
        governance: {
            title: "⚖️ Safety Governance Hub",
            intro: "An institutional compliance dashboard to audit AI decisions, review blocked answers, and configure thresholds.",
            steps: [
                "Audit live history logs showing every query processed by your hospital's system.",
                "Review which answers were edited or completely blocked by safety filters to prevent malpractice.",
                "Export compliance reports for national medical boards (like ABDM or CDSCO)."
            ]
        },
        hospital: {
            title: "🏥 Hospital Registry & Policies",
            intro: "Configure local private servers, calibrate department safety guidelines, and generate EHR clinical codes.",
            steps: [
                "Under 'Hospital Local Server Configurations', enter your internal server URL (e.g. Ollama or Llama-3 secure node).",
                "Under 'Departmental Safety Policies', adjust the Hallucination Risk Score sliders for Oncology, Pediatrics, Cardiology, or OPD to control warning triggers.",
                "Toggle individual departments ON or OFF depending on which clinics have active AI safety limits enabled.",
                "Under 'Epic & Cerner EHR Client Integrations', choose Python, Javascript, or cURL tabs to copy pre-formatted connection scripts for hospital engineers."
            ]
        },
        dashboard: {
            title: "📈 Performance Metrics",
            intro: "A developer statistics dashboard showing real-time metrics of the AI medical engine.",
            steps: [
                "Monitor the average Hallucination Risk Score (HRS) over time to track AI performance and safety.",
                "Review system speed (latency) for database retrieval and response generation.",
                "Check costs, model usage, and find out which topics generate the highest risk scores."
            ]
        }
    };

    // Global settings for Evaluate / Patient
    const [engineConfig, setEngineConfig] = useState(() => ({
        apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
        provider: 'Mistral',
        apiKey: sessionStorage.getItem('medirag_api_key') || import.meta.env.VITE_MISTRAL_API_KEY || '',
        model: 'mistral-large-latest',
        topK: 5,
        runRagas: false
    }));

    useEffect(() => {
        if (engineConfig.apiKey) {
            sessionStorage.setItem('medirag_api_key', engineConfig.apiKey);
        } else {
            sessionStorage.removeItem('medirag_api_key');
        }
    }, [engineConfig.apiKey]);

    // Initial section based on route or state
    useEffect(() => {
        if (location.pathname.includes('dashboard')) {
            setActiveSection('dashboard');
        } else if (location.pathname.includes('evaluate')) {
            setActiveSection('evaluate');
            setActiveSubSection('researcher'); 
        } else if (location.pathname === '/console') {
            setActiveSection('evaluate');
            setActiveSubSection('researcher');
        }
    }, [location]);

    const handleNav = (section, sub = null) => {
        setActiveSection(section);
        setActiveSubSection(sub);
        setIsSidebarOpen(false);
        window.scrollTo(0, 0);
    };

    return (
        <div className="console-page">
            <div className={`console-layout ${isSidebarOpen ? 'overlay-active' : ''}`}>
                
                {/* --- MOBILE OVERLAY --- */}
                {isSidebarOpen && <div className="con-mobile-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

                {/* --- SIDEBAR --- */}
                <aside className={`console-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    <div className="console-sidebar-header-mobile">
                        <span>MENU</span>
                        <button className="con-close-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
                    </div>

                    <div className="console-status-block">
                        <div className="status-dot-pulse"></div>
                        <div className="status-info">
                            <span className="status-label">ENGINE STATUS</span>
                            <span className="status-value">OPERATIONAL</span>
                        </div>
                    </div>

                    <div className="console-nav-group">
                        <div className="console-nav-label">EVALUATE</div>
                        <button 
                            className={`console-nav-link ${activeSection === 'evaluate' && activeSubSection === 'researcher' ? 'active' : ''}`}
                            onClick={() => handleNav('evaluate', 'researcher')}
                        >
                            <span className="console-nav-icon">🔍</span>
                            Researcher Lab
                        </button>
                        <button 
                            className={`console-nav-link ${activeSection === 'evaluate' && activeSubSection === 'patient' ? 'active' : ''}`}
                            onClick={() => handleNav('evaluate', 'patient')}
                        >
                            <span className="console-nav-icon">📁</span>
                            Data Upload Zone
                        </button>
                        <button 
                            className={`console-nav-link ${activeSection === 'evaluate' && activeSubSection === 'governance' ? 'active' : ''}`}
                            onClick={() => handleNav('evaluate', 'governance')}
                        >
                            <span className="console-nav-icon">⚖️</span>
                            Safety Governance
                        </button>
                    </div>

                    <div className="console-nav-group">
                        <div className="console-nav-label">HOSPITAL</div>
                        <button 
                            className={`console-nav-link ${activeSection === 'evaluate' && activeSubSection === 'hospital' ? 'active' : ''}`}
                            onClick={() => handleNav('evaluate', 'hospital')}
                        >
                            <span className="console-nav-icon">🏥</span>
                            Hospital Registry
                        </button>
                    </div>

                    <div className="console-nav-group">
                        <div className="console-nav-label">ANALYTICS</div>
                        <button 
                            className={`console-nav-link ${activeSection === 'dashboard' ? 'active' : ''}`}
                            onClick={() => handleNav('dashboard')}
                        >
                            <span className="console-nav-icon">📈</span>
                            Performance Metrics
                        </button>
                    </div>

                    <div className="console-nav-group" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px dashed rgba(255,255,255,0.08)' }}>
                        <button 
                            className="console-nav-link"
                            onClick={() => setIsHelpOpen(true)}
                            style={{ 
                                color: '#00C896', 
                                border: '1px solid rgba(0, 200, 150, 0.2)', 
                                background: 'rgba(0, 200, 150, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}
                        >
                            <span className="console-nav-icon" style={{ filter: 'none', opacity: 1 }}>💡</span>
                            Section Help Guide
                        </button>
                    </div>

                    <div className="engine-settings-panel">
                        <div className="settings-header">
                            <span className="settings-header-icon">⚙️</span>
                            <h3 className="settings-header-title">Evaluation Engine</h3>
                        </div>

                        <div className="settings-group">
                            <label className="settings-label">API URL</label>
                            <input 
                                type="text" 
                                className="settings-input"
                                value={engineConfig.apiUrl}
                                onChange={(e) => setEngineConfig({...engineConfig, apiUrl: e.target.value})}
                            />
                        </div>

                        <h4 className="settings-section-title">Core Inference</h4>
                        
                        <div className="settings-group">
                            <label className="settings-label">Model Provider</label>
                            <select 
                                className="settings-select"
                                value={engineConfig.provider}
                                onChange={(e) => {
                                    const p = e.target.value;
                                    setEngineConfig({
                                        ...engineConfig, 
                                        provider: p,
                                        model: p === 'OpenAI' ? 'gpt-4o' : p === 'Mistral' ? 'mistral-large-latest' : 'gemini-2.0-flash'
                                    });
                                }}
                            >
                                <option value="Gemini">Gemini</option>
                                <option value="OpenAI">OpenAI</option>
                                <option value="Mistral">Mistral AI</option>
                                <option value="Ollama">Ollama (Local)</option>
                            </select>
                        </div>

                        {['Gemini', 'OpenAI', 'Mistral'].includes(engineConfig.provider) && (
                            <>
                                <div className="settings-group">
                                    <div className="settings-label-row">
                                        <label className="settings-label">API Key</label>
                                        <span className="settings-help-icon">❔</span>
                                    </div>
                                    <div className="settings-input-wrapper">
                                        <input 
                                            type="password"
                                            className="settings-input"
                                            value={engineConfig.apiKey}
                                            onChange={(e) => setEngineConfig({...engineConfig, apiKey: e.target.value})}
                                            placeholder={`Enter ${engineConfig.provider} API Key`}
                                        />
                                        <span className="settings-toggle-eye">👁</span>
                                    </div>
                                </div>

                                <div className="settings-group">
                                    <label className="settings-label">Model</label>
                                    <select 
                                        className="settings-select"
                                        value={engineConfig.model}
                                        onChange={(e) => setEngineConfig({...engineConfig, model: e.target.value})}
                                    >
                                        {engineConfig.provider === 'Gemini' ? (
                                            <>
                                                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                                                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                                            </>
                                        ) : engineConfig.provider === 'Mistral' ? (
                                            <>
                                                <option value="mistral-large-latest">mistral-large-latest</option>
                                                <option value="mistral-small-latest">mistral-small-latest</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="gpt-4o">gpt-4o</option>
                                                <option value="gpt-4o-mini">gpt-4o-mini</option>
                                                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </>
                        )}
                        
                        <h4 className="settings-section-title">Retrieval Settings</h4>

                        <div className="settings-group">
                            <div className="settings-label-row">
                                <label className="settings-label">Top-K Chunks</label>
                                <span className="settings-value-pill">{engineConfig.topK}</span>
                            </div>
                            <input 
                                type="range" 
                                className="settings-range"
                                min="1" max="10" 
                                value={engineConfig.topK}
                                onChange={(e) => setEngineConfig({...engineConfig, topK: parseInt(e.target.value)})}
                            />
                        </div>

                        <label className="settings-checkbox-label">
                            <input 
                                type="checkbox" 
                                className="settings-checkbox"
                                checked={engineConfig.runRagas}
                                onChange={(e) => setEngineConfig({...engineConfig, runRagas: e.target.checked})}
                            />
                            Run RAGAS (slower)
                        </label>
                    </div>
                </aside>

                <main className="console-main">
                    {/* --- MOBILE HEADER TOGGLE --- */}
                    <div className="con-mobile-header">
                        <button className="con-hamburger-btn" onClick={() => setIsSidebarOpen(true)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>
                        <div className="con-mobile-title">Console</div>
                    </div>

                    {activeSection === 'evaluate' && activeSubSection === 'researcher' && (
                        <div className="console-view-wrapper">
                            <Evaluate embedded={true} mode={activeSubSection} engineConfig={engineConfig} setEngineConfig={setEngineConfig} />
                        </div>
                    )}

                    {activeSection === 'evaluate' && activeSubSection === 'patient' && (
                        <div className="console-view-wrapper">
                            <div className="console-view-header glass-header">
                                <div className="con-brand-block">
                                    <div className="con-wordmark">MediRAG <span style={{ color: 'var(--gov-teal)' }}>Integrate</span></div>
                                    <div className="con-tagline">Clinical App Safety Evaluation</div>
                                </div>
                                <div className="con-header-info">
                                    <span className="con-mode-badge clinical">SaMD Class B Sandbox</span>
                                    <p className="con-header-desc">Simulate patient interactions for healthcare platforms (Apollo 247, Tata 1mg) and verify AI reliability.</p>
                                </div>
                            </div>
                            <PatientExperience engineConfig={engineConfig} setEngineConfig={setEngineConfig} />
                        </div>
                    )}

                    {activeSection === 'evaluate' && activeSubSection === 'governance' && (
                        <div className="console-view-wrapper">
                            <Governance />
                        </div>
                    )}

                    {activeSection === 'evaluate' && activeSubSection === 'hospital' && (
                        <div className="console-view-wrapper">
                            <div className="console-view-header glass-header">
                                <div className="con-brand-block">
                                    <div className="con-wordmark">MediRAG <span style={{ color: 'var(--gov-teal)' }}>Enterprise</span></div>
                                    <div className="con-tagline">Hospital AI Infrastructure Management</div>
                                </div>
                                <div className="con-header-info">
                                    <span className="con-mode-badge clinical">Hospital Enterprise Panel</span>
                                    <p className="con-header-desc">Manage API endpoints, configure local private server nodes, and set department-specific safety guidelines.</p>
                                </div>
                            </div>
                            <HospitalPanel engineConfig={engineConfig} setEngineConfig={setEngineConfig} />
                        </div>
                    )}

                    {activeSection === 'dashboard' && (
                        <div className="console-view-wrapper">
                            <Dashboard embedded={true} />
                        </div>
                    )}
                </main>

            </div>

            {/* Glassmorphic Simple English Instruction Popup */}
            {isHelpOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(5, 8, 16, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fade-in 0.2s ease-out',
                    padding: '20px'
                }}>
                    <div style={{
                        background: '#0c1224',
                        border: '1px solid rgba(0, 200, 150, 0.2)',
                        borderRadius: '24px',
                        padding: '32px',
                        maxWidth: '520px',
                        width: '100%',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(0, 200, 150, 0.1)',
                        color: '#fff',
                        fontFamily: "inherit",
                        position: 'relative'
                    }}>
                        <button 
                            onClick={() => setIsHelpOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '20px',
                                right: '20px',
                                background: 'transparent',
                                border: 'none',
                                color: '#94a3b8',
                                fontSize: '18px',
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                        
                        {(() => {
                            const sectionKey = activeSection === 'dashboard' ? 'dashboard' : activeSubSection || 'researcher';
                            const info = SECTION_INSTRUCTIONS[sectionKey] || SECTION_INSTRUCTIONS.researcher;
                            return (
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <span style={{ fontSize: '24px' }}>💡</span>
                                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#00C896' }}>{info.title} Guide</h3>
                                    </div>
                                    <p style={{ fontSize: '13px', opacity: 0.8, color: '#e2e8f0', lineHeight: '1.5', margin: '0 0 20px' }}>
                                        {info.intro}
                                    </p>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {info.steps.map((step, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                                <span style={{
                                                    background: 'rgba(0, 200, 150, 0.1)',
                                                    color: '#00C896',
                                                    width: '22px',
                                                    height: '22px',
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '11px',
                                                    fontWeight: 'bold',
                                                    flexShrink: 0,
                                                    marginTop: '2px'
                                                }}>
                                                    {idx + 1}
                                                </span>
                                                <span style={{ fontSize: '12.5px', color: '#cbd5e1', lineHeight: '1.4' }}>{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <button 
                                        onClick={() => setIsHelpOpen(false)}
                                        style={{
                                            marginTop: '28px',
                                            background: '#00C896',
                                            color: '#0c1224',
                                            border: 'none',
                                            padding: '12px 24px',
                                            borderRadius: '12px',
                                            fontWeight: '800',
                                            fontSize: '13.5px',
                                            cursor: 'pointer',
                                            width: '100%',
                                            boxShadow: '0 4px 12px rgba(0, 200, 150, 0.2)',
                                            transition: '0.2s'
                                        }}
                                    >
                                        I Understand, Let's Go!
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Console;
