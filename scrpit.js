// ======================
// DOM Elements
// ======================
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');
const themeToggle = document.getElementById('themeToggle');
const simulateForm = document.getElementById('simulate-form');
const resultBox = document.getElementById('resultBox');
const plantTypeInput = document.getElementById('plantType');
const plantVarietyInput = document.getElementById('plantVariety');
const plantVarietyContainer = plantVarietyInput ? plantVarietyInput.parentElement : null;
const diseaseForm = document.getElementById('disease-form');
const plantImageInput = document.getElementById('plantImage');
const diseaseResultBox = document.getElementById('diseaseResultBox');
const plantTypeDiseaseInput = document.getElementById('plantTypeDisease');
const symptomsInput = document.getElementById('symptoms');
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotContainer = document.getElementById('chatbotContainer');
const chatbotClose = document.getElementById('chatbotClose');
const chatbotMessages = document.getElementById('chatbotMessages');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSend = document.getElementById('chatbotSend');
const cityInput = document.getElementById('city');
const countryInput = document.getElementById('country');
const temperatureInput = document.getElementById('temperature');
const humidityInput = document.getElementById('humidity');
const startSimulationBtn = document.querySelector('.hero-buttons .btn[data-section="simulate"]');
const detectDiseaseBtn = document.querySelector('.hero-buttons .btn[data-section="disease"]');

// ======================
// Constants
// ======================
const TEXT_API_KEY = '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';
const IMAGE_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SIMULATION_COOLDOWN = 10000; // 10 seconds
const DISEASE_COOLDOWN = 15000; // 15 seconds
const CHATBOT_COOLDOWN = 2000; // 2 seconds
const WEATHER_COOLDOWN = 5000; // 5 seconds
let lastSimulationTime = 0;
let lastDiseaseAnalysisTime = 0;
let lastChatbotTime = 0;
let lastWeatherTime = 0;

// ======================
// Core Functions
// ======================

function setActiveSection(sectionId) {
    if (!sectionId) {
        console.error('No sectionId provided');
        return;
    }

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionId) {
            link.classList.add('active');
        }
    });

    sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === `${sectionId}-section`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    console.log(`Section activated: ${sectionId}`);
    window.scrollTo({ top: 0, behavior: 'auto' });
}

function toggleTheme() {
    if (!themeToggle) {
        console.error('Theme toggle element not found');
        return;
    }
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    const icon = themeToggle.querySelector('i');
    if (icon) {
        icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    }
}

function formatSimulationResult(rawText, timelineData) {
    // Parse timeline data for chart
    const stages = timelineData.stages || ['Seedling', 'Vegetative', 'Flowering', 'Mature'];
    const durations = timelineData.durations || [2, 4, 3, 2];
    const milestones = timelineData.milestones || stages.map(s => `Reach ${s} stage`);

    // Format text results
    const formattedText = rawText
        .replace(/## (.*?)\n/g, '<h4 class="result-section"><i class="fas fa-$1-icon"></i>$1</h4>')
        .replace(/Overview-icon/g, 'seedling')
        .replace(/Growth Timeline-icon/g, 'chart-line')
        .replace(/Care Recommendations-icon/g, 'hand-holding-water')
        .replace(/Potential Issues-icon/g, 'exclamation-triangle')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*?)(\n|$)/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>')
        .replace(/! (.*?)(\n|$)/g, '<div class="warning"><i class="fas fa-exclamation-triangle"></i> $1 <span class="warning-tag">Action Needed</span></div>');

    // Generate chart
    const chartHtml = `
        <div class="growth-chart-container">
            <canvas id="growthTimelineChart"></canvas>
        </div>
    `;
    const chartConfig = {
        type: "bar",
        data: {
            labels: stages,
            datasets: [{
                label: "Duration (Weeks)",
                data: durations,
                backgroundColor: ["#4CAF50", "#66BB6A", "#81C784", "#A5D6A7"],
                borderColor: ["#2E7D32", "#388E3C", "#4CAF50", "#66BB6A"],
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: "y",
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Duration (Weeks)",
                        color: document.body.classList.contains('dark-mode') ? '#E8F5E9' : '#1B5E20'
                    },
                    grid: {
                        color: document.body.classList.contains('dark-mode') ? 'rgba(232, 245, 233, 0.1)' : 'rgba(27, 94, 32, 0.1)'
                    },
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#E8F5E9' : '#1B5E20'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: "Growth Stages",
                        color: document.body.classList.contains('dark-mode') ? '#E8F5E9' : '#1B5E20'
                    },
                    grid: {
                        color: document.body.classList.contains('dark-mode') ? 'rgba(232, 245, 233, 0.1)' : 'rgba(27, 94, 32, 0.1)'
                    },
                    ticks: {
                        color: document.body.classList.contains('dark-mode') ? '#E8F5E9' : '#1B5E20'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Milestone: ${milestones[context.dataIndex]}`;
                        }
                    },
                    backgroundColor: document.body.classList.contains('dark-mode') ? '#1E2B1E' : '#FFFFFF',
                    titleColor: document.body.classList.contains('dark-mode') ? '#E8F5E9' : '#1B5E20',
                    bodyColor: document.body.classList.contains('dark-mode') ? '#E8F5E9' : '#1B5E20'
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    };

    // Render chart after DOM update
    setTimeout(() => {
        const canvas = document.getElementById('growthTimelineChart');
        if (canvas) {
            new Chart(canvas, chartConfig);
        } else {
            console.error('Growth timeline chart canvas not found');
        }
    }, 0);

    return chartHtml + formattedText;
}

function formatDiseaseResult(rawText) {
    let formattedText = rawText
        .replace(/\*\*Plant Identification\*\*: (.*?)(\n|$)/g, '<h4>Plant Identified: $1</h4>')
        .replace(/\*\*Diagnosis\*\*: (.*?) \(Confidence: (.*?)\)/g, '<h4>Diagnosis: $1 <span class="disease-confidence">$2 Confidence</span></h4>')
        .replace(/\*\*Symptoms\*\*:(\n|$)/g, '<h4>Symptoms Observed:</h4><ul>')
        .replace(/\*\*Treatment\*\*:(\n|$)/g, '</ul><h4>Recommended Treatment:</h4><ul>')
        .replace(/\*\*Prevention\*\*:(\n|$)/g, '</ul><h4>Prevention Measures:</h4><ul>')
        .replace(/\*\*Severity\*\*: (.*?)(\n|$)/g, '</ul><h4>Severity: <span class="severity-$1">$1</span></h4>')
        .replace(/\*\*Additional Notes\*\*: (.*?)(\n|$)/g, '<div class="notes"><h4>Additional Notes:</h4><p>$1</p></div>')
        .replace(/^- (.*?)(\n|$)/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>');

    formattedText += '</ul>';
    return `
        <div class="disease-result">
            ${formattedText}
            <div class="result-actions">
                <button class="btn" onclick="window.print()"><i class="fas fa-print"></i> Print Report</button>
            </div>
        </div>
    `;
}

function saveSimulation(data) {
    const history = JSON.parse(localStorage.getItem('simulationHistory') || '[]');
    history.unshift({
        timestamp: new Date().toISOString(),
        ...data
    });
    localStorage.setItem('simulationHistory', JSON.stringify(history.slice(0, 5)));
}

function validateInputs(formData) {
    if (!/^\d+-\d+$/.test(formData.temperature)) {
        return 'Please enter temperature as "min-max" (e.g., 18-24)';
    }
    if (!/^\d+%?$/.test(formData.humidity)) {
        return 'Enter humidity as number (e.g., 60 or 60%)';
    }
    if (!formData.plantType.trim()) {
        return 'Plant type is required';
    }
    if (!formData.city.trim() || !formData.country.trim()) {
        return 'City and country are required';
    }
    return null;
}

function debounce(func, timeout = 500) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

// ======================
// Weather Lookup Function
// ======================

async function fetchWeatherData(city, country) {
    const now = Date.now();
    if (now - lastWeatherTime < WEATHER_COOLDOWN) {
        return { error: `Please wait ${Math.ceil((WEATHER_COOLDOWN - (now - lastWeatherTime)) / 1000)} seconds before another weather lookup` };
    }
    lastWeatherTime = now;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEXT_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'TAPE - Weather Lookup'
            },
            body: JSON.stringify({
                model: "anthropic/claude-3-sonnet",
                messages: [
                    {
                        role: "system",
                        content: `You are a weather data provider for the Technology Assisted Plant Emulator (TAPE). Provide current temperature range (min-max in °C) and humidity (%) for the specified location. Return JSON in the format: {"temperature": "min-max", "humidity": "number%"}. If data is unavailable, return {"temperature": "15-25", "humidity": "60%"}.`
                    },
                    {
                        role: "user",
                        content: `Get weather data for ${city}, ${country}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 100
            }),
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return { temperature: "15-25", humidity: "60%" };
        }

        try {
            const cleanedContent = content.replace(/```json|```/g, '').trim();
            const weatherData = JSON.parse(cleanedContent);
            return {
                temperature: weatherData.temperature || "15-25",
                humidity: weatherData.humidity || "60%"
            };
        } catch (e) {
            console.error('Failed to parse weather data:', e);
            return { temperature: "15-25", humidity: "60%" };
        }
    } catch (error) {
        console.error('Weather fetch error:', error);
        return { temperature: "15-25", humidity: "60%" };
    }
}

// ======================
// Plant Variety Functions
// ======================

async function fetchPlantVarieties(plantName) {
    if (!plantName || plantName.length < 3) {
        return ["Standard"];
    }

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEXT_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'TAPE - Plant Varieties'
            },
            body: JSON.stringify({
                model: "anthropic/claude-3-sonnet",
                messages: [
                    {
                        role: "system",
                        content: `Return a JSON array of 3-5 common varieties for the plant "${plantName}". Example: ["Variety A", "Variety B"]. If no varieties are known, return ["Standard"].`
                    }
                ],
                temperature: 0.3,
                max_tokens: 100
            }),
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (!content) return ["Standard"];

        try {
            const varieties = JSON.parse(content.replace(/```json|```/g, '').trim());
            return Array.isArray(varieties) && varieties.length > 0 ? varieties.slice(0, 5) : ["Standard"];
        } catch (e) {
            console.error('Failed to parse varieties:', e);
            return ["Standard"];
        }
    } catch (error) {
        console.error('Variety fetch error:', error);
        return ["Standard"];
    }
}

function createVarietyDropdown(varieties) {
    if (!plantVarietyContainer) {
        console.error('Plant variety container not found');
        return;
    }

    const existingDropdown = plantVarietyContainer.querySelector('select');
    if (existingDropdown) existingDropdown.remove();

    plantVarietyInput.style.display = 'none';

    const dropdown = document.createElement('select');
    dropdown.id = 'plantVarietyDropdown';
    dropdown.innerHTML = `
        <option value="" selected disabled>Select variety</option>
        ${varieties.map(v => `<option value="${v}">${v}</option>`).join('')}
        <option value="Other">Other (specify)</option>
    `;

    plantVarietyContainer.appendChild(dropdown);

    dropdown.addEventListener('change', (e) => {
        if (e.target.value === 'Other') {
            dropdown.remove();
            plantVarietyInput.style.display = 'block';
            plantVarietyInput.value = '';
            plantVarietyInput.focus();
        }
    });
}

// ======================
// Disease Analysis Functions
// ======================

async function analyzePlantDisease(imageFile, plantType, symptoms) {
    return new Promise((resolve, reject) => {
        if (!imageFile) {
            reject(new Error('No image file provided'));
            return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const base64String = event.target.result;
                const result = await analyzeWithQwenVL(base64String, plantType, symptoms);
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(imageFile);
    });
}

async function analyzeWithQwenVL(imageBase64, plantType, symptoms) {
    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${IMAGE_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'TAPE - Plant Disease Detection'
            },
            body: JSON.stringify({
                model: "qwen/qwen-vl-plus",
                messages: [
                    {
                        role: "system",
                        content: `You are a plant pathologist AI. Analyze the provided plant image and:
1. Identify the plant species if not provided
2. Detect any visible diseases or health issues
3. Provide a clear diagnosis with confidence level (High/Medium/Low)
4. List specific symptoms observed in the image
5. Recommend immediate treatment steps
6. Suggest prevention measures
7. Include severity assessment (Mild/Moderate/Severe)

Format your response as follows:
**Plant Identification**: [plant name if not provided]
**Diagnosis**: [disease/issue name] (Confidence: [High/Medium/Low])
**Symptoms**: 
- [symptom 1]
- [symptom 2]
- [etc.]
**Treatment**:
- [step 1]
- [step 2]
- [etc.]
**Prevention**:
- [measure 1]
- [measure 2]
- [etc.]
**Severity**: [Mild/Moderate/Severe]
**Additional Notes**: [any important notes]`
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Analyze this ${plantType ? plantType + ' plant' : 'plant'} image. ${symptoms ? 'Reported symptoms: ' + symptoms : 'No additional symptoms reported.'}`
                            },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageBase64,
                                    detail: "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${errorData.error?.message || response.status}`);
        }

        const data = await response.json();
        if (!data?.choices?.[0]?.message?.content) {
            throw new Error("Received incomplete data from the API");
        }

        return data.choices[0].message.content;
    } catch (error) {
        throw new Error(`Analysis failed: ${error.message}`);
    }
}

// ======================
// Plant Simulation Function
// ======================

async function runPlantSimulation(formData) {
    if (!resultBox) {
        console.error('Result box element not found');
        return;
    }

    resultBox.innerHTML = `
        <div class="simulation-loading">
            <i class="fas fa-seedling pulse"></i>
            <p>Simulating ${formData.plantType}'s growth patterns...</p>
            <small>Analyzing ${formData.soilType} soil with ${formData.sunlight} light in ${formData.city}, ${formData.country}</small>
        </div>
    `;

    try {
        const prompt = `
You are a plant growth simulation AI for the Technology Assisted Plant Emulator (TAPE). Provide a concise, user-friendly prediction of the plant's growth outcomes under the given conditions. Use markdown with headings (##) and bullet points (-). Focus on practical, actionable insights. Structure the response as follows:

## Overview
- Summarize the plant, variety, and key conditions (location, temperature, humidity).
## Growth Timeline
- List growth stages with durations (in weeks) and key milestones (e.g., height).
- Include a JSON object at the end of this section: {"stages": ["Stage1", "Stage2"], "durations": [weeks1, weeks2], "milestones": ["Milestone1", "Milestone2"]}.
## Care Recommendations
- Provide 3-5 specific care recommendations (e.g., watering adjustments).
## Potential Issues
- Highlight potential issues (start with "!") only if conditions are suboptimal.

**Input Parameters**:
- Plant Type: ${formData.plantType}
- Variety: ${formData.plantVariety || 'Standard'}
- Placement: ${formData.plantPlacement}
- Soil Type: ${formData.soilType}
- Watering Schedule: ${formData.watering}
- Sunlight Exposure: ${formData.sunlight}
- Temperature Range: ${formData.temperature}°C
- Humidity: ${formData.humidity}
- Growth Stage: ${formData.growthStage}
- Location: ${formData.city}, ${formData.country}
- Additional Notes: ${formData.notes}

Keep the response concise (150-250 words), avoid technical jargon, and use specific numbers (e.g., 10 cm, 2 weeks).
        `;

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEXT_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'TAPE - Plant Simulation'
            },
            body: JSON.stringify({
                model: "openai/gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a plant growth simulation AI. Provide concise, user-friendly predictions in markdown with clear headings and lists. Include a JSON timeline object. Use specific numbers and avoid jargon."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid API response: No content received');
        }

        const simulationResult = data.choices[0].message.content;

        // Extract timeline JSON
        let timelineData = { stages: ['Seedling', 'Vegetative', 'Flowering', 'Mature'], durations: [2, 4, 3, 2], milestones: ['Germination', 'Leaf development', 'Bud formation', 'Full growth'] };
        try {
            const jsonMatch = simulationResult.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch) {
                timelineData = JSON.parse(jsonMatch[1]);
            }
        } catch (e) {
            console.error('Failed to parse timeline JSON:', e);
        }

        const formattedResult = formatSimulationResult(simulationResult, timelineData);

        resultBox.innerHTML = `
            <div class="simulation-result">
                <div class="result-header">
                    <h3><i class="fas fa-chart-line"></i> ${formData.plantType} ${formData.plantVariety || 'Standard'} Growth Simulation</h3>
                    <small>Generated at ${new Date().toLocaleTimeString()} for ${formData.city}, ${formData.country}</small>
                </div>
                ${formattedResult}
                <div class="result-actions">
                    <button class="btn" onclick="window.print()"><i class="fas fa-print"></i> Print Report</button>
                    <button class="btn btn-secondary" onclick="copyResults()"><i class="fas fa-copy"></i> Copy Results</button>
                </div>
            </div>
        `;

        // Add copy results functionality
        window.copyResults = function() {
            const text = resultBox.querySelector('.simulation-result').innerText;
            navigator.clipboard.writeText(text).then(() => {
                alert('Results copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy results. Please try again.');
            });
        };

        saveSimulation({
            plant: `${formData.plantType} ${formData.plantVariety || 'Standard'}`,
            conditions: `${formData.temperature}°C, ${formData.humidity}% humidity, ${formData.city}, ${formData.country}`,
            summary: simulationResult.substring(0, 150) + '...'
        });
    } catch (error) {
        console.error('Simulation error:', error);
        resultBox.innerHTML = `
            <div class="simulation-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Simulation Failed</p>
                <small>${error.message}</small>
                <button class="btn" onclick="location.reload()"><i class="fas fa-sync-alt"></i> Try Again</button>
            </div>
        `;
    }
}

// ======================
// Fellow Farmer Chatbot
// ======================

async function sendChatbotMessage() {
    if (!chatbotInput || !chatbotMessages) {
        console.error('Chatbot input or messages element not found');
        return;
    }

    const message = chatbotInput.value.trim();
    if (!message) return;

    const now = Date.now();
    if (now - lastChatbotTime < CHATBOT_COOLDOWN) {
        addMessage(`Please wait ${Math.ceil((CHATBOT_COOLDOWN - (now - lastChatbotTime)) / 1000)} seconds before sending another message.`, 'bot');
        return;
    }
    lastChatbotTime = now;

    addMessage(message, 'user');
    chatbotInput.value = '';

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    chatbotMessages.appendChild(typingIndicator);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEXT_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'TAPE - Fellow Farmer Chatbot'
            },
            body: JSON.stringify({
                model: "anthropic/claude-3-sonnet",
                messages: [
                    {
                        role: "system",
                        content: `
                            You are Fellow Farmer, a helpful plant care assistant for the Technology Assisted Plant Emulator (TAPE). 
                            Provide concise, accurate advice about plant care, troubleshooting, and gardening tips.
                            Format responses with markdown for bold (**), lists (-), and emphasis (*).
                            Keep responses under 200 words unless detailed explanation is needed.
                            If asked about non-plant topics, politely redirect to plant-related topics.
                            Include practical examples where relevant.
                            Always respond in a friendly, encouraging tone.
                        `
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.5,
                max_tokens: 300
            }),
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const botMessage = data.choices?.[0]?.message?.content || "I couldn't process that request. Please try again.";

        typingIndicator.remove();
        addMessage(botMessage, 'bot');

        const conversation = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        conversation.push({
            timestamp: new Date().toISOString(),
            user: message,
            bot: botMessage
        });
        localStorage.setItem('chatHistory', JSON.stringify(conversation.slice(-10)));
    } catch (error) {
        console.error('Chatbot error:', error);
        typingIndicator.remove();
        addMessage(`Sorry, I'm having trouble responding right now: ${error.message}. Please try again later.`, 'bot');
    }
}

function addMessage(content, sender) {
    if (!chatbotMessages) {
        console.error('Chatbot messages element not found');
        return;
    }
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message ${sender}`;
    messageDiv.innerHTML = formatChatMessage(content);
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function formatChatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*?)(\n|$)/gm, '<li>$1</li>')
        .replace(/\n/g, '<br>')
        .replace(/! (.*?)(\n|$)/g, '<div class="warning"><i class="fas fa-exclamation-triangle"></i> $1</div>');
}

// ======================
// Event Listeners
// ======================

// Navigation
if (navLinks) {
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.dataset.section;
            console.log(`Nav link clicked: ${sectionId}`);
            setActiveSection(sectionId);
        });
    });
} else {
    console.error('Navigation links not found');
}

// Theme toggle
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
} else {
    console.error('Theme toggle element not found');
}

// Hero buttons
if (startSimulationBtn) {
    startSimulationBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Start Simulation button clicked');
        setActiveSection('simulate');
    });
} else {
    console.error('Start Simulation button not found');
}

if (detectDiseaseBtn) {
    detectDiseaseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Detect Disease button clicked');
        setActiveSection('disease');
    });
} else {
    console.error('Detect Disease button not found');
}

// Section buttons
document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.tagName === 'A') {
            e.preventDefault();
            const sectionId = btn.dataset.section;
            console.log(`Section button clicked: ${sectionId}`);
            setActiveSection(sectionId);
        }
    });
});

// Location input with weather lookup
const updateWeather = debounce(async () => {
    if (!cityInput || !countryInput) {
        console.error('City or country input not found');
        return;
    }

    const city = cityInput.value.trim();
    const country = countryInput.value.trim();
    if (city.length < 2 || country.length < 2) {
        return;
    }

    const loadingSpan = document.createElement('span');
    loadingSpan.className = 'loading-text';
    loadingSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Fetching weather...';
    cityInput.parentElement.appendChild(loadingSpan);

    try {
        const weatherData = await fetchWeatherData(city, country);
        if (weatherData.error) {
            addMessage(weatherData.error, 'bot');
        } else {
            temperatureInput.value = weatherData.temperature;
            humidityInput.value = weatherData.humidity;
            temperatureInput.disabled = false;
            humidityInput.disabled = false;
            addMessage(`Weather data updated for ${city}, ${country}: **${weatherData.temperature}°C**, **${weatherData.humidity} humidity**. You can modify these values manually if needed.`, 'bot');
        }
    } catch (error) {
        console.error('Weather lookup failed:', error);
        addMessage(`Sorry, I couldn't fetch weather data for ${city}, ${country}. Please enter temperature and humidity manually.`, 'bot');
    } finally {
        loadingSpan.remove();
    }
});

if (cityInput && countryInput) {
    cityInput.addEventListener('input', updateWeather);
    countryInput.addEventListener('input', updateWeather);
} else {
    console.error('City or country input elements not found');
}

// Plant type input with variety dropdown
if (plantTypeInput && plantVarietyContainer) {
    plantTypeInput.addEventListener('input', debounce(async (e) => {
        const plantName = e.target.value.trim();
        if (plantName.length < 3) {
            const dropdown = plantVarietyContainer.querySelector('select');
            if (dropdown) dropdown.remove();
            plantVarietyInput.style.display = 'block';
            return;
        }

        const loadingSpan = document.createElement('span');
        loadingSpan.className = 'loading-text';
        loadingSpan.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading varieties...';
        plantVarietyContainer.appendChild(loadingSpan);

        try {
            const varieties = await fetchPlantVarieties(plantName);
            createVarietyDropdown(varieties);
        } catch (error) {
            console.error('Failed to load varieties:', error);
            plantVarietyInput.style.display = 'block';
        } finally {
            loadingSpan.remove();
        }
    }));
} else {
    console.error('Plant type input or variety container not found');
}

// Simulation form
if (simulateForm) {
    simulateForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const now = Date.now();
        if (now - lastSimulationTime < SIMULATION_COOLDOWN) {
            resultBox.innerHTML = `<div class="simulation-warning">
                <i class="fas fa-clock"></i>
                <p>Please wait ${Math.ceil((SIMULATION_COOLDOWN - (now - lastSimulationTime)) / 1000)} seconds before running another simulation</p>
            </div>`;
            return;
        }
        lastSimulationTime = Date.now();

        const varietyDropdown = document.getElementById('plantVarietyDropdown');
        const plantVariety = varietyDropdown ? 
            (varietyDropdown.value === 'Other' ? plantVarietyInput.value : varietyDropdown.value) :
            plantVarietyInput.value;

        if (varietyDropdown && !varietyDropdown.value && !plantVarietyInput.value) {
            resultBox.innerHTML = `<div class="simulation-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Please select a plant variety or choose "Other"</p>
                </div>`;
            return;
        }

        const formData = {
            plantType: plantTypeInput.value.trim(),
            plantVariety: plantVariety.trim(),
            placement: document.getElementById('placement').value,
            soilType: document.getElementById('soilType').value,
            watering: document.getElementById('watering').value.trim(),
            sunlight: document.getElementById('sunlight').value.trim(),
            temperature: document.getElementById('temperature').value.trim(),
            humidity: document.getElementById('humidity').value.trim(),
            growthStage: document.getElementById('growthStage').value || 'not specified',
            city: cityInput ? cityInput.value.trim() : '',
            country: countryInput ? countryInput.value.trim() : '',
            notes: document.getElementById('notes').value.trim() || 'None'
        };

        const validationError = validateInputs(formData);
        if (validationError) {
            resultBox.innerHTML = `<div class="simulation-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${validationError}</p>
                </div>`;
            return;
        }

        const [minTemp, maxTemp] = formData.temperature.split('-').map(Number);
        if (isNaN(minTemp) || isNaN(maxTemp) || minTemp >= maxTemp) {
            resultBox.innerHTML = `<div class="simulation-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Temperature must be a valid range (e.g., 18-24)</p>
                </div>`;
            return;
        }

        await runPlantSimulation(formData);
    });
} else {
    console.error('Simulation form not found');
}

// Disease form
if (diseaseForm) {
    diseaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const now = Date.now();
        if (now - lastDiseaseAnalysisTime < DISEASE_COOLDOWN) {
            diseaseResultBox.innerHTML = `<div class="simulation-warning">
                <i class="fas fa-clock"></i>
                <p>Please wait ${Math.ceil((DISEASE_COOLDOWN - (now - lastDiseaseAnalysisTime)) / 1000)} seconds before another analysis</p>
                </div>`;
            return;
        }
        lastDiseaseAnalysisTime = now;

        const imageFile = plantImageInput.files[0];
        if (!imageFile) {
            diseaseResultBox.innerHTML = `<div class="simulation-error">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Please select an image to analyze</p>
                </div>`;
            return;
        }

        diseaseResultBox.innerHTML = `
            <div class="simulation-loading">
                <i class="fas fa-microscope pulse"></i>
                <p>Analyzing plant health...</p>
                <small>Examining ${imageFile.name} for disease patterns</small>
                </div>
            `;

        try {
            const analysisResult = await analyzePlantDisease(
                imageFile,
                plantTypeDiseaseInput.value.trim(),
                symptomsInput.value.trim()
            );

            const formattedResult = formatDiseaseResult(analysisResult);

            diseaseResultBox.innerHTML = `
                <div class="simulation-result">
                    <div class="result-header">
                        <h3><i class="fas fa-diagnoses"></i> Plant Health Analysis</h3>
                        <small>Analyzed at ${new Date().toLocaleTimeString()}</small>
                    </div>
                    ${formattedResult}
                </div>
            `;

            saveSimulation({
                type: 'disease_analysis',
                plant: plantTypeDiseaseInput.value.trim() || 'Unknown',
                summary: analysisResult.substring(0, 150) + '...'
            });
        } catch (error) {
            console.error('Disease analysis error:', error);
            diseaseResultBox.innerHTML = `
                <div class="simulation-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Analysis Failed</p>
                    <small>${error.message}</small>
                    <button class="btn" onclick="location.reload()"><i class="fas fa-sync-alt"></i> Try Again</button>
                    </div>
                `;
        }
    });
} else {
    console.error('Disease form not found');
}

// Chatbot event listeners
if (chatbotToggle && chatbotContainer) {
    chatbotToggle.addEventListener('click', () => {
        console.log('Chatbot toggle clicked');
        chatbotContainer.classList.toggle('active');
        if (chatbotContainer.classList.contains('active')) {
            chatbotInput.focus();
        }
    });
} else {
    console.error('Chatbot toggle or container not found');
}

if (chatbotClose && chatbotContainer) {
    chatbotClose.addEventListener('click', () => {
        console.log('Chatbot close clicked');
        chatbotContainer.classList.remove('active');
    });
} else {
    console.error('Chatbot close or container not found');
}

if (chatbotSend && chatbotInput) {
    chatbotSend.addEventListener('click', sendChatbotMessage);
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            console.log('Chatbot send triggered via Enter key');
            sendChatbotMessage();
        }
    });
} else {
    console.error('Chatbot send or input elements not found');
}

// Handle read more/less buttons
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('btn-read-more') || e.target.closest('.btn-read-more')) {
        const btn = e.target.classList.contains('btn-read-more') ? e.target : e.target.closest('.btn-read-more');
        btn.parentElement.nextElementSibling.style.display = 'block';
        btn.parentElement.style.display = 'none';
    }

    if (e.target.classList.contains('btn-read-less') || e.target.closest('.btn-read-less')) {
        const btn = e.target.classList.contains('btn-read-less') ? e.target : e.target.closest('.btn-read-less');
        btn.parentElement.previousElementSibling.style.display = 'block';
        btn.parentElement.style.display = 'none';
    }
});

// ======================
// Initialization
// ======================

// Set initial theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}

// Initialize active section
setActiveSection('home');

// Load chat history
if (chatbotMessages) {
    const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    chatHistory.forEach(msg => {
        addMessage(msg.user, 'user');
        addMessage(msg.bot, 'bot');
    });
} else {
    console.error('Chatbot messages element not found during initialization');
}
