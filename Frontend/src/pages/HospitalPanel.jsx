import React, { useState } from 'react';
import './HospitalPanel.css';

const HospitalPanel = ({ engineConfig, setEngineConfig }) => {
    const [departments, setDepartments] = useState(() => {
        const saved = localStorage.getItem('medirag_hospital_departments');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse saved hospital departments:", e);
            }
        }
        return [
            { id: 'oncology', name: 'Oncology & Cancer Care', active: true, hrsLimit: 25, latencyLimit: 8000, queries: 412, provider: 'GPT-4o (Azure Secure)' },
            { id: 'cardiology', name: 'Cardiology Center', active: true, hrsLimit: 30, latencyLimit: 5000, queries: 289, provider: 'Mistral Large' },
            { id: 'pediatrics', name: 'Pediatrics Department', active: true, hrsLimit: 20, latencyLimit: 6000, queries: 145, provider: 'Gemini 1.5 Pro' },
            { id: 'emergency', name: 'Emergency Room (ER)', active: false, hrsLimit: 50, latencyLimit: 2000, queries: 0, provider: 'Llama-3 (Local Server)' },
            { id: 'opd', name: 'General OPD & Telehealth', active: true, hrsLimit: 60, latencyLimit: 4000, queries: 1024, provider: 'Claude 3.5 Sonnet' }
        ];
    });

    const [localServerUrl, setLocalServerUrl] = useState('http://192.168.1.100:11434');
    const [integrationLang, setIntegrationLang] = useState('python');
    const [isSaved, setIsSaved] = useState(false);

    const handleThresholdChange = (id, field, val) => {
        setDepartments(prev => prev.map(dept => {
            if (dept.id === id) {
                return { ...dept, [field]: Number(val) };
            }
            return dept;
        }));
    };

    const handleToggleDept = (id) => {
        setDepartments(prev => prev.map(dept => {
            if (dept.id === id) {
                return { ...dept, active: !dept.active };
            }
            return dept;
        }));
    };

    const handleSaveConfig = () => {
        localStorage.setItem('medirag_hospital_departments', JSON.stringify(departments));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    const codeSnippets = {
        python: `import requests

# MediRAG Clinical Hospital API Client
MEDIRAG_ENDPOINT = "${engineConfig?.apiUrl || 'http://localhost:8000'}/query"
headers = {"Content-Type": "application/json"}

payload = {
    "question": "Is Metformin contraindicated in patients with severe renal impairment?",
    "top_k": 5,
    "llm_provider": "azure",
    "llm_model": "gpt-4o-secure",
    "department": "oncology" # Triggers active 25% HRS safety limit
}

response = requests.post(MEDIRAG_ENDPOINT, json=payload, headers=headers)
data = response.json()

# Inspect verified clinical metrics
print(f"Safety Status: {data['risk_band']}")
print(f"Hallucination Risk: {data['hrs_score']}%")
print(f"Intervention Triggered: {data['intervention_applied']}")`,
        javascript: `// MediRAG EHR Clinical Integration Client
const fetch = require('node-fetch');

const queryClinicalAI = async () => {
    const response = await fetch('${engineConfig?.apiUrl || 'http://localhost:8000'}/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            question: "Audit check: check dosage and DDI for Aspirin 75mg daily with Warfarin.",
            top_k: 5,
            llm_provider: "mistral",
            department: "cardiology" // Triggers active 30% HRS safety limit
        })
    });
    
    const result = await response.json();
    console.log(\`Verified Output: \${result.generated_answer}\`);
    console.log(\`Reliability Index: \${result.global_reliability}%\`);
};`,
        curl: `curl -X POST "${engineConfig?.apiUrl || 'http://localhost:8000'}/query" \\
     -H "Content-Type: application/json" \\
     -d '{
       "question": "Assess compatibility of Nivolumab with radiotherapy.",
       "top_k": 5,
       "llm_provider": "gemini",
       "department": "oncology"
     }'`
    };

    return (
        <div className="hospital-panel fade-up">
            
            {/* TOP ROW: LOCAL ENDPOINT CONFIG */}
            <div className="hospital-card local-endpoint-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>🏢</span>
                        <h3 className="h-card-title">Hospital Local Server Configurations</h3>
                    </div>
                    <span className="con-mode-badge clinical" style={{ background: 'rgba(0, 200, 150, 0.1)', color: '#00C896' }}>HIPAA SECURE NODE</span>
                </div>
                
                <p className="h-desc" style={{ marginBottom: '24px' }}>
                    For strict data compliance, hospitals can route MediRAG queries through locally hosted LLMs (e.g. Ollama or vLLM deployed on local secure servers) rather than sending patient data to public cloud platforms.
                </p>

                <div className="h-grid-inputs">
                    <div className="h-field">
                        <label className="h-label">LOCAL SERVER URL (OLLAMA / LLAMA.CPP)</label>
                        <input 
                            type="text" 
                            className="h-input" 
                            value={localServerUrl}
                            onChange={(e) => setLocalServerUrl(e.target.value)}
                            placeholder="http://localhost:11434"
                        />
                    </div>
                    <div className="h-field">
                        <label className="h-label">DEFAULT LOCAL PROVIDER</label>
                        <select className="h-input">
                            <option>Ollama (Llama-3-Clinical)</option>
                            <option>Ollama (MedLLaMA)</option>
                            <option>vLLM (BioGPT)</option>
                            <option>Azure Private Endpoint (Private Secure)</option>
                        </select>
                    </div>
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="h-save-btn" onClick={handleSaveConfig}>
                        {isSaved ? '✓ Hospital Settings Saved' : 'Save Endpoint Configuration'}
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT: DEPARTMENTS AND INTEGRATION */}
            <div className="h-main-grid">
                
                {/* DEPARTMENTS CARD */}
                <div className="hospital-card">
                    <h3 className="h-card-title" style={{ marginBottom: '20px' }}>Departmental Safety Policies</h3>
                    <p className="h-desc" style={{ marginBottom: '28px' }}>
                        Set active guardrail parameters and allowed hallucination levels based on the criticality of each department.
                    </p>

                    <div className="h-dept-list">
                        {departments.map(dept => (
                            <div className={`h-dept-item ${dept.active ? 'active' : 'inactive'}`} key={dept.id}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button 
                                            onClick={() => handleToggleDept(dept.id)}
                                            style={{
                                                background: dept.active ? '#00C896' : '#2D3748',
                                                border: 'none',
                                                width: '12px',
                                                height: '12px',
                                                borderRadius: '50%',
                                                cursor: 'pointer',
                                                boxShadow: dept.active ? '0 0 10px #00C896' : 'none'
                                            }}
                                        ></button>
                                        <span className="h-dept-name" style={{ color: dept.active ? '#fff' : 'rgba(255,255,255,0.4)', fontWeight: dept.active ? 800 : 500 }}>{dept.name}</span>
                                    </div>
                                    <span className="h-dept-badge" style={{ background: dept.active ? 'rgba(0,200,150,0.1)' : 'rgba(255,255,255,0.05)', color: dept.active ? '#00C896' : 'rgba(255,255,255,0.4)' }}>
                                        {dept.queries} audits run
                                    </span>
                                </div>

                                {dept.active && (
                                    <div className="h-dept-sliders fade-up">
                                        <div className="h-slider-group">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                                                <span>HRS Risk Tolerance</span>
                                                <span style={{ color: '#00C896', fontWeight: 'bold' }}>&lt; {dept.hrsLimit}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="10" 
                                                max="80" 
                                                className="h-slider" 
                                                value={dept.hrsLimit}
                                                onChange={(e) => handleThresholdChange(dept.id, 'hrsLimit', e.target.value)}
                                            />
                                        </div>

                                        <div className="h-slider-group" style={{ marginTop: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                                                <span>Max Allowed Latency</span>
                                                <span style={{ color: '#00C896', fontWeight: 'bold' }}>{(dept.latencyLimit/1000).toFixed(1)}s</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min="1000" 
                                                max="10000" 
                                                step="500" 
                                                className="h-slider" 
                                                value={dept.latencyLimit}
                                                onChange={(e) => handleThresholdChange(dept.id, 'latencyLimit', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* EHR INTEGRATION CARD */}
                <div className="hospital-card" style={{ display: 'flex', flexDirection: 'column' }}>
                    <h3 className="h-card-title" style={{ marginBottom: '16px' }}>Epic & Cerner EHR Client Integrations</h3>
                    <p className="h-desc" style={{ marginBottom: '24px' }}>
                        Integrate MediRAG directly into hospital information dashboards and patient charts using lightweight API calls.
                    </p>

                    <div className="h-code-header">
                        {['python', 'javascript', 'curl'].map(lang => (
                            <button 
                                key={lang} 
                                className={`h-code-tab ${integrationLang === lang ? 'active' : ''}`}
                                onClick={() => setIntegrationLang(lang)}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    
                    <div className="h-code-body" style={{ flex: 1 }}>
                        <pre style={{
                            margin: 0,
                            padding: '20px',
                            background: '#040812',
                            borderRadius: '0 0 16px 16px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            fontSize: '11.5px',
                            color: '#94a3b8',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            textAlign: 'left',
                            lineHeight: '1.6'
                        }}>
                            <code>{codeSnippets[integrationLang]}</code>
                        </pre>
                    </div>

                    <div className="h-integration-footer" style={{
                        marginTop: '20px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ fontSize: '20px' }}>📦</span>
                        <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#fff' }}>Ayushman Bharat ABDM Sandbox</div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Pre-configured integration ready for Indian National Health Stack registry.</div>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default HospitalPanel;
