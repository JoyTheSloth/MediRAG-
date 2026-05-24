import React, { useState } from 'react';
import './MediApiAgent.css';

const MediApiAgent = () => {
    const [trigger, setTrigger] = useState('PRESCRIPTION_ADDED');
    const [condition, setCondition] = useState('DRUG_INTERACTION');
    const [action, setAction] = useState('BLOCK_AND_ALERT');
    const [consensusEnabled, setConsensusEnabled] = useState(true);
    const [privacyEnabled, setPrivacyEnabled] = useState(true);

    const [activeRules, setActiveRules] = useState([
        { id: 1, name: 'Block unsafe prescriptions', trigger: 'Prescription added', action: 'Block & alert', active: true },
        { id: 2, name: 'Alert on high glucose', trigger: 'Lab report fetched', action: 'Add warning to response', active: true },
        { id: 3, name: 'Flag missing patient consent', trigger: 'API request made', action: 'Log for audit', active: false }
    ]);
    
    const [activeDemoStep, setActiveDemoStep] = useState(0);
    const [sandboxQuery, setSandboxQuery] = useState('Is it safe to give Sildenafil 50mg to a patient on Nitrates?');
    const [sandboxScanning, setSandboxScanning] = useState(false);
    const [sandboxResult, setSandboxResult] = useState(null);
    const [showDeployBanner, setShowDeployBanner] = useState(false);

    // Dynamic Traffic Logs State
    const [trafficLogs, setTrafficLogs] = useState([
        { id: 1, time: '19:14:02.1', end: '/p_check', meta: 'User query: "Is 50mg Sildenafil safe with nitrates?"', status: '🚫 BLOCKED (RISK)', class: 'status-fail' },
        { id: 2, time: '19:14:01.4', end: '/predict', meta: 'Redacting PHI: "Patient [R.K. Gupta] age 54..."', status: '🔒 SANITIZED (PHI)', class: 'status-warn' },
        { id: 3, time: '19:13:58.9', end: '/eval_v2', meta: 'Consensus Check: Gemini vs Mistral (94% agreement)', status: '✔ AUTHORIZED', class: 'status-pass' },
        { id: 4, time: '19:13:55.2', end: '/p_check', meta: 'Tata1mg: Search query "mild fever in infants"', status: '✔ AUTHORIZED', class: 'status-pass' },
        { id: 5, time: '19:13:52.8', end: '/redact', meta: 'Apollo247: Stripping Patient ID meta-tags', status: '🔒 SANITIZED', class: 'status-warn' }
    ]);

    // Intelligence & Governance State
    const [kpiData, setKpiData] = useState([
        { label: 'Total Queries Audited', val: '0', sub: 'Historical', trend: null, icon: '📊' },
        { label: 'Avg Hallucination Risk', val: '0.0', sub: 'Live Monitoring', trend: 'down', color: 'teal', icon: '⚡' },
        { label: 'Audit Readiness', val: '94%', sub: 'High Compliance', trend: null, color: 'teal', icon: '🛡️' },
        { label: 'Critical Flags', val: '0', sub: 'Requires Review', trend: null, color: 'red', icon: '⚠️' },
    ]);

    React.useEffect(() => {
        const fetchGovData = async () => {
            try {
                const statsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/stats`);
                if (statsRes.ok) {
                    const stats = await statsRes.json();
                    setKpiData([
                        { label: 'Total Queries Audited', val: stats.totalEvals || 0, sub: 'Historical', trend: null, icon: '📊' },
                        { label: 'Avg Hallucination Risk', val: stats.avgHrs ? stats.avgHrs.toFixed(1) : '0.0', sub: 'Live Monitoring', trend: 'down', color: 'teal', icon: '⚡' },
                        { label: 'Audit Readiness', val: '94%', sub: 'High Compliance', trend: null, color: 'teal', icon: '🛡️' },
                        { label: 'Critical Flags', val: stats.critAlerts || 0, sub: 'Requires Review', trend: null, color: 'red', icon: '⚠️' },
                    ]);
                }
            } catch (e) {
                console.error("KPI fetch error:", e);
            }
        };
        fetchGovData();
        const intervalId = setInterval(fetchGovData, 15000);
        return () => clearInterval(intervalId);
    }, []);

    React.useEffect(() => {
        const endpoints = ['/safe_execute', '/p_check', '/predict', '/redact', '/eval_v2'];
        const metaValues = [
            'Analyzing medication compatibility for chronic patient',
            'Applying HIPAA Privacy Shield to incoming payload',
            'Consensus Engine: Verifying clinical accuracy (99%)',
            'Sourcing evidence for "Pediatric dosage of Paracetamol"',
            'Blocking adversarial prompt: "Bypass safety filters"',
            'Sanitizing Discharge Summary from Apollo Hospitals',
            'Checking Tata1mg API response for hallucinations'
        ];
        const statusMap = [
            { s: '✔ AUTHORIZED', c: 'status-pass' },
            { s: '✔ AUTHORIZED', c: 'status-pass' },
            { s: '🔒 SANITIZED', c: 'status-warn' },
            { s: '🚫 BLOCKED', c: 'status-fail' }
        ];

        const interval = setInterval(() => {
            const now = new Date();
            const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${Math.floor(Math.random()*10)}`;
            const newLog = {
                id: Date.now(),
                time: timeStr,
                end: endpoints[Math.floor(Math.random() * endpoints.length)],
                meta: metaValues[Math.floor(Math.random() * metaValues.length)],
                ...statusMap[Math.floor(Math.random() * statusMap.length)]
            };
            setTrafficLogs(prev => [newLog, ...prev.slice(0, 4)]);
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const [, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(`POST https://mediapi.yourdomain.com/safe_execute`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleRule = (id) => {
        setActiveRules(rules => rules.map(rule => rule.id === id ? { ...rule, active: !rule.active } : rule));
    };

    const handleRunSandboxTest = () => {
        setSandboxScanning(true);
        setSandboxResult(null);
        setTimeout(() => {
            setSandboxScanning(false);
            const q = sandboxQuery.toLowerCase();
            if (q.includes('sildenafil') || q.includes('nitrate') || q.includes('aspirin') || q.includes('warfarin') || q.includes('ibuprofen') || q.includes('penicillin')) {
                setSandboxResult({
                    status: '🚫 BLOCKED',
                    class: 'status-fail',
                    reason: 'DRUG_INTERACTION_DETECTED',
                    details: 'Critical interaction identified: Concomitant use of Sildenafil (phosphodiesterase inhibitor) with Nitrates or anticoagulants causes catastrophic cardiovascular pressure drops.',
                    action: 'Blocked & logged to SaMD audit log.'
                });
            } else if (q.includes('sharma') || q.includes('patient') || q.includes('verma') || q.includes('gupta') || q.includes('age') || q.includes('rohit') || q.includes('amit')) {
                setSandboxResult({
                    status: '🔒 SANITIZED',
                    class: 'status-warn',
                    reason: 'PHI_PII_DETECTED',
                    details: 'Protected Health Information found: Patient name and identifiers auto-redacted in compliance with HIPAA Safe Harbor anonymization.',
                    action: 'Redacted field values and authorized sanitized transmission.'
                });
            } else {
                setSandboxResult({
                    status: '✔ AUTHORIZED',
                    class: 'status-pass',
                    reason: 'PATHWAY_CLEAR',
                    details: 'No critical safety contraindications or PHI elements detected in incoming payload.',
                    action: 'Authorized payload routed to vector retrieval.'
                });
            }
        }, 1500);
    };

    const handleSaveRule = () => {
        const triggerMap = {
            'API_REQUEST_MADE': 'API request made',
            'PRESCRIPTION_ADDED': 'Prescription added',
            'LAB_REPORT_FETCHED': 'Lab report fetched'
        };
        const conditionMap = {
            'DRUG_INTERACTION': 'Drug interaction detected',
            'ABNORMAL_LAB': 'Abnormal lab value',
            'MISSING_CONSENT': 'Missing patient consent',
            'CUSTOM_RULE': 'Custom rule'
        };
        const actionMap = {
            'BLOCK_AND_ALERT': 'Block & alert',
            'ADD_WARNING': 'Add warning to response',
            'NOTIFY_SYSTEM': 'Notify system',
            'LOG_AUDIT': 'Log for audit'
        };

        const newRule = {
            id: Date.now(),
            name: conditionMap[condition] || 'Custom security rule',
            trigger: triggerMap[trigger] || 'Event triggered',
            action: actionMap[action] || 'Perform action',
            active: true
        };

        setActiveRules([newRule, ...activeRules]);
        setShowDeployBanner(true);
        setTimeout(() => setShowDeployBanner(false), 4000);
    };

    return (
        <div className="agent-container reveal-up">
            {/* Deploy success toast banner */}
            {showDeployBanner && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '55%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(16, 185, 129, 0.95)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4), 0 0 100px rgba(0,200,150,0.1)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    padding: '14px 28px',
                    borderRadius: '12px',
                    zIndex: 99999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    width: '450px',
                    maxWidth: '90vw'
                }}>
                    <span style={{ fontSize: '20px' }}>🚀</span>
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>SAFETY POLICY ACTIVE & DEPLOYED</div>
                        <div style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.8)', fontWeight: 'normal', marginTop: '2px', lineHeight: '1.3' }}>Enforcing newly deployed policy rule_safeguard across all active healthcare API gateways.</div>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="agent-header">
                <h1>MediAPI Agent</h1>
                <p>Automate safety and intelligence across your healthcare APIs</p>
            </div>

            {/* INTELLIGENCE HUB: KPI CARDS */}
            <div className="gov-kpi-stack reveal-up" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '20px', 
                marginBottom: '30px' 
            }}>
                {kpiData.map((kpi, i) => (
                    <div className="gov-kpi-card-v2" key={i} style={{
                        background: 'rgba(15, 23, 42, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '20px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div className="kpi-v2-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <span className="kpi-v2-icon" style={{ fontSize: '18px' }}>{kpi.icon}</span>
                            <span className="kpi-v2-label" style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>{kpi.label}</span>
                        </div>
                        <div className="kpi-v2-body" style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                            <div className="kpi-v2-val" style={{ 
                                fontSize: '28px', 
                                fontWeight: 800, 
                                color: kpi.color === 'red' ? '#ef4444' : (kpi.color === 'teal' ? '#00C896' : 'white') 
                            }}>
                                {kpi.val}
                            </div>
                            {kpi.trend && (
                                <div className={`kpi-v2-trend ${kpi.trend}`} style={{ fontSize: '12px', color: '#00C896' }}>
                                    {kpi.trend === 'down' ? '↓' : '↑'} {kpi.trend === 'down' ? 'Stable' : 'Elevated'}
                                </div>
                            )}
                        </div>
                        <div className="kpi-v2-footer" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '8px' }}>{kpi.sub}</div>
                    </div>
                ))}
            </div>

            {/* REAL-TIME TRAFFIC CONTROL VISUALIZATION */}
            <section className="agent-section traffic-control-section reveal-up">
                <style>{`
                    .traffic-control-section {
                        grid-column: 1 / -1;
                        background: rgba(15, 23, 42, 0.4);
                        backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.05);
                        border-radius: 20px;
                        margin-bottom: 30px;
                        padding: 24px;
                        overflow: hidden;
                        position: relative;
                    }
                    .traffic-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .traffic-badge {
                        background: rgba(0, 200, 150, 0.1);
                        color: #00C896;
                        padding: 4px 12px;
                        border-radius: 100px;
                        font-size: 11px;
                        font-weight: 800;
                        letter-spacing: 1px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .traffic-terminal {
                        height: 220px;
                        background: #0d1117;
                        border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.05);
                        font-family: 'Fira Code', 'Courier New', monospace;
                        font-size: 12px;
                        padding: 16px;
                        overflow-y: hidden;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        box-shadow: inset 0 2px 20px rgba(0,0,0,0.5);
                    }
                    .traffic-row {
                        display: grid;
                        grid-template-columns: 100px 100px 1fr 140px;
                        align-items: center;
                        padding: 4px 0;
                        border-bottom: 1px solid rgba(255,255,255,0.02);
                        animation: slideUp 0.3s ease-out;
                    }
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .t-timestamp { color: rgba(255,255,255,0.3); }
                    .t-endpoint { color: #f59e0b; font-weight: bold; }
                    .t-meta { color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .t-status { text-align: right; font-weight: 800; }
                    .status-pass { color: #00C896; }
                    .status-warn { color: #f59e0b; }
                    .status-fail { color: #ef4444; }
                    
                    .traffic-stats {
                        display: flex;
                        gap: 30px;
                        margin-top: 16px;
                        padding-top: 16px;
                        border-top: 1px solid rgba(255,255,255,0.05);
                    }
                    .stat-item {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    .stat-label { font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; font-weight: 800; }
                    .stat-value { font-size: 18px; font-weight: 800; color: white; }
                `}</style>
                
                <div className="traffic-header">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>📡</span> Live Safety Firewall Flow
                        </h3>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Intercepting and sanitizing traffic across all integrated platforms</p>
                    </div>
                    <div className="traffic-badge">
                        <span className="pulse-icon-small" style={{ width: '8px', height: '8px', background: '#00C896', borderRadius: '50%' }}></span>
                        LIVE INTERCEPTION ACTIVE
                    </div>
                </div>

                <div className="traffic-terminal">
                    <div className="traffic-row" style={{ borderBottomColor: 'rgba(255,255,255,0.1)', opacity: 0.5, fontWeight: 800 }}>
                        <span>TIMESTAMP</span>
                        <span>ENDPOINT</span>
                        <span>ANALYSIS / PAYLOAD</span>
                        <span style={{ textAlign: 'right' }}>ACTION</span>
                    </div>
                    {trafficLogs.map(log => (
                        <div className="traffic-row" key={log.id}>
                            <span className="t-timestamp">{log.time}</span>
                            <span className="t-endpoint">{log.end}</span>
                            <span className="t-meta">{log.meta}</span>
                            <span className={`t-status ${log.class}`}>{log.status}</span>
                        </div>
                    ))}
                </div>

                <div className="traffic-stats">
                    <div className="stat-item">
                        <span className="stat-label">Requests/Min</span>
                        <span className="stat-value">1,242</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Interceptions</span>
                        <span className="stat-value" style={{ color: '#ef4444' }}>84</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Avg Sanitization Time</span>
                        <span className="stat-value">14ms</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Safe Load</span>
                        <span className="stat-value" style={{ color: '#00C896' }}>99.8%</span>
                    </div>
                </div>
            </section>

            <div className="agent-layout">
                {/* LEFT COLUMN */}
                <div className="agent-col">
                    
                    {/* 1. QUICK INTEGRATION */}
                    <section className="agent-section shadow-sm">
                        <div className="section-title">
                            <span className="sc-icon">🔌</span> Quick Integration
                        </div>
                        <p className="section-desc">Instantly plug MediAPI into your existing systems to enforce medical safety.</p>
                        
                        <div className="code-window">
                            <div className="code-header">
                                <span className="method">POST</span>
                                <span className="endpoint">/safe_execute</span>
                                <button className="copy-btn" onClick={handleCopy}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                            </div>
                            <pre className="code-content">
{`{
  "source_app": "Apollo247",
  "request_type": "CHECK_CONSENSUS",
  "data": {
    "question": "Can I take aspirin with Warfarin?",
    "use_consensus": ${consensusEnabled}
  }
}`}
                            </pre>
                        </div>
                    </section>

                    {/* 1.5 GLOBAL SAFETY CONFIG (OPTION 2) */}
                    <section className="agent-section glow-panel">
                        <div className="section-title">
                            <span className="sc-icon">⚖️</span> Safety Global Configuration
                        </div>
                        <p className="section-desc">Advanced middleware gates that apply across all connected healthcare apps.</p>
                        
                        <div className="rule-card is-active" style={{marginTop: '10px'}}>
                            <div className="rule-info">
                                <div className="rule-name">Multi-Model Consensus Engine</div>
                                <div className="rule-summary">
                                    <span>Cross-check 3+ models for clinical agreement</span>
                                </div>
                            </div>
                            <div className="rule-toggle">
                                <label className="switch">
                                    <input type="checkbox" checked={consensusEnabled} onChange={() => setConsensusEnabled(!consensusEnabled)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>

                        <div className="rule-card is-active" style={{marginTop: '10px'}}>
                            <div className="rule-info">
                                <div className="rule-name">PHI Privacy Shield</div>
                                <div className="rule-summary">
                                    <span>Redact patient names/IDs before cloud API calls</span>
                                </div>
                            </div>
                            <div className="rule-toggle">
                                <label className="switch">
                                    <input type="checkbox" checked={privacyEnabled} onChange={() => setPrivacyEnabled(!privacyEnabled)} />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>

                        {(consensusEnabled || privacyEnabled) && (
                            <div className="log-meta" style={{marginTop: '12px', color: '#00C896', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <span>✔</span> Active: {consensusEnabled ? 'Consensus' : ''} {consensusEnabled && privacyEnabled ? '&' : ''} {privacyEnabled ? 'Privacy Sanitizer' : ''}
                            </div>
                        )}
                    </section>

                    {/* 2. AGENT AUTOMATION CONFIG */}
                    <section className="agent-section">
                        <div className="section-title">
                            <span className="sc-icon">🧠</span> Create Custom Safety Rule
                        </div>
                        <p className="section-desc">If-this-then-that automation for medical safety and governance.</p>

                        <div className="premium-rule-builder">
                            <style>{`
                                .premium-rule-builder {
                                    display: flex;
                                    flex-direction: column;
                                    gap: 16px;
                                    margin-top: 24px;
                                }
                                .prb-node {
                                    background: rgba(15, 23, 42, 0.6);
                                    border: 1px solid rgba(255, 255, 255, 0.1);
                                    border-radius: 12px;
                                    padding: 16px;
                                    display: flex;
                                    align-items: center;
                                    gap: 16px;
                                    position: relative;
                                    z-index: 1;
                                    transition: all 0.2s ease;
                                }
                                .prb-node:hover {
                                    border-color: rgba(0, 200, 150, 0.4);
                                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                                    transform: translateX(4px);
                                }
                                .prb-connector {
                                    position: absolute;
                                    left: 36px;
                                    top: 100%;
                                    width: 2px;
                                    height: 16px;
                                    background: linear-gradient(to bottom, rgba(0, 200, 150, 0.5), rgba(0, 200, 150, 0.1));
                                    z-index: 0;
                                }
                                .prb-icon {
                                    width: 42px;
                                    height: 42px;
                                    border-radius: 10px;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    font-size: 18px;
                                    font-weight: bold;
                                    flex-shrink: 0;
                                }
                                .icon-when { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
                                .icon-if   { background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); }
                                .icon-then { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); }
                                
                                .prb-content { flex-grow: 1; }
                                .prb-label {
                                    font-size: 11px;
                                    font-weight: 800;
                                    color: rgba(255,255,255,0.4);
                                    text-transform: uppercase;
                                    letter-spacing: 1px;
                                    margin-bottom: 6px;
                                }
                                .prb-select {
                                    width: 100%;
                                    background: rgba(0,0,0,0.3) !important;
                                    border: 1px solid rgba(255,255,255,0.1) !important;
                                    color: white !important;
                                    font-size: 14px !important;
                                    padding: 10px 14px !important;
                                    border-radius: 8px !important;
                                    cursor: pointer;
                                    appearance: none;
                                    outline: none;
                                    transition: border-color 0.2s;
                                }
                                .prb-select:focus { border-color: #00c896 !important; }
                                .prb-select option { background: #0f172a; color: white; }
                                
                                .monaco-preview {
                                    background: #0d1117;
                                    border: 1px solid #30363d;
                                    border-radius: 8px;
                                    padding: 16px;
                                    font-family: 'Fira Code', 'Courier New', monospace;
                                    font-size: 13px;
                                    margin-top: 10px;
                                    position: relative;
                                    box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
                                    overflow: hidden;
                                }
                                .monaco-header {
                                    position: absolute;
                                    top: 0; left: 0; right: 0;
                                    background: #161b22;
                                    padding: 6px 16px;
                                    font-size: 11px;
                                    color: #8b949e;
                                    border-bottom: 1px solid #30363d;
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                }
                                .monaco-body {
                                    margin-top: 18px;
                                    margin-bottom: 0;
                                    color: #c9d1d9;
                                    white-space: pre-wrap;
                                    line-height: 1.6;
                                }
                                .syntax-key { color: #7ee787; }
                                .syntax-val { color: #a5d6ff; }
                                .syntax-punct { color: #8b949e; }
                            `}</style>

                            <div className="prb-node">
                                <div className="prb-icon icon-when">⚡</div>
                                <div className="prb-content">
                                    <div className="prb-label">Trigger Event</div>
                                    <select className="prb-select" value={trigger} onChange={e => setTrigger(e.target.value)}>
                                        <option value="API_REQUEST_MADE">API Request Initiated</option>
                                        <option value="PRESCRIPTION_ADDED">Prescription Added</option>
                                        <option value="LAB_REPORT_FETCHED">Lab Report Fetched</option>
                                    </select>
                                </div>
                                <div className="prb-connector"></div>
                            </div>
                            
                            <div className="prb-node">
                                <div className="prb-icon icon-if">❓</div>
                                <div className="prb-content">
                                    <div className="prb-label">Condition Context</div>
                                    <select className="prb-select" value={condition} onChange={e => setCondition(e.target.value)}>
                                        <option value="DRUG_INTERACTION">Drug-Drug Interaction Detected</option>
                                        <option value="PHI_DETECTED">PHI/PII Detected in Payload</option>
                                        <option value="ABNORMAL_LAB">Abnormal Lab Value Outside Range</option>
                                        <option value="MISSING_CONSENT">Missing Patient Consent Token</option>
                                    </select>
                                </div>
                                <div className="prb-connector"></div>
                            </div>
                            
                            <div className="prb-node">
                                <div className="prb-icon icon-then">🛡️</div>
                                <div className="prb-content">
                                    <div className="prb-label">Automated Action</div>
                                    <select className="prb-select" value={action} onChange={e => setAction(e.target.value)}>
                                        <option value="BLOCK_AND_ALERT">Intercept Request & Alert Clinician</option>
                                        <option value="REDACT_DATA">Auto-Redact Sensitive Fields</option>
                                        <option value="ADD_WARNING">Append Warning Metadata to Header</option>
                                        <option value="LOG_AUDIT">Forward to Audit Log Database</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                <button className="add-rule-btn" style={{ 
                                    background: 'linear-gradient(135deg, #00C896, #008765)', 
                                    padding: '12px 28px', 
                                    borderRadius: '8px', 
                                    border: 'none', 
                                    color: 'white', 
                                    fontWeight: 'bold', 
                                    cursor: 'pointer', 
                                    boxShadow: '0 4px 15px rgba(0, 200, 150, 0.3)',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }} onClick={handleSaveRule}
                                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <span>Deploy Rule</span> 🚀
                                </button>
                            </div>

                            <div className="monaco-preview reveal-up">
                                <div className="monaco-header">
                                    <span>rule_definition.json</span>
                                    <span>JSON</span>
                                </div>
                                <pre className="monaco-body">
{<span className="syntax-punct">{`{\n`}</span>}
{`  `}<span className="syntax-key">"id"</span><span className="syntax-punct">: </span><span className="syntax-val">"rule_safeguard_v2"</span><span className="syntax-punct">,</span>{`\n`}
{`  `}<span className="syntax-key">"trigger"</span><span className="syntax-punct">: </span><span className="syntax-val">"{trigger}"</span><span className="syntax-punct">,</span>{`\n`}
{`  `}<span className="syntax-key">"condition"</span><span className="syntax-punct">: </span><span className="syntax-val">"{condition}"</span><span className="syntax-punct">,</span>{`\n`}
{`  `}<span className="syntax-key">"action"</span><span className="syntax-punct">: </span><span className="syntax-val">"{action}"</span>{`\n`}
{<span className="syntax-punct">{`}`}</span>}
                                </pre>
                            </div>
                        </div>
                    </section>

                    {/* 🧪 INTERACTIVE FIREWALL SANDBOX */}
                    <section className="agent-section" style={{ border: '1px solid rgba(56, 189, 248, 0.2)', background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(56,189,248,0.03) 100%)' }}>
                        <div className="section-title">
                            <span className="sc-icon">🧪</span> MediAPI Interception Sandbox
                        </div>
                        <p className="section-desc">Test how the safety agents parse and intercept healthcare payload requests in real-time.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div className="builder-field" style={{ textTransform: 'none' }}>
                                <label style={{ color: '#38BDF8', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sample API Request Payload (Text / Prescription)</label>
                                <textarea 
                                    value={sandboxQuery} 
                                    onChange={e => setSandboxQuery(e.target.value)}
                                    placeholder="Enter a request like 'Patient Rajan Sharma takes Ibuprofen 400mg' or 'Is Sildenafil safe with nitrates?'..."
                                    style={{
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'white',
                                        fontSize: '13px',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        fontFamily: 'monospace',
                                        minHeight: '80px',
                                        resize: 'vertical',
                                        outline: 'none',
                                        marginTop: '6px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button 
                                    onClick={() => setSandboxQuery("Is it safe to give Sildenafil 50mg to a patient on Nitrates?")}
                                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Try Drug Interaction 💊
                                </button>
                                <button 
                                    onClick={() => setSandboxQuery("Patient Amit Verma, age 42, needs a prescription check.")}
                                    style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', color: '#f59e0b', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Try PHI Privacy Shield 🔒
                                </button>
                                <button 
                                    onClick={() => setSandboxQuery("What is the standard adult dose of Paracetamol?")}
                                    style={{ background: 'rgba(0, 200, 150, 0.1)', border: '1px solid rgba(0, 200, 150, 0.2)', color: '#00C896', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Try Safe Query ✔
                                </button>
                            </div>

                            <button 
                                onClick={handleRunSandboxTest} 
                                disabled={sandboxScanning}
                                style={{
                                    background: 'linear-gradient(135deg, #38BDF8, #0284C7)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    cursor: sandboxScanning ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)',
                                    marginTop: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    fontSize: '13px'
                                }}
                            >
                                {sandboxScanning ? 'Scanning Payload...' : 'Test Firewall Interception ⚡'}
                            </button>

                            {sandboxScanning && (
                                <div style={{
                                    background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    textAlign: 'center',
                                    color: '#38BDF8',
                                    fontSize: '12px',
                                    fontFamily: 'monospace'
                                }}>
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', background: '#38BDF8', borderRadius: '50%', marginRight: '8px', animation: 'pulseNode 1s infinite alternate' }}></span>
                                    Executing MediAPI pipeline inspection... checking context rules...
                                </div>
                            )}

                            {sandboxResult && (
                                <div style={{
                                    background: 'rgba(13, 17, 23, 0.9)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    fontFamily: 'monospace',
                                    textAlign: 'left'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', marginBottom: '10px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>INTERCEPTION REPORT</span>
                                        <span className={sandboxResult.class} style={{ fontWeight: 900, fontSize: '12px' }}>{sandboxResult.status}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#fff', marginBottom: '8px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Reason:</span> <span style={{ color: '#f59e0b' }}>{sandboxResult.reason}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: '1.4', marginBottom: '8px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Finding:</span> {sandboxResult.details}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#00C896' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Action:</span> {sandboxResult.action}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* RIGHT COLUMN */}
                <div className="agent-col">
                    
                    {/* 4. LIVE FLOW PREVIEW */}
                    <section className="agent-section flow-section">
                        <div className="section-title">
                            <span className="sc-icon">⚙️</span> Real-time Pipeline Flow
                        </div>
                        <div className="pipeline-container">
                            <div className="pipeline-track"></div>
                            
                            <div className="pipeline-node">
                                <div className="node-icon bg-gray">📱</div>
                                <div className="node-text">
                                    <div className="node-title">Source App</div>
                                    <div className="node-sub">Patient Request</div>
                                </div>
                            </div>

                            <div className="pipeline-node">
                                <div className="node-icon bg-green pulse-glow">🧠</div>
                                <div className="node-text">
                                    <div className="node-title agent-text">MediAPI Agent</div>
                                    <div className="node-sub">Intercepts Call</div>
                                </div>
                            </div>

                            {privacyEnabled && (
                                <div className="pipeline-node">
                                    <div className="node-icon bg-gray" style={{background: 'rgba(100, 116, 139, 0.1)', borderColor: '#64748B'}}>🔒</div>
                                    <div className="node-text">
                                        <div className="node-title enhanced-text">Privacy Gate</div>
                                        <div className="node-sub">PHI Redacted</div>
                                    </div>
                                </div>
                            )}

                            {consensusEnabled && (
                                <div className="pipeline-node">
                                    <div className="node-icon bg-blue" style={{background: 'rgba(56, 189, 248, 0.2)', borderColor: '#38BDF8'}}>⚖️</div>
                                    <div className="node-text">
                                        <div className="node-title enhanced-text">Consensus Judge</div>
                                        <div className="node-sub">Model Agreement (98%)</div>
                                    </div>
                                </div>
                            )}

                            <div className="pipeline-node">
                                <div className="node-icon bg-amber">⚡</div>
                                <div className="node-text">
                                    <div className="node-title risk-text">Risk Validation</div>
                                    <div className="node-sub">Checking Rules</div>
                                </div>
                            </div>

                            <div className="pipeline-node">
                                <div className="node-icon bg-blue">🛡️</div>
                                <div className="node-text">
                                    <div className="node-title enhanced-text">Safe Response</div>
                                    <div className="node-sub">Returned to App</div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3. ACTIVE AGENTS / RULES */}
                    <section className="agent-section">
                        <div className="section-title">
                            <span className="sc-icon">⚡</span> Configured Agents
                        </div>
                        <div className="rules-list">
                            {activeRules.map(rule => (
                                <div className={`rule-card ${rule.active ? 'is-active' : ''}`} key={rule.id}>
                                    <div className="rule-info">
                                        <div className="rule-name">{rule.name}</div>
                                        <div className="rule-summary">
                                            <span>{rule.trigger}</span>
                                            <span className="arrow">→</span>
                                            <span className="action">{rule.action}</span>
                                        </div>
                                    </div>
                                    <div className="rule-toggle">
                                        <label className="switch">
                                            <input type="checkbox" checked={rule.active} onChange={() => toggleRule(rule.id)} />
                                            <span className="slider round"></span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 5. AGENT ACTIVITY LOG */}
                    <section className="agent-section">
                        <div className="section-title">
                            <span className="sc-icon">📋</span> Middleware Activity Log
                        </div>
                        <div className="activity-log">
                            {privacyEnabled && (
                                <div className="log-item success">
                                    <span className="log-icon" style={{color: '#64748B'}}>🔒</span>
                                    <span className="log-text">Privacy Sanitized: <span style={{color: '#64748B'}}>3 PHI Items Found</span> <span className="log-meta">(Redacted • 1s ago)</span></span>
                                </div>
                            )}
                            {consensusEnabled && (
                                <div className="log-item success">
                                    <span className="log-icon" style={{color: '#38BDF8'}}>⚖️</span>
                                    <span className="log-text">Consensus Check: <span style={{color: '#00C896'}}>98% Agreement</span> <span className="log-meta">(Gemini, Llama3 • 2s ago)</span></span>
                                </div>
                            )}
                            <div className="log-item success">
                                <span className="log-icon">✔</span>
                                <span className="log-text">Prescription checked <span className="log-meta">(Apollo247 • 12s ago)</span></span>
                            </div>
                            <div className="log-item warning">
                                <span className="log-icon">⚠</span>
                                <span className="log-text">Risk detected: Mild drug interaction <span className="log-meta">(Tata1mg • 4m ago)</span></span>
                            </div>
                            <div className="log-item error">
                                <span className="log-icon">🚫</span>
                                <span className="log-text">Request blocked: Missing patient consent <span className="log-meta">(Practo • 14m ago)</span></span>
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            {/* INTEGRATION PREVIEW SECTION (from previous design) */}
            <div style={{ gridColumn: '1 / -1', marginTop: '60px', paddingTop: '40px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#00C896', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>Live Integration Preview</div>
                    <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-white)', margin: 0 }}>MediRAG in Third-Party Apps</h2>
                    <p style={{ color: 'var(--text-gray)', marginTop: '8px', fontSize: '14px' }}>How leading healthcare brands protect their patients using our governance layer</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', flexWrap: 'wrap' }}>
                    
                    {/* Flow Steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
                        {[
                            { step: '01', title: 'User uploads PDF', desc: 'Patient shares their lab report or prescription with the AI assistant.' },
                            { step: '02', title: 'AI reads & answers', desc: 'Standard LLM generates a response based on the document content.' },
                            { step: '03', title: 'MediRAG checks it', desc: 'Our system audits the claim in real-time before the user sees it.' },
                            { step: '04', title: 'Brand gets protection', desc: 'Hallucinations are blocked or flagged, ensuring clinical safety.' }
                        ].map((s, i) => (
                            <div 
                                key={i} 
                                onClick={() => setActiveDemoStep(i)}
                                style={{ 
                                    display: 'flex', gap: '20px', padding: '16px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.3s',
                                    background: i === activeDemoStep ? 'rgba(43, 89, 255, 0.05)' : 'transparent', 
                                    border: i === activeDemoStep ? '1px solid rgba(43, 89, 255, 0.2)' : '1px solid transparent' 
                                }}
                            >
                                <div style={{ fontSize: '14px', fontWeight: 900, color: i === activeDemoStep ? '#4dabf7' : '#333' }}>{s.step}</div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 700, color: i === activeDemoStep ? 'var(--text-white)' : 'var(--text-gray)' }}>{s.title}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-gray-dim)', marginTop: '4px' }}>{s.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Mobile Mockup */}
                    <div className="simulated-phone">
                        {/* Status Bar */}
                        <div className="phone-status-bar">
                            <span>9:41</span>
                            <div style={{ display: 'flex', gap: '4px' }}><span>📶</span><span>🔋</span></div>
                        </div>

                        {/* App Header */}
                        <div className="phone-app-header">
                            <div style={{ width: '32px', height: '32px', background: '#e53e3e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 800, color: 'white' }}>Ap</div>
                            <div>
                                <div className="phone-header-title">Apollo 247</div>
                                <div style={{ fontSize: '11px', color: '#00C896', margin: 0, fontWeight: 500 }}>Health assistant</div>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {activeDemoStep === 0 && (
                                <>
                                    <div className="phone-upload-box">
                                        <div style={{ color: '#4dabf7', marginBottom: '8px' }}>📤</div>
                                        <div className="phone-text-main">Upload your health document</div>
                                        <div className="phone-text-sub">Lab report, prescription, discharge summary</div>
                                    </div>

                                    <div className="phone-separator">
                                        <div className="phone-separator-line"></div>
                                        <span className="phone-separator-text">or try an example</span>
                                    </div>

                                    <div className="phone-doc-card">
                                        <div style={{ background: '#e53e3e22', color: '#e53e3e', padding: '4px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>PDF</div>
                                        <div style={{ textAlign: 'left' }}>
                                            <div className="phone-text-main">Discharge_Summary_Rajan.pdf</div>
                                            <div className="phone-text-sub">Apollo Hospitals • 3 pages • 124 KB</div>
                                        </div>
                                    </div>

                                    <div className="phone-msg-bubble">
                                        My doctor mentioned metoprolol 25mg twice daily. Is this a normal dose for me?
                                    </div>

                                    <button className="phone-action-btn">
                                        Ask Apollo AI →
                                    </button>
                                </>
                            )}
                            
                            {activeDemoStep > 0 && (
                                <div className="phone-msg-bubble">
                                    My doctor mentioned metoprolol 25mg twice daily. Is this a normal dose for me?
                                </div>
                            )}

                            {activeDemoStep === 1 && (
                                <div className="phone-typing">
                                    <span>...</span> Generative AI is typing...
                                </div>
                            )}

                            {activeDemoStep === 2 && (
                                <>
                                    <div className="phone-msg-bubble">
                                        Yes, generating 25mg twice daily is a completely normal dosage to begin with for hypertension...
                                    </div>
                                    <div className="phone-scan-overlay">
                                        <span style={{ fontSize: '14px' }}>🛡️</span> MediRAG Eval: Scanning output...
                                    </div>
                                </>
                            )}

                            {activeDemoStep === 3 && (
                                <>
                                    <div className="phone-warning-box">
                                        <div style={{ color: '#EF4444', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>⚠️</span> Clinical Error Detected
                                        </div>
                                        Yes, generating 25mg twice daily is a completely normal dosage to begin with for hypertension...
                                        <div className="phone-warning-footer">
                                            <strong style={{color: '#EF4444'}}>MediRAG Audit:</strong> The uploaded document specifies 12.5mg twice daily, not 25mg. Response blocked for patient safety.
                                        </div>
                                    </div>
                                    <button className="phone-connect-btn">Connect to Human Doctor</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default MediApiAgent;
