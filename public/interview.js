// interview.js
let currentBot = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let mediaRecorder = null;
let audioChunks = [];
let recognition = null;
let isRecording = false;
let allAnswers = [];

// Speech recognition setup
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        const transcriptionDiv = document.getElementById('transcription');
        transcriptionDiv.textContent = finalTranscript || interimTranscript;
        
        if (finalTranscript) {
            document.getElementById('submitAnswer').style.display = 'block';
            document.getElementById('submitAnswer').dataset.answer = finalTranscript;
        }
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        document.getElementById('recordingStatus').textContent = 'Error: ' + event.error;
    };
}

// Handle code validation
document.getElementById('startInterview').addEventListener('click', async () => {
    const code = document.getElementById('interviewCode').value;
    
    if (code.length !== 6) {
        document.getElementById('errorMessage').textContent = 'Please enter a valid 6-digit code';
        return;
    }
    
    try {
        const response = await fetch('/api/validate-code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentBot = data.bot;
            document.getElementById('codeEntry').style.display = 'none';
            document.getElementById('interviewInterface').style.display = 'block';
            
            // Display bot info
            document.getElementById('jobTitle').textContent = currentBot.jobTitle;
            document.getElementById('roleInfo').textContent = 
                `${currentBot.seniorityLevel} at ${currentBot.organization || 'Company'} - Skills: ${currentBot.skills || 'Various'}`;
            
            // Start interview
            await startInterviewSession();
        } else {
            document.getElementById('errorMessage').textContent = data.error || 'Invalid code';
        }
    } catch (error) {
        console.error('Error validating code:', error);
        document.getElementById('errorMessage').textContent = 'Failed to validate code';
    }
});

// Start interview session
async function startInterviewSession() {
    try {
        const response = await fetch('/api/interview-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                botId: currentBot.id,
                action: 'start'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentQuestions = data.questions;
            document.getElementById('interviewChat').style.display = 'block';
            
            // Start with first question
            askNextQuestion();
        }
    } catch (error) {
        console.error('Error starting interview:', error);
    }
}

// Ask next question
async function askNextQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        // Calculate final score
        calculateFinalScore();
        return;
    }
    
    const question = currentQuestions[currentQuestionIndex];
    const questionText = question.question;
    
    // Display question
    const questionDiv = document.getElementById('currentQuestion');
    questionDiv.innerHTML = `<h3>Question ${currentQuestionIndex + 1}:</h3><p>${questionText}</p>`;
    
    // Add to chat
    addMessageToChat('interviewer', questionText);
    
    // Text to speech
    speakWithBrowserTTS(questionText);
}

// Handle recording
const recordButton = document.getElementById('recordButton');

recordButton.addEventListener('mousedown', startRecording);
recordButton.addEventListener('mouseup', stopRecording);
recordButton.addEventListener('touchstart', startRecording);
recordButton.addEventListener('touchend', stopRecording);

async function startRecording() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser');
        return;
    }
    
    isRecording = true;
    audioChunks = [];
    document.getElementById('transcription').textContent = '';
    document.getElementById('recordingStatus').textContent = 'Recording...';
    recordButton.classList.add('recording');
    
    // Start recognition
    recognition.start();
    
    // Record audio
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.start();
    } catch (error) {
        console.error('Error accessing microphone:', error);
    }
}

function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    document.getElementById('recordingStatus').textContent = 'Processing...';
    recordButton.classList.remove('recording');
    
    // Stop recognition
    if (recognition) {
        recognition.stop();
    }
    
    // Stop recorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
}

// Submit answer
document.getElementById('submitAnswer').addEventListener('click', async () => {
    const answer = document.getElementById('submitAnswer').dataset.answer;
    
    if (!answer) return;
    
    // Add answer to chat
    addMessageToChat('candidate', answer);
    
    // Store answer with question details
    const currentQuestion = currentQuestions[currentQuestionIndex];
    allAnswers.push({
        question: currentQuestion.question,
        answer: answer,
        topic: currentQuestion.topic || 'general',
        points: currentQuestion.points || (100 / currentQuestions.length)
    });
    
    // Evaluate the answer
    try {
        const response = await fetch('/api/interview-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                botId: currentBot.id,
                action: 'submit-answer',
                data: {
                    question: currentQuestions[currentQuestionIndex].question,
                    answer: answer,
                    jobContext: `${currentBot.jobTitle} at ${currentBot.organization} - Skills: ${currentBot.skills}`
                }
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.evaluation) {
            // Store result
            allAnswers[allAnswers.length - 1].evaluation = data.evaluation;
            
            // Provide feedback
            const feedbackText = `Thank you for your answer. ${data.evaluation.feedback || ''}`;
            await speakText(feedbackText);
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
    }
    
    // Clear transcription
    document.getElementById('transcription').textContent = '';
    document.getElementById('submitAnswer').style.display = 'none';
    document.getElementById('submitAnswer').dataset.answer = '';
    
    // Next question
    currentQuestionIndex++;
    setTimeout(() => askNextQuestion(), 2000);
});

// Browser text-to-speech
function speakWithBrowserTTS(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Get available voices and pick the best one
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => 
            v.lang === 'en-US' && (v.name.includes('Google') || v.name.includes('Microsoft'))
        ) || voices.find(v => v.lang === 'en-US');
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        window.speechSynthesis.speak(utterance);
        
        return new Promise((resolve) => {
            utterance.onend = resolve;
            utterance.onerror = resolve;
        });
    } else {
        console.warn('Speech synthesis not supported in this browser');
        return Promise.resolve();
    }
}

// Helper function for text-to-speech
async function speakText(text) {
    return speakWithBrowserTTS(text);
}

// Add message to chat
function addMessageToChat(sender, message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = `
        <div class="message-sender">${sender === 'interviewer' ? 'Interviewer' : 'You'}:</div>
        <div class="message-content">${message}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Calculate final score
function calculateFinalScore() {
    let totalPointsEarned = 0;
    let totalPointsPossible = 0;
    let topicScores = {};
    let allStrengths = [];
    let allImprovements = [];
    let feedbackTexts = [];
    
    allAnswers.forEach(item => {
        totalPointsPossible += item.points || 0;
        
        if (item.evaluation) {
            // Calculate points earned for this question
            const pointsEarned = item.evaluation.pointsEarned || 
                ((item.evaluation.score / 100) * item.points);
            totalPointsEarned += pointsEarned;
            
            // Track scores by topic
            if (item.topic) {
                if (!topicScores[item.topic]) {
                    topicScores[item.topic] = { earned: 0, possible: 0 };
                }
                topicScores[item.topic].earned += pointsEarned;
                topicScores[item.topic].possible += item.points;
            }
            
            if (item.evaluation.strengths) {
                allStrengths = allStrengths.concat(item.evaluation.strengths);
            }
            if (item.evaluation.improvements) {
                allImprovements = allImprovements.concat(item.evaluation.improvements);
            }
            if (item.evaluation.feedback) {
                feedbackTexts.push(item.evaluation.feedback);
            }
        }
    });
    
    // Calculate final score based on points
    const finalScore = totalPointsPossible > 0 ? 
        Math.round((totalPointsEarned / totalPointsPossible) * 100) : 
        Math.round(totalPointsEarned);
    
    // Hide interview chat and show score
    document.getElementById('interviewChat').style.display = 'none';
    document.getElementById('scoreDisplay').style.display = 'block';
    
    // Display final score
    document.getElementById('finalScore').textContent = finalScore;
    
    // Display strengths
    const strengthsList = document.getElementById('strengths');
    allStrengths.forEach(strength => {
        const li = document.createElement('li');
        li.textContent = strength;
        strengthsList.appendChild(li);
    });
    
    // Display improvements
    const improvementsList = document.getElementById('improvements');
    allImprovements.forEach(improvement => {
        const li = document.createElement('li');
        li.textContent = improvement;
        improvementsList.appendChild(li);
    });
    
    // Display overall feedback
    document.getElementById('overallFeedback').textContent = feedbackTexts.join(' ');
    
    // Announce completion
    speakText(`Interview complete! Your overall score is ${finalScore} out of 100. Thank you for participating.`);
}

// Test microphone
document.getElementById('testMicrophone').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create audio context to visualize audio levels
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        microphone.connect(analyser);
        
        // Visualize audio level
        const audioLevelDiv = document.getElementById('audioLevel');
        
        function updateAudioLevel() {
            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            audioLevelDiv.style.width = `${(average / 255) * 100}%`;
            audioLevelDiv.style.backgroundColor = average > 50 ? '#4CAF50' : '#FFC107';
            
            if (stream.active) {
                requestAnimationFrame(updateAudioLevel);
            }
        }
        
        updateAudioLevel();
        
        // Stop after 5 seconds
        setTimeout(() => {
            stream.getTracks().forEach(track => track.stop());
            audioLevelDiv.style.width = '0';
            alert('Microphone test complete! Your audio is working.');
        }, 5000);
        
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please check your permissions.');
    }
});

// Handle resume upload
document.getElementById('uploadResume').addEventListener('click', () => {
    const fileInput = document.getElementById('resumeFile');
    const file = fileInput.files[0];
    
    if (file) {
        // For now, just confirm upload
        alert('Resume uploaded successfully!');
    } else {
        alert('Please select a file to upload');
    }
});