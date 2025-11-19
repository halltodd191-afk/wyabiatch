// Load configuration on page load
document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    startStatusPolling();
});

// Configuration management
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        document.getElementById('account_sid').value = config.account_sid || '';
        document.getElementById('auth_token').value = config.auth_token || '';
        document.getElementById('twilio_number').value = config.twilio_number || '';
    } catch (error) {
        console.error('Error loading config:', error);
        showNotification('Error loading configuration', 'error');
    }
}

async function saveConfig() {
    const config = {
        account_sid: document.getElementById('account_sid').value.trim(),
        auth_token: document.getElementById('auth_token').value.trim(),
        twilio_number: document.getElementById('twilio_number').value.trim()
    };

    if (!config.account_sid || !config.auth_token || !config.twilio_number) {
        showNotification('Please fill in all configuration fields', 'error');
        return;
    }

    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(config)
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Configuration saved successfully', 'success');
        } else {
            showNotification('Error saving configuration', 'error');
        }
    } catch (error) {
        console.error('Error saving config:', error);
        showNotification('Error saving configuration', 'error');
    }
}

// Call control
async function startCalls() {
    const config = {
        account_sid: document.getElementById('account_sid').value.trim(),
        auth_token: document.getElementById('auth_token').value.trim(),
        twilio_number: document.getElementById('twilio_number').value.trim()
    };

    if (!config.account_sid || !config.auth_token || !config.twilio_number) {
        showNotification('Please configure Twilio credentials first', 'error');
        return;
    }

    const phoneNumbers = document.getElementById('phone_numbers').value
        .split('\n')
        .map(n => n.trim())
        .filter(n => n);

    if (phoneNumbers.length === 0) {
        showNotification('Please enter at least one phone number', 'error');
        return;
    }

    const keystrokes = document.getElementById('keystrokes').value.trim();
    if (!keystrokes) {
        showNotification('Please enter keystrokes to press', 'error');
        return;
    }

    try {
        const response = await fetch('/api/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                config: config,
                numbers: phoneNumbers,
                keystrokes: keystrokes
            })
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Calls started successfully', 'success');
            document.getElementById('startBtn').disabled = true;
            document.getElementById('stopBtn').disabled = false;
        } else {
            showNotification(result.error || 'Error starting calls', 'error');
        }
    } catch (error) {
        console.error('Error starting calls:', error);
        showNotification('Error starting calls', 'error');
    }
}

async function stopCalls() {
    try {
        const response = await fetch('/api/stop', {
            method: 'POST'
        });

        const result = await response.json();
        if (result.success) {
            showNotification('Stopping calls...', 'info');
        }
    } catch (error) {
        console.error('Error stopping calls:', error);
        showNotification('Error stopping calls', 'error');
    }
}

// Status polling
let statusInterval = null;

function startStatusPolling() {
    if (statusInterval) {
        clearInterval(statusInterval);
    }
    
    statusInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            updateStatusDisplay(status);
            updateResultsDisplay(status.calls || []);
        } catch (error) {
            console.error('Error fetching status:', error);
        }
    }, 2000); // Poll every 2 seconds
}

function updateStatusDisplay(status) {
    const statusText = document.getElementById('statusText');
    const progressText = document.getElementById('progressText');
    const currentNumber = document.getElementById('currentNumber');
    const progressBar = document.getElementById('progressBar');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (status.running) {
        statusText.textContent = 'Running';
        statusText.className = 'status-value status-running';
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        statusText.textContent = 'Ready';
        statusText.className = 'status-value status-ready';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }

    if (status.error) {
        statusText.textContent = 'Error: ' + status.error;
        statusText.className = 'status-value status-error';
    }

    const total = status.total || 0;
    const progress = status.progress || 0;
    progressText.textContent = `${progress} / ${total}`;
    
    const percentage = total > 0 ? (progress / total) * 100 : 0;
    progressBar.style.width = percentage + '%';
    progressBar.textContent = total > 0 ? `${Math.round(percentage)}%` : '';

    currentNumber.textContent = status.current_number || '-';
}

function updateResultsDisplay(calls) {
    const resultsList = document.getElementById('resultsList');
    
    if (calls.length === 0) {
        resultsList.innerHTML = '<div class="empty-state">No calls yet. Start calling to see results here.</div>';
        return;
    }

    resultsList.innerHTML = calls.map(call => {
        const statusClass = call.status === 'failed' || call.status === 'completed' 
            ? (call.status === 'failed' ? 'failed' : 'success')
            : 'in-progress';
        
        const statusBadge = call.status === 'failed' 
            ? `<span class="call-status failed">Failed</span>`
            : call.final_status 
                ? `<span class="call-status completed">${call.final_status}</span>`
                : `<span class="call-status in-progress">${call.status || 'Processing'}</span>`;

        const recordingLink = call.recording_url 
            ? `<div class="call-details"><strong>Recording:</strong> <a href="${call.recording_url}" target="_blank">${call.recording_url}</a></div>`
            : '';

        const errorInfo = call.error 
            ? `<div class="call-details"><strong>Error:</strong> ${call.error}</div>`
            : '';

        const sidInfo = call.sid 
            ? `<div class="call-details"><strong>SID:</strong> ${call.sid}</div>`
            : '';

        return `
            <div class="call-item ${statusClass}">
                <div class="call-item-header">
                    <span class="call-number">${call.number}</span>
                    ${statusBadge}
                </div>
                ${sidInfo}
                ${recordingLink}
                ${errorInfo}
                <div class="call-details"><strong>Time:</strong> ${new Date(call.timestamp).toLocaleString()}</div>
            </div>
        `;
    }).join('');
}

// Logs management
async function loadLogs() {
    try {
        const response = await fetch('/api/logs');
        const data = await response.json();
        const logsContent = document.getElementById('logsContent');
        
        if (data.logs) {
            logsContent.textContent = data.logs;
        } else {
            logsContent.innerHTML = '<div class="empty-state">No logs found.</div>';
        }
    } catch (error) {
        console.error('Error loading logs:', error);
        showNotification('Error loading logs', 'error');
    }
}

function refreshResults() {
    // Trigger status update
    fetch('/api/status')
        .then(response => response.json())
        .then(status => {
            updateResultsDisplay(status.calls || []);
            showNotification('Results refreshed', 'success');
        })
        .catch(error => {
            console.error('Error refreshing results:', error);
            showNotification('Error refreshing results', 'error');
        });
}

function clearResults() {
    if (confirm('Are you sure you want to clear the results display?')) {
        document.getElementById('resultsList').innerHTML = '<div class="empty-state">No calls yet. Start calling to see results here.</div>';
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);


