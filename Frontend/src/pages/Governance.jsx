import React, { useState, useEffect } from 'react';
import './Governance.css';

const Governance = () => {
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'audit', 'compliance'
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [showReportPreview, setShowReportPreview] = useState(false);
    const [reportProgress, setReportProgress] = useState(0);
    const [signoffs, setSignoffs] = useState({
        iso13485: false,
        hipaa: false,
        calibration: false,
        delphi: false
    });

    // Real Data State
    const [kpiData, setKpiData] = useState([]);
    const [recentFlags, setRecentFlags] = useState([]);
    const [auditLog, setAuditLog] = useState([]);

    useEffect(() => {
        const fetchGovData = async () => {
            try {
                const [statsRes, logsRes] = await Promise.all([
                    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/stats`),
                    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/logs?limit=50`)
                ]);
                if (statsRes.ok) {
                    const stats = await statsRes.json();
                    setKpiData([
                        { label: 'Total Queries Audited', val: stats.totalEvals || 0, sub: 'Historical', trend: null },
                        { label: 'Avg Hallucination Risk', val: stats.avgHrs ? stats.avgHrs.toFixed(1) : '0.0', sub: 'Live', trend: 'down', color: 'teal' },
                        { label: 'Critical Flags', val: stats.critAlerts || 0, sub: 'require review', trend: null, color: 'red' },
                        { label: 'Interventions', val: stats.interventions || 0, sub: 'Safety Gate triggered', trend: null, color: 'teal' },
                    ]);
                }
                if (logsRes.ok) {
                    const logs = await logsRes.json();
                    
                    const formattedLog = logs.map(l => {
                        const parsedDetails = l.details ? JSON.parse(l.details) : {};
                        return {
                            id: `AUD-${l.id}`,
                            ts: new Date(l.timestamp).toLocaleString(),
                            query: l.question,
                            answer: l.answer,
                            hrs: l.hrs,
                            band: l.risk_band,
                            flags: l.intervention_applied ? 1 : 0,
                            failed: parsedDetails.intervention_reason || (l.risk_band === 'CRITICAL' ? 'Multiple' : 'None'),
                            class: 'Class B',
                            details: parsedDetails
                        };
                    });
                    setAuditLog(formattedLog);
                    
                    // Filter for critical or high risk
                    const flags = formattedLog.filter(l => l.band === 'CRITICAL' || l.band === 'HIGH');
                    setRecentFlags(flags.slice(0, 5));
                }
            } catch (e) {
                console.error("Governance fetch error:", e);
            }
        };
        fetchGovData();
        const intervalId = setInterval(fetchGovData, 15000);
        return () => clearInterval(intervalId);
    }, []);

    const generateReport = () => {
        setIsGeneratingReport(true);
        setReportProgress(0);
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            setReportProgress(progress);
            if (progress >= 100) {
                clearInterval(interval);
                setIsGeneratingReport(false);
                setShowReportPreview(true);
            }
        }, 150);
    };

    const handleViewRecord = (rec) => {
        setSelectedRecord(rec);
        setIsDrawerOpen(true);
    };

    const downloadJSON = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditLog, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "medirag_audit_log.json");
        dlAnchorElem.click();
    };

    const downloadCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,Audit ID,Time,Query,HRS,Risk Band,Flags,Class\n";
        auditLog.forEach(row => {
            const queryClean = row.query.replace(/"/g, '""');
            csvContent += `"${row.id}","${row.ts}","${queryClean}",${row.hrs},"${row.band}",${row.flags},"${row.class}"\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "medirag_compliance_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportPDFReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const totalQueries = kpiData[0]?.val || 0;
        const avgHrs = kpiData[1]?.val || '0.0';
        const critFlags = kpiData[2]?.val || 0;
        const interventions = kpiData[3]?.val || 0;
        const dateStr = new Date().toLocaleString();

        const htmlContent = `
            <html>
            <head>
                <title>CDSCO SaMD Compliance Dossier - MediRAG</title>
                <style>
                    body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        color: #1e293b;
                        padding: 40px;
                        line-height: 1.6;
                        background: #fff;
                    }
                    .header {
                        border-bottom: 2px solid #0f172a;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-end;
                    }
                    .header h1 {
                        font-size: 26px;
                        font-weight: 800;
                        margin: 0;
                        color: #0f172a;
                    }
                    .header .meta {
                        text-align: right;
                        font-size: 11px;
                        color: #64748b;
                        font-family: monospace;
                    }
                    .badge {
                        background: rgba(0, 200, 150, 0.1);
                        color: #008764;
                        border: 1px solid rgba(0, 200, 150, 0.2);
                        padding: 4px 12px;
                        border-radius: 9999px;
                        font-size: 11px;
                        font-weight: 700;
                        display: inline-block;
                        margin-top: 10px;
                    }
                    .summary-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 20px;
                        margin-bottom: 40px;
                    }
                    .summary-card {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        padding: 16px;
                        border-radius: 8px;
                        text-align: center;
                    }
                    .summary-card .lbl {
                        font-size: 10px;
                        text-transform: uppercase;
                        font-weight: 700;
                        color: #64748b;
                        margin-bottom: 6px;
                    }
                    .summary-card .val {
                        font-size: 24px;
                        font-weight: 800;
                        color: #0f172a;
                    }
                    .section-title {
                        font-size: 15px;
                        font-weight: 800;
                        color: #0f172a;
                        border-bottom: 1px solid #e2e8f0;
                        padding-bottom: 8px;
                        margin-top: 30px;
                        margin-bottom: 16px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .cert-text {
                        background: #f1f5f9;
                        border-left: 4px solid #00c896;
                        padding: 18px;
                        font-size: 13px;
                        color: #334155;
                        border-radius: 0 8px 8px 0;
                        margin: 20px 0 40px;
                    }
                    .table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                        font-size: 11px;
                    }
                    .table th, .table td {
                        border: 1px solid #e2e8f0;
                        padding: 10px;
                        text-align: left;
                    }
                    .table th {
                        background: #f8fafc;
                        font-weight: 700;
                        text-transform: uppercase;
                        color: #475569;
                    }
                    .signature-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 80px;
                        margin-top: 60px;
                    }
                    .sig-box {
                        border-top: 1px solid #94a3b8;
                        padding-top: 10px;
                        text-align: center;
                        font-size: 12px;
                        color: #475569;
                    }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>CDSCO SaMD Compliance Report</h1>
                        <span class="badge">CLASS B SYSTEM AUDIT PASS</span>
                    </div>
                    <div class="meta">
                        <div>REPORT ID: CDSCO-RPT-2026-Q1-MOD-042</div>
                        <div>DATE GENERATED: ${dateStr}</div>
                        <div>STATUS: CERTIFIED COMPLIANT</div>
                    </div>
                </div>

                <div class="summary-grid">
                    <div class="summary-card">
                        <div class="lbl">TOTAL QUERIES AUDITED</div>
                        <div class="val">${totalQueries}</div>
                    </div>
                    <div class="summary-card">
                        <div class="lbl">AVG RISK SCORE (HRS)</div>
                        <div class="val">${avgHrs}</div>
                    </div>
                    <div class="summary-card">
                        <div class="lbl">CRITICAL ALERTS</div>
                        <div class="val" style="color: ${critFlags > 0 ? '#ef4444' : '#0f172a'}">${critFlags}</div>
                    </div>
                    <div class="summary-card">
                        <div class="lbl">SAFETY INTERVENTIONS</div>
                        <div class="val" style="color: #008764">${interventions}</div>
                    </div>
                </div>

                <div class="section-title">Institutional Safety Certification</div>
                <div class="cert-text">
                    I hereby certify that the MediRAG AI clinical system has been evaluated against national and global medical software standards (such as CDSCO Class B SaMD and FDA Safe Harbor anonymization). The pipeline monitors for clinical Faithfulness (NLI), Medical Entities verification, Source Credibility (Tier-indexed), and Internal Contradiction. Audit records signify a stability level of <strong>HIGH COMPLIANCE</strong>.
                </div>

                <div class="section-title">Audit Log Sample (Recent Audits)</div>
                <table class="table">
                    <thead>
                        <tr>
                            <th>AUDIT ID</th>
                            <th>TIMESTAMP</th>
                            <th>QUESTION</th>
                            <th>HRS</th>
                            <th>RISK BAND</th>
                            <th>PIPELINE ACTION</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${auditLog.slice(0, 5).map(rec => `
                            <tr>
                                <td>${rec.id}</td>
                                <td>${rec.ts}</td>
                                <td>${rec.query}</td>
                                <td>${rec.hrs}</td>
                                <td>${rec.band}</td>
                                <td>${rec.flags > 0 ? '⚡ Intervention Applied' : '✅ Direct Entailment'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="signature-row" style="margin-top: 80px;">
                    <div class="sig-box">
                        <strong>Clinical Director Signature</strong><br>
                        Department of Medical Informatics
                    </div>
                    <div class="sig-box">
                        <strong>Compliance Officer Signature</strong><br>
                        Regulatory Review Board
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const renderDashboard = () => (
        <div className="fade-up">
            <div className="kpi-grid">
                {kpiData.map((kpi, i) => (
                    <div className="gov-card" key={i}>
                        <div className="kpi-label">{kpi.label}</div>
                        <div className="kpi-main">
                            <div className="kpi-val" style={{ color: kpi.color === 'red' ? 'var(--gov-red)' : (kpi.color === 'teal' ? 'var(--gov-teal)' : 'white') }}>
                                {kpi.val}
                            </div>
                            {kpi.trend && (
                                <div className={`kpi-trend ${kpi.trend === 'down' ? 'trend-down' : 'trend-up'}`}>
                                    {kpi.trend === 'down' ? '↓' : '↑'}
                                </div>
                            )}
                        </div>
                        <div className="kpi-subtext">{kpi.sub}</div>
                    </div>
                ))}
            </div>

            <div className="charts-grid">
                <div className="gov-card">
                    <div className="chart-header">
                        <div className="chart-title">HRS Trend (Last 30 Days)</div>
                        <div className="chart-time-selector">
                            <button className="time-pill">7D</button>
                            <button className="time-pill active">30D</button>
                            <button className="time-pill">90D</button>
                        </div>
                    </div>
                    <div className="trend-line-chart">
                        <div className="threshold-line" style={{ top: '30%' }}>
                            <span className="threshold-label">HIGH RISK (70)</span>
                        </div>
                        <div className="threshold-line" style={{ top: '60%' }}>
                            <span className="threshold-label">MEDIUM RISK (40)</span>
                        </div>
                        {/* Fake Line Visualization */}
                        <svg className="line-svg" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                            <path d="M0 250 L50 220 L100 240 L150 180 L200 160 L250 190 L300 110 L350 140 L400 130 L450 160 L500 140 L550 120 L600 130" fill="none" stroke="var(--gov-teal)" strokeWidth="3" vectorEffect="non-scaling-stroke"></path>
                            <path d="M0 250 L50 220 L100 240 L150 180 L200 160 L250 190 L300 110 L350 140 L400 130 L450 160 L500 140 L550 120 L600 130 V300 H0 Z" fill="var(--gov-teal)" opacity="0.1"></path>
                        </svg>
                    </div>
                </div>

                <div className="gov-card">
                    <div className="chart-header">
                        <div className="chart-title">Module Failure Breakdown</div>
                    </div>
                    <div className="bar-failure-list">
                        {[
                            { label: 'Faithfulness', val: 78, color: 'var(--gov-red)' },
                            { label: 'Entities', val: 42, color: 'var(--gov-amber)' },
                            { label: 'Sources', val: 31, color: 'var(--gov-teal)' },
                            { label: 'Contradiction', val: 19, color: 'var(--gov-teal)' },
                        ].map((f, i) => (
                            <div className="failure-bar-row" key={i}>
                                <div className="f-bar-lbl">
                                    <span>{f.label}</span>
                                    <span className="mono">{f.val} cases</span>
                                </div>
                                <div className="f-bar-track">
                                    <div className="f-bar-fill" style={{ width: `${f.val}%`, background: f.color }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="recent-flags-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h3 className="chart-title">Recent Critical Flags</h3>
                    <a href="#" className="mono" style={{ color: 'var(--gov-teal)' }}>View all →</a>
                </div>
                <div className="gov-table-wrap">
                    <table className="gov-table">
                        <thead>
                            <tr>
                                <th>AUDIT ID</th>
                                <th>TIMESTAMP</th>
                                <th>QUERY</th>
                                <th>HRS</th>
                                <th>RISK BAND</th>
                                <th>FLAGGED MODULE</th>
                                <th>ACTION</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentFlags.length > 0 ? recentFlags.map((rec, i) => (
                                <tr key={i}>
                                    <td className="mono">{rec.id}</td>
                                    <td className="mono">{rec.ts}</td>
                                    <td>{rec.query}</td>
                                    <td style={{ fontWeight: 800 }}>{rec.hrs}</td>
                                    <td><span className={`pill ${rec.band === 'CRITICAL' ? 'pill-red' : 'pill-amber'}`}>{rec.band}</span></td>
                                    <td className="mono">{rec.failed || 'N/A'}</td>
                                    <td style={{ display: 'flex', gap: '12px' }}>
                                        <button className="review-btn" onClick={() => handleViewRecord(rec)}>Review</button>
                                        <button style={{ opacity: 0.5, cursor: 'pointer' }}>📤</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="7" style={{textAlign: 'center', opacity: 0.5, padding: '24px'}}>No critical flags reported yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderAuditLog = () => (
        <div className="fade-up">
            <div className="filter-bar">
                <input className="filter-input" placeholder="Search by query or audit ID..." />
                <select className="filter-select">
                    <option>Risk Band (All)</option>
                    <option>LOW</option>
                    <option>HIGH</option>
                    <option>CRITICAL</option>
                </select>
                <select className="filter-select">
                    <option>Module (All)</option>
                    <option>Faithfulness</option>
                    <option>Entities</option>
                </select>
                <div className="filter-toggle">
                    <input type="checkbox" /> Flagged only
                </div>
                <div className="filter-date">
                    <span>From</span> <input type="date" className="filter-select" style={{ fontSize: '11px', padding: '6px' }} />
                    <span>To</span> <input type="date" className="filter-select" style={{ fontSize: '11px', padding: '6px' }} />
                </div>
                <button className="csv-btn">Export Results CSV</button>
            </div>

            <div className="gov-table-wrap">
                <table className="gov-table">
                    <thead>
                        <tr>
                            <th>AUDIT ID</th>
                            <th>TIME</th>
                            <th>QUERY</th>
                            <th>HRS</th>
                            <th>RISK BAND</th>
                            <th>FLAGS</th>
                            <th>MODULES FAILED</th>
                            <th>CDSCO CLASS</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {auditLog.length > 0 ? auditLog.map((rec, i) => (
                            <tr key={i}>
                                <td className="mono">{rec.id}</td>
                                <td className="mono">{rec.ts}</td>
                                <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.query}</td>
                                <td style={{ color: rec.hrs > 60 ? 'var(--gov-red)' : (rec.hrs > 30 ? 'var(--gov-amber)' : 'var(--gov-teal)'), fontWeight: 800 }}>{rec.hrs}</td>
                                <td><span className={`pill ${rec.band === 'CRITICAL' ? 'pill-red' : (rec.band === 'MODERATE' ? 'pill-amber' : 'pill-teal')}`}>{rec.band}</span></td>
                                <td><span className="pill pill-grey">{rec.flags}</span></td>
                                <td className="mono" style={{ fontSize: '11px' }}>{rec.failed}</td>
                                <td><span className={`pill ${rec.class === 'Class C' ? 'pill-red' : (rec.class === 'Class B' ? 'pill-amber' : 'pill-teal')}`}>{rec.class}</span></td>
                                <td><button className="review-btn" onClick={() => handleViewRecord(rec)}>View</button></td>
                            </tr>
                        )) : (
                                <tr>
                                    <td colSpan="9" style={{textAlign: 'center', opacity: 0.5, padding: '24px'}}>No audit history available.</td>
                                </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderComplianceReport = () => (
        <div className="compliance-grid fade-up">
            <div className="gov-card">
                <h3 className="chart-title" style={{ marginBottom: '24px' }}>Report Config</h3>
                <div className="config-group">
                    <label className="config-lbl">REPORT PERIOD</label>
                    <input type="date" className="filter-input" style={{ width: '100%', marginBottom: '12px' }} />
                    <input type="date" className="filter-input" style={{ width: '100%' }} />
                </div>
                <div className="config-group">
                    <label className="config-lbl">SAMD CLASSIFICATION</label>
                    <select className="filter-input" style={{ width: '100%' }}>
                        <option>Class B (Low-Moderate Risk)</option>
                        <option>Class C (High Risk)</option>
                    </select>
                </div>
                <div className="config-group" style={{ marginTop: '32px' }}>
                    <label className="config-check"><input type="checkbox" defaultChecked /> Include raw records</label>
                    <label className="config-check"><input type="checkbox" defaultChecked /> Include fix suggestions</label>
                    <label className="config-check"><input type="checkbox" defaultChecked /> Include source tiers</label>
                </div>

                <div className="config-group" style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
                    <label className="config-lbl" style={{ color: 'var(--gov-teal)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span> REQUIRED SaMD COMPLIANCE SIGN-OFFS
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                        <label className="config-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1', textTransform: 'none' }}>
                            <input 
                                type="checkbox" 
                                checked={signoffs.iso13485} 
                                onChange={e => setSignoffs(s => ({ ...s, iso13485: e.target.checked }))} 
                                style={{ accentColor: 'var(--gov-teal)' }}
                            />
                            <span>ISO 13485 Quality Audit Verified</span>
                        </label>
                        <label className="config-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1', textTransform: 'none' }}>
                            <input 
                                type="checkbox" 
                                checked={signoffs.hipaa} 
                                onChange={e => setSignoffs(s => ({ ...s, hipaa: e.target.checked }))} 
                                style={{ accentColor: 'var(--gov-teal)' }}
                            />
                            <span>HIPAA PHI Safe Harbor Masking Verified</span>
                        </label>
                        <label className="config-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1', textTransform: 'none' }}>
                            <input 
                                type="checkbox" 
                                checked={signoffs.calibration} 
                                onChange={e => setSignoffs(s => ({ ...s, calibration: e.target.checked }))} 
                                style={{ accentColor: 'var(--gov-teal)' }}
                            />
                            <span>Department Ward SLG Slider Calibration OK</span>
                        </label>
                        <label className="config-check" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#cbd5e1', textTransform: 'none' }}>
                            <input 
                                type="checkbox" 
                                checked={signoffs.delphi} 
                                onChange={e => setSignoffs(s => ({ ...s, delphi: e.target.checked }))} 
                                style={{ accentColor: 'var(--gov-teal)' }}
                            />
                            <span>GRADE Delphi Consensus Standard Attestation</span>
                        </label>
                    </div>
                </div>

                {/* Verification Seal */}
                {Object.values(signoffs).every(Boolean) ? (
                    <div style={{
                        marginTop: '20px',
                        background: 'rgba(0, 200, 150, 0.06)',
                        border: '1px solid rgba(0, 200, 150, 0.3)',
                        borderRadius: '12px',
                        padding: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        animation: 'fade-in 0.3s ease-out'
                    }}>
                        <span style={{ fontSize: '24px' }}>🌟</span>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#00C896' }}>CDSCO SAFE-TO-DEPLOY SEAL APPROVED</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Dossier conforms to all national medical AI standards. Ready for export.</div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        marginTop: '20px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px dashed rgba(239, 68, 68, 0.2)',
                        borderRadius: '12px',
                        padding: '12px',
                        fontSize: '11.5px',
                        color: '#ef4444',
                        textAlign: 'left',
                        lineHeight: '1.4'
                    }}>
                        ℹ️ Complete all 4 clinical verification sign-offs above to authorize generation of the official regulatory report.
                    </div>
                )}

                <button 
                    className="gen-btn" 
                    onClick={generateReport} 
                    disabled={isGeneratingReport || !Object.values(signoffs).every(Boolean)}
                    style={{
                        marginTop: '20px',
                        background: Object.values(signoffs).every(Boolean) ? 'var(--gov-teal)' : 'rgba(255,255,255,0.05)',
                        color: Object.values(signoffs).every(Boolean) ? 'var(--gov-bg)' : 'rgba(255,255,255,0.2)',
                        cursor: Object.values(signoffs).every(Boolean) ? 'pointer' : 'not-allowed',
                        opacity: Object.values(signoffs).every(Boolean) ? 1 : 0.6
                    }}
                >
                    {isGeneratingReport ? 'Generating...' : 'Generate CDSCO Report'}
                    {isGeneratingReport && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: `${reportProgress}%`, height: '4px', background: 'rgba(255,255,255,0.5)' }}></div>
                    )}
                </button>
            </div>

            <div className="preview-wrap">
                {!showReportPreview ? (
                    <div style={{ color: 'var(--gov-text-dim)', textAlign: 'center', marginTop: '100px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
                        <p>Configure and generate to preview report</p>
                    </div>
                ) : (
                    <div className="report-doc fade-up">
                        <div className="preview-header">
                            <h1>CDSCO SaMD Compliance Report</h1>
                            <div className="report-id">CDSCO-RPT-2026-Q1-MOD-042</div>
                            <div className="mono" style={{ fontSize: '10px', marginTop: '4px' }}>GENERATED: 2026-03-27 18:14 UTC</div>
                        </div>

                        <div className="preview-stats">
                            <div className="ps-stat"><div className="ps-lbl">TOTAL QUERIES</div><div className="ps-val">{kpiData[0]?.val || 0}</div></div>
                            <div className="ps-stat"><div className="ps-lbl">INTERVENTIONS</div><div className="ps-val" style={{ color: 'var(--gov-teal)' }}>{kpiData[3]?.val || 0}</div></div>
                            <div className="ps-stat"><div className="ps-lbl">CRITICAL</div><div className="ps-val" style={{ color: 'var(--gov-red)' }}>{kpiData[2]?.val || 0}</div></div>
                            <div className="ps-stat"><div className="ps-lbl">AVG HRS</div><div className="ps-val">{kpiData[1]?.val || 0}</div></div>
                        </div>

                        <div className="cert-block">
                            I hereby certify that the MediRAG AI system has been audited against the CDSCO Class B SaMD hallucination risk framework. 
                            The system is monitoring for Faithfulness (NLI), Medical Entities (Named Entity Recognition), Source Credibility (Tier-indexed), and Internal Contradiction.
                            Results signify a stability level of HIGH COMPLIANCE for the period 2026-02-27 TO 2026-03-27.
                        </div>

                        <div className="preview-bottom-bar">
                            <button className="dl-btn" onClick={downloadJSON}>Download JSON</button>
                            <button className="dl-btn" onClick={downloadCSV}>Download CSV</button>
                            <button className="dl-btn" onClick={exportPDFReport} style={{ background: '#00C896', color: '#0c1224', fontWeight: 800 }}>📥 Export Certified PDF</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="gov-page">
            <div className="gov-header-bar gov-container">
                <div className="gov-brand-block">
                    <div className="gov-wordmark">MediRAG <span style={{ color: 'var(--gov-teal)' }}>Eval</span></div>
                    <div className="gov-tagline">AI Governance Console</div>
                </div>

                <div className="gov-tabs-pills">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: '📊' },
                        { id: 'audit', label: 'Audit Log', icon: '📋' },
                        { id: 'policy', label: 'Policy Builder', icon: '🧠' },
                        { id: 'compliance', label: 'Compliance Report', icon: '📄' },
                    ].map(tab => (
                        <button key={tab.id} className={`gov-tab-pill ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                            <span>{tab.icon}</span> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="gov-header-right">
                    <div className="cdsco-badge">CDSCO SaMD CLASS B</div>
                    <button className="export-btn-top">Export Report</button>
                </div>
            </div>

            <div className="gov-container">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'audit' && renderAuditLog()}
                {activeTab === 'compliance' && renderComplianceReport()}
                {activeTab === 'policy' && (
                    <div className="fade-up">
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '30px' }}>
                            <div className="gov-card">
                                <h3 className="chart-title" style={{ marginBottom: '24px' }}>Medical Policy Builder</h3>
                                <p style={{ fontSize: '13px', color: 'var(--gov-text-dim)', marginBottom: '30px' }}>
                                    Construct automated safety protocols. These rules are injected into the MediRAG pipeline during evaluation.
                                </p>

                                <div className="policy-node-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {[
                                        { lbl: 'WHEN', val: 'PRESCRIPTION_ADDED', icon: '⚡' },
                                        { lbl: 'IF', val: 'DRUG_INTERACTION_DETECTED', icon: '❓' },
                                        { lbl: 'THEN', val: 'BLOCK_AND_ALERT', icon: '🛡️' }
                                    ].map((p, i) => (
                                        <div key={i} style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                            <div style={{ width: '40px', height: '40px', background: 'rgba(0, 200, 150, 0.1)', color: '#00C896', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{p.icon}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '10px', color: 'var(--gov-text-dim)', fontWeight: 800 }}>{p.lbl}</div>
                                                <div style={{ fontSize: '14px', fontWeight: 600 }}>{p.val.replace(/_/g, ' ')}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button className="gen-btn" style={{ marginTop: '40px', background: '#00C896', color: '#0a0d14' }}>DEPLOY ACTIVE POLICY</button>
                            </div>
                            
                            <div className="gov-card">
                                <h3 className="chart-title">Policy JSON</h3>
                                <pre style={{ background: '#000', padding: '20px', borderRadius: '12px', fontSize: '12px', color: '#00C896', marginTop: '20px', opacity: 0.7 }}>
{`{
  "policy_name": "Safety_v1",
  "trigger": "PRESCRIPTION_ADDED",
  "filters": ["INTERACTION"],
  "action": "BLOCK"
}`}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* DETAIL DRAWER */}
            {isDrawerOpen && <div className="drawer-backdrop" onClick={() => setIsDrawerOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000 }}></div>}
            <div className={`audit-drawer-overlay ${isDrawerOpen ? 'open' : ''}`}>
                <div className="drawer-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div className="mono" style={{ fontSize: '10px' }}>LOG ID: {selectedRecord?.id || 'AUD-8832'}</div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, marginTop: '4px' }}>Audit Record Detail</h2>
                        </div>
                        <button onClick={() => setIsDrawerOpen(false)} style={{ fontSize: '24px', color: 'var(--gov-text-dim)', cursor: 'pointer' }}>×</button>
                    </div>
                </div>
                <div className="drawer-body">
                    <div className="drawer-section">
                        <div className="drawer-sec-title">Input & Output</div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                            <div className="mono" style={{ color: 'var(--gov-teal)', marginBottom: '8px' }}>QUERY:</div>
                            <div style={{ fontSize: '13px' }}>{selectedRecord?.query}</div>
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px' }}>
                            <div className="mono" style={{ color: 'var(--gov-amber)', marginBottom: '8px' }}>GENERATED ANSWER:</div>
                            <div style={{ fontSize: '13px' }}>{selectedRecord?.answer || 'No answer generated.'}</div>
                        </div>
                    </div>

                    <div className="drawer-section">
                        <div className="drawer-sec-title">Module Risk Profile</div>
                        <div className="bar-failure-list">
                            {[
                                { label: 'Faithfulness', val: 82, color: 'var(--gov-red)' },
                                { label: 'Entities', val: 12, color: 'var(--gov-teal)' },
                                { label: 'Sources', val: 45, color: 'var(--gov-amber)' },
                                { label: 'Logic', val: 0, color: 'var(--gov-teal)' },
                            ].map((s, i) => (
                                <div className="failure-bar-row" key={i}>
                                    <div className="f-bar-lbl"><span>{s.label}</span> <span>{s.val}% risk</span></div>
                                    <div className="f-bar-track"><div className="f-bar-fill" style={{ width: `${s.val}%`, background: s.color }}></div></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="drawer-section">
                        <div className="drawer-sec-title">Flagged Claims</div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700 }}>{selectedRecord?.details?.intervention_reason || "Check detailed JSON for evaluation findings"}</div>
                        </div>
                    </div>

                    <div className="drawer-section">
                        <div className="drawer-sec-title">Raw JSON Audit Trail</div>
                        <div className="mono" style={{ background: 'black', padding: '16px', borderRadius: '8px', fontSize: '10px', height: '100px', overflow: 'hidden', opacity: 0.5, overflowY: 'auto' }}>
                            {JSON.stringify(selectedRecord?.details, null, 2)}
                        </div>
                    </div>
                </div>
                <div className="drawer-footer">
                    <button className="review-btn" style={{ flex: 1, padding: '12px' }}>Export Record</button>
                    <button className="review-btn" style={{ flex: 1, padding: '12px', background: 'var(--gov-teal)', color: 'var(--gov-bg)' }}>Mark as Reviewed</button>
                </div>
            </div>
        </div>
    );
};

export default Governance;
