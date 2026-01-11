// server.js
import 'dotenv/config';
import process from 'node:process';
import express from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import cors from 'cors';
import bodyParser from 'body-parser';
import supabase from './lib/supabase.js';
import { generateInterviewQuestions, evaluateAnswer } from './services/geminiService.js';

// Use Web Speech API if Google Cloud TTS is not configured
const useWebSpeech = !process.env.GOOGLE_CLOUD_PROJECT;
const ttsModule = useWebSpeech 
  ? await import('./services/webSpeechService.js')
  : await import('./services/textToSpeechService.js');
const { synthesizeSpeech, synthesizeSpeechStream } = ttsModule;

const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//index
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});

app.get('/homepage.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'homepage.html'));
});
app.get('/hirer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'hirer.html'));
});


//createbot.html
app.get('/createbot.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'createbot.html'));
});

app.get('/interview', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'interview.html'));
});

//create bot with form data
app.post('/create-bot', async (req, res) => {
    const botConfig = req.body;
    console.log('Received bot configuration:', botConfig);
    
    // Generate random 6-digit interview code
    const interviewCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Add interview code to bot configuration
    const botConfigWithCode = {
        ...botConfig,
        interview_code: interviewCode,
        created_at: new Date().toISOString()
    };
    
    // Supabase connection
    const {data, error} = await supabase
        .from('Interview_Bots')
        .insert([botConfigWithCode]);
    if (error) {
        console.error('Error inserting bot configuration:', error);
        return res.status(500).json({ error: 'Failed to create bot' });
    }
    res.status(200).json({ 
        message: 'Bot created successfully', 
        data,
        interviewCode: interviewCode 
    });
});

// Gemini API Endpoints
app.post('/api/generate-questions', async (req, res) => {
    try {
        const { jobTitle, jobDescription, numberOfQuestions } = req.body;
        
        if (!jobTitle || !jobDescription) {
            return res.status(400).json({ error: 'Job title and description are required' });
        }
        
        const questions = await generateInterviewQuestions(jobTitle, jobDescription, numberOfQuestions);
        res.json({ success: true, questions });
    } catch (error) {
        console.error('Error generating questions:', error);
        res.status(500).json({ error: 'Failed to generate questions' });
    }
});

app.post('/api/evaluate-answer', async (req, res) => {
    try {
        const { question, answer, jobContext } = req.body;
        
        if (!question || !answer) {
            return res.status(400).json({ error: 'Question and answer are required' });
        }
        
        const evaluation = await evaluateAnswer(question, answer, jobContext || '');
        res.json({ success: true, evaluation });
    } catch (error) {
        console.error('Error evaluating answer:', error);
        res.status(500).json({ error: 'Failed to evaluate answer' });
    }
});

// Text-to-Speech API Endpoints
app.post('/api/text-to-speech', async (req, res) => {
    try {
        const { text, outputFormat } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }
        
        if (outputFormat === 'base64') {
            const audioBase64 = await synthesizeSpeechStream(text);
            res.json({ success: true, audio: audioBase64, format: 'base64' });
        } else {
            const audioBuffer = await synthesizeSpeech(text);
            res.set({
                'Content-Type': 'audio/mp3',
                'Content-Length': audioBuffer.length
            });
            res.send(audioBuffer);
        }
    } catch (error) {
        console.error('Error converting text to speech:', error);
        res.status(500).json({ error: 'Failed to convert text to speech' });
    }
});

// Validate interview code and get bot details
app.post('/api/validate-code', async (req, res) => {
    try {
        const { code } = req.body;
        
        if (!code || code.length !== 6) {
            return res.status(400).json({ error: 'Invalid code format' });
        }
        
        // Fetch bot configuration from database using the code
        const { data: bot, error } = await supabase
            .from('Interview_Bots')
            .select('*')
            .eq('interview_code', code)
            .single();
        
        if (error || !bot) {
            return res.status(404).json({ error: 'Invalid interview code' });
        }
        
        res.json({ 
            success: true, 
            bot: {
                id: bot.id,
                jobTitle: bot.jobTitle,
                seniorityLevel: bot.seniorityLevel,
                organization: bot.organization,
                skills: bot.skills,
                topicsWeightage: bot.topicsWeightage,
                evaluationCriteria: bot.evaluationCriteria
            }
        });
    } catch (error) {
        console.error('Error validating code:', error);
        res.status(500).json({ error: 'Failed to validate code' });
    }
});

app.post('/api/interview-session', async (req, res) => {
    try {
        const { botId, action, data } = req.body;
        
        switch(action) {
            case 'start':
                // Fetch bot configuration from database
                const { data: bot, error: botError } = await supabase
                    .from('Interview_Bots')
                    .select('*')
                    .eq('id', botId)
                    .single();
                
                if (botError) {
                    return res.status(404).json({ error: 'Bot not found' });
                }
                
                // Generate initial questions
                const questions = await generateInterviewQuestions(
                    bot.jobTitle || bot.job_title,
                    bot.jobDescription || `${bot.seniorityLevel} position at ${bot.organization}. Required skills: ${bot.skills}`,
                    5,
                    bot.topicsWeightage || bot.topics_weightage
                );
                
                res.json({ 
                    success: true, 
                    bot,
                    questions,
                    sessionId: `session_${Date.now()}`
                });
                break;
                
            case 'submit-answer':
                // Evaluate the answer
                const evaluation = await evaluateAnswer(
                    data.question,
                    data.answer,
                    data.jobContext
                );
                
                res.json({ success: true, evaluation });
                break;
                
            default:
                res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error) {
        console.error('Error in interview session:', error);
        res.status(500).json({ error: 'Interview session error' });
    }
});


//listen to server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});