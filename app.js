let db;
let deferredPrompt;

// Initialize the database
async function initApp() {
    db = new DB();
    await db.init();
    loadHistory();
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('./sw.js', {
                scope: '/Altitude-Sickness/'
            });
            console.log('ServiceWorker registration successful:', registration.scope);
        } catch (err) {
            console.error('ServiceWorker registration failed:', err);
        }
    });
}

// Install prompt handler
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installPrompt').classList.remove('hidden');
});

document.getElementById('installButton').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            document.getElementById('installPrompt').classList.add('hidden');
        }
        deferredPrompt = null;
    }
});

// Form submission handler
document.getElementById('altitudeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const altitude = parseInt(document.getElementById('altitude').value);
    const symptoms = {
        headache: document.getElementById('headache').checked,
        nausea: document.getElementById('nausea').checked,
        dizziness: document.getElementById('dizziness').checked,
        fatigue: document.getElementById('fatigue').checked
    };

    const result = calculateRisk(altitude, symptoms);
    showResult(result);
    
    // Save check to database
    await db.saveCheck({
        altitude,
        symptoms,
        result,
    });
    
    loadHistory();
});

function calculateRisk(altitude, symptoms) {
    const symptomCount = Object.values(symptoms).filter(Boolean).length;
    let risk = 'Low';
    let advice = '';

    if (altitude < 2500) {
        risk = 'Low';
        advice = 'You are at a safe altitude. Continue monitoring for symptoms.';
    } else if (altitude < 3500) {
        if (symptomCount >= 2) {
            risk = 'Moderate';
            advice = 'Multiple symptoms at this altitude suggest early AMS. Consider descending.';
        } else {
            risk = 'Low-Moderate';
            advice = 'Watch for developing symptoms. Acclimatize properly.';
        }
    } else if (altitude < 5500) {
        if (symptomCount >= 2) {
            risk = 'High';
            advice = 'DANGER: Multiple symptoms at this altitude indicate AMS. Begin descent.';
        } else {
            risk = 'Moderate';
            advice = 'High altitude. Rest and acclimatize. Descend if symptoms develop.';
        }
    } else {
        risk = 'Extreme';
        advice = 'EXTREME ALTITUDE: Immediate medical attention if any symptoms appear.';
    }

    return { risk, advice };
}

function showResult(result) {
    const resultCard = document.getElementById('result');
    resultCard.innerHTML = `
        <h3>Risk Level: ${result.risk}</h3>
        <p>${result.advice}</p>
    `;
    resultCard.className = `card result-card ${getRiskClass(result.risk)}`;
    resultCard.classList.remove('hidden');
}

function getRiskClass(risk) {
    switch (risk.toLowerCase()) {
        case 'high':
        case 'extreme':
            return 'danger';
        case 'moderate':
            return 'warning';
        default:
            return 'success';
    }
}

async function loadHistory() {
    const checks = await db.getChecks();
    const historyDiv = document.getElementById('history');
    
    historyDiv.innerHTML = checks.reverse().slice(0, 10).map(check => `
        <div class="history-item">
            <strong>${new Date(check.timestamp).toLocaleString()}</strong><br>
            Altitude: ${check.altitude}m<br>
            Risk: ${check.result.risk}
        </div>
    `).join('');
}

// Initialize app
initApp();