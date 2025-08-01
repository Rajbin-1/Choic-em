﻿// ======================
// DOM Elements
// ======================
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');
const themeToggle = document.getElementById('themeToggle');
const simulateForm = document.getElementById('simulate-form');
const resultBox = document.getElementById('resultBox');
const plantTypeInput = document.getElementById('plantType');
const plantVarietyInput = document.getElementById('plantVariety');
const plantVarietyContainer = plantVarietyInput.parentElement;
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

// ======================
// Constants
// ======================
const TEXT_API_KEY = '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';
const IMAGE_API_KEY = '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SIMULATION_COOLDOWN = 10000; // 10 seconds
const DISEASE_COOLDOWN = 15000; // 15 seconds
const CHATBOT_COOLDOWN = 2000; // 2 seconds
let lastSimulationTime = 0;
let lastDiseaseAnalysisTime = 0;
let lastChatbotTime = 0;

// ======================
// Core Functions
// ======================

function setActiveSection(sectionId) {
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
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    const icon = themeToggle.querySelector('i');
    icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
}

function formatSimulationResult(rawText) {
    const summary = rawText.split('\n\n')[0] || rawText.substring(0, 150) + '...';
    const details = rawText;
    const visualization = generateGrowthVisualization(rawText);

    return `
        <div class="result-summary">
            <h4>Quick Summary</h4>
            <p>${summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}</p>
            ${visualization}
            <button class="btn btn-read-more">Read More <i class="fas fa-chevron-down"></i></button>
        </div>
        <div class="result-details" style="display:none;">
            ${rawText
            .replace(/## (.*?)\n/g, '<h4>$1</h4>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^- (.*?)(\n|$)/gm, '<li>$1</li>')
            .replace(/\n/g, '<br>')
            .replace(/! (.*?)(\n|$)/g, '<div class="warning"><i class="fas fa-exclamation-triangle"></i> $1</div>')}
            <button class="btn btn-read-less">Show Less <i class="fas fa-chevron-up"></i></button>
        </div>
    `;
}

function formatDiseaseResult(rawText) {
    // Clean up the response and format it for display
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

    // Ensure all lists are properly closed
    formattedText += '</ul>';

    return `
        <div class="disease-result">
            ${formattedText}
            <button class="btn" onclick="window.print()"><i class="fas fa-print"></i> Print Report</button>
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
                'X-Title': 'TAPE - Technology Assisted Plant Emulator'
            },
            body: JSON.stringify({
                model: "anthropic/claude-3-sonnet",
                messages: [
                    {
                        role: "system",
                        content: `You are a botanical database API. Return ONLY a JSON array of 3-5 common varieties for the requested plant. Example: ["Variety A", "Variety B"]. If the plant has no common varieties or is unknown, return ["Standard"]. Always return valid JSON.`
                    },
                    {
                        role: "user",
                        content: `List varieties for: ${plantName}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 100
            }),
            signal: AbortSignal.timeout(5000) // 5-second timeout
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return ["Standard"];
        }

        try {
            const cleanedContent = content.replace(/```json|```/g, '').trim();
            const varieties = JSON.parse(cleanedContent);
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
1. First identify the plant species if not provided
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
    try {
        resultBox.innerHTML = `
            <div class="simulation-loading">
                <i class="fas fa-seedling pulse"></i>
                <p>Simulating ${formData.plantType}'s growth patterns...</p>
                <small>Analyzing ${formData.soilType} soil with ${formData.sunlight} light</small>
            </div>
        `;

        const prompt = `You are a plant growth simulation AI for the Technology Assisted Plant Emulator (TAPE). Provide a detailed, scientifically accurate prediction with these requirements:

1. **Overview**: Begin with a 2-3 sentence summary including a specific survival percentage (e.g., "This tomato plant has a 75% survival probability under current conditions").

2. **Growth Stages**: For each major stage (seedling, vegetative, flowering, fruiting), include:
   - Timeframe (e.g., "Reaches vegetative stage in 4-6 weeks")
   - Survival probability (e.g., "60% survival to flowering stage")+
   - Expected size/characteristics

3. **Environmental Analysis**: Assess each factor (temperature, humidity, soil, sunlight, watering) with specific notes.

4. **Recommendations**: Provide 3-5 actionable recommendations, prefixed with "Recommendation:".

5. **Risks**: Highlight any critical risks with "Warning:" prefix.

Format with clear headings (##) and bullet points (-). Include specific numbers and metrics throughout.

**Current Conditions**:
- Plant: ${formData.plantType} ${formData.plantVariety || 'Standard'}
- Environment: ${formData.placement}, ${formData.soilType} soil
- Care: ${formData.watering} watering, ${formData.sunlight} light
- Climate: ${formData.temperature}°C, ${formData.humidity}% humidity
- Stage: ${formData.growthStage}
- Notes: ${formData.notes || 'None'}

Provide response in 250-400 words.`;

        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TEXT_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'TAPE - Technology Assisted Plant Emulator'
            },
            body: JSON.stringify({
                model: "openai/gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a plant growth simulation AI. Provide detailed, scientifically accurate predictions formatted with markdown-style headings and lists. Always include specific numbers and timelines.Give me text with no extra spaces."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.7
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
        const formattedResult = formatSimulationResult(simulationResult);

        resultBox.innerHTML = `
            <div class="simulation-result">
                <div class="result-header">
                    <h3><i class="fas fa-chart-line"></i> ${formData.plantType} ${formData.plantVariety || 'Standard'} Growth Simulation</h3>
                    <small>Generated at ${new Date().toLocaleTimeString()}</small>
                </div>
                ${formattedResult}
                <button class="btn" onclick="window.print()"><i class="fas fa-print"></i> Print Report</button>
            </div>
        `;

        saveSimulation({
            plant: `${formData.plantType} ${formData.plantVariety || 'Standard'}`,
            conditions: `${formData.temperature}°C, ${formData.humidity}% humidity`,
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

function generateGrowthVisualization(simulationText) {
    // Try to extract survival rate using multiple patterns
    const survivalPatterns = [
        /survival (?:rate|probability)[^\d]*(\d+)%/i,
        /(\d+)% survival/i,
        /(\d+)% chance of survival/i,
        /(\d+)% success rate/i
    ];
    
    let survivalRate = 50; // Default if not found
    for (const pattern of survivalPatterns) {
        const match = simulationText.match(pattern);
        if (match) {
            survivalRate = parseInt(match[1]);
            break;
        }
    }

    // Try to extract growth stages and their probabilities
    const stagePattern = /(seed|seedling|vegetative|flowering|fruiting|mature)[^\d]*(\d+)%/gi;
    const stageMatches = [...simulationText.matchAll(stagePattern)];
    
    const growthStages = ['Seed', 'Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Mature'];
    const survivalRates = growthStages.map((stage, i) => {
        // Find if this stage was mentioned specifically
        const stageMatch = stageMatches.find(m => m[1].toLowerCase() === stage.toLowerCase());
        if (stageMatch) return { stage, rate: parseInt(stageMatch[2]) };
        
        // Calculate decreasing survival rate based on initial rate if not found
        const stageRate = Math.max(10, survivalRate - (i * 15));
        return { stage, rate: stageRate };
    });

    // Generate HTML for the visualization
    return `
        <div class="visualization-container">
            <h4><i class="fas fa-chart-bar"></i> Growth Potential Analysis</h4>
            <div class="visualization-grid">
                <div class="survival-chart">
                    <h5>Stage Survival Probability</h5>
                    <div class="chart-container">
                        ${survivalRates.map(item => `
                            <div class="chart-item">
                                <div class="chart-label">${item.stage}</div>
                                <div class="chart-bar-container">
                                    <div class="chart-bar" style="width: ${item.rate}%; background-color: ${getBarColor(item.rate)};">
                                        <span class="chart-value">${item.rate}%</span>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <p class="chart-note"><small>Probability of reaching each growth stage successfully</small></p>
                </div>
                <div class="growth-timeline">
                    <h5>Projected Growth Milestones</h5>
                    <div class="timeline-container">
                        ${generateTimeline(simulationText)}
                    </div>
                </div>
            </div>
            <div class="risk-assessment">
                ${generateRiskAssessment(simulationText, survivalRate)}
            </div>
        </div>
    `;
}

function generateRiskAssessment(text, survivalRate) {
    let riskLevel = 'Moderate';
    let riskColor = '#FFC107';
    let recommendations = [];

    if (survivalRate > 70) {
        riskLevel = 'Low';
        riskColor = '#4CAF50';
        recommendations = [
            'Maintain current conditions',
            'Monitor for pests regularly',
            'Continue with current care routine'
        ];
    } else if (survivalRate > 40) {
        riskLevel = 'Moderate';
        riskColor = '#FFC107';
        recommendations = [
            'Consider adjusting watering schedule',
            'Monitor sunlight exposure',
            'Check soil nutrients'
        ];
    } else {
        riskLevel = 'High';
        riskColor = '#F44336';
        recommendations = [
            'Immediate intervention needed',
            'Review all environmental factors',
            'Consider repotting or relocation'
        ];
    }

    // Try to extract specific recommendations from the text
    const recPattern = /recommend(?:ation|ed)[^\n:-]+[:-][^\n]+/gi;
    const extractedRecs = text.match(recPattern) || [];
    if (extractedRecs.length > 0) {
        recommendations = extractedRecs.slice(0, 3).map(rec =>
            rec.replace(/recommend(?:ation|ed)[^\n:-]+[:-]\s*/i, '').trim()
        );
    }

    return `
        <div class="risk-card" style="border-left: 4px solid ${riskColor}">
            <h5><i class="fas fa-exclamation-triangle"></i> Overall Risk Assessment: <span style="color: ${riskColor}">${riskLevel}</span></h5>
            <p>Based on current conditions, this plant has a <strong>${survivalRate}%</strong> initial survival probability.</p>
            <div class="recommendations">
                <h6>Key Recommendations:</h6>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}
function generateTimeline(simulationText) {
    // Try multiple patterns to find timeline information
    const timelinePatterns = [
        /(\d+\s*-\s*\d+\s*(?:weeks|months|days)[^\n]+)/gi,
        /(?:within|after)\s*(\d+\s*(?:weeks|months|days)[^\n]+)/gi,
        /(?:reach|achieve)\s*\w+\s*(?:stage|phase)\s*(?:in|after)\s*(\d+\s*(?:weeks|months|days)[^\n]+)/gi
    ];

    let timelineItems = [];
    for (const pattern of timelinePatterns) {
        const matches = simulationText.match(pattern);
        if (matches && matches.length > 0) {
            timelineItems = [...timelineItems, ...matches.slice(0, 3)];
            if (timelineItems.length >= 3) break;
        }
    }

    // Fallback if no matches found
    if (timelineItems.length === 0) {
        timelineItems = [
            "Initial growth in 2-4 weeks",
            "Vegetative stage in 6-8 weeks",
            "Flowering phase in 10-12 weeks"
        ];
    }

    return `
        <ul class="timeline">
            ${timelineItems.slice(0, 3).map((item, i) => `
                <li class="timeline-item">
                    <div class="timeline-marker" style="background-color: ${getMarkerColor(i)}">${i + 1}</div>
                    <div class="timeline-content">${item.trim()}</div>
                </li>
            `).join('')}
        </ul>
        ${timelineItems.length > 3 ? `<button class="btn btn-read-more" onclick="this.parentElement.querySelector('.full-timeline').style.display='block';this.style.display='none'">Show More Milestones</button>
        <ul class="timeline full-timeline" style="display:none">
            ${timelineItems.slice(3).map((item, i) => `
                <li class="timeline-item">
                    <div class="timeline-marker" style="background-color: ${getMarkerColor(i + 3)}">${i + 4}</div>
                    <div class="timeline-content">${item.trim()}</div>
                </li>
            `).join('')}
        </ul>` : ''}
    `;
}

function getMarkerColor(index) {
    const colors = ['#2e7d32', '#388e3c', '#81c784', '#4CAF50', '#8BC34A', '#CDDC39'];
    return colors[index % colors.length];
}
// ======================
// Fellow Farmer Chatbot
// ======================

async function sendChatbotMessage() {
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
            signal: AbortSignal.timeout(10000) // 10-second timeout
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API error: ${response.status}`);
        }

        const data = await response.json();
        const botMessage = data.choices?.[0]?.message?.content || "I couldn't process that request. Please try again.";

        typingIndicator.remove();
        addMessage(botMessage, 'bot');

        // Save conversation to localStorage
        const conversation = JSON.parse(localStorage.getItem('chatHistory') || '[]');
        conversation.push({
            timestamp: new Date().toISOString(),
            user: message,
            bot: botMessage
        });
        localStorage.setItem('chatHistory', JSON.stringify(conversation.slice(-10))); // Keep last 10 messages
    } catch (error) {
        console.error('Chatbot error:', error);
        typingIndicator.remove();
        addMessage(`Sorry, I'm having trouble responding right now: ${error.message}. Please try again later.`, 'bot');
    }
}

function getBarColor(rate) {
    // Returns different colors based on the survival rate percentage
    if (rate >= 80) return '#2e7d32';  // Dark green for excellent survival
    if (rate >= 60) return '#388e3c';  // Medium green for good survival
    if (rate >= 40) return '#81c784';  // Light green for moderate survival
    if (rate >= 20) return '#ffb74d';  // Orange for poor survival
    return '#e57373';                  // Red for very poor survival
}

function addMessage(content, sender) {
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
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveSection(link.dataset.section);
    });
});

// Theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Section buttons
document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (btn.tagName === 'A') {
            e.preventDefault();
            setActiveSection(btn.dataset.section);
        }
    });
});

// Plant type input with variety dropdown
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

// Simulation form
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
    lastSimulationTime = now;

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

// Disease form
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

// Chatbot event listeners
chatbotToggle.addEventListener('click', () => {
    chatbotContainer.classList.toggle('active');
    if (chatbotContainer.classList.contains('active')) {
        chatbotInput.focus();
    }
});

chatbotClose.addEventListener('click', () => {
    chatbotContainer.classList.remove('active');
});

chatbotSend.addEventListener('click', sendChatbotMessage);
chatbotInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatbotMessage();
});

// ======================
// Initialization
// ======================

// Set initial theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
} else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
}

// Initialize active section
setActiveSection('home');

// Load chat history
const chatHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]');
chatHistory.forEach(msg => {
    addMessage(msg.user, 'user');
    addMessage(msg.bot, 'bot');
});

// Handle read more/less buttons
document.addEventListener('click', function (e) {
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
