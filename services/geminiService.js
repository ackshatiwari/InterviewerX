import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export const generateInterviewQuestions = async (jobTitle, jobDescription, numberOfQuestions = 5, topicsWeightage = null) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Parse topics and weightage if provided
    let topicsSection = '';
    if (topicsWeightage) {
      topicsSection = `
      Topics and Weightage: ${topicsWeightage}
      
      IMPORTANT: Distribute the ${numberOfQuestions} questions according to these topic weightages.
      For example, if "algorithms" is 40%, then roughly 40% of questions should be about algorithms.
      `;
    }
    
    const prompt = `
      You are an expert recruiter. Generate ${numberOfQuestions} interview questions for a ${jobTitle} position.
      
      Job Description: ${jobDescription}
      ${topicsSection}
      
      Please provide:
      1. Questions distributed according to the topic weightages if provided
      2. A mix of technical and behavioral questions
      3. Questions that assess relevant skills
      4. Questions that evaluate cultural fit
      
      Format the response as a JSON array with objects containing:
      - question: the interview question
      - type: "technical" or "behavioral"
      - topic: the main topic this question addresses (e.g., "algorithms", "system design", "behavioral", etc.)
      - points: suggested point value for this question (distribute 100 total points across all questions based on topic importance)
      - followUp: a potential follow-up question
      
      Return ONLY valid JSON, no additional text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\[.*\]/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Invalid response format from Gemini');
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
};

export const evaluateAnswer = async (question, answer, jobContext, questionPoints = null, topic = null) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    let scoringContext = '';
    if (questionPoints && topic) {
      scoringContext = `
      Topic: ${topic}
      Question Worth: ${questionPoints} points out of 100 total interview points
      `;
    }
    
    const prompt = `
      Evaluate this interview answer on a scale of 1-100.
      
      Job Context: ${jobContext}
      ${scoringContext}
      Question: ${question}
      Candidate Answer: ${answer}
      
      Provide a JSON response with:
      - score: number between 1-100 (this is the percentage score for this specific question)
      - pointsEarned: if the question is worth specific points, calculate points earned (score% * questionPoints)
      - topic: the topic area being evaluated
      - strengths: array of positive points
      - improvements: array of areas for improvement
      - feedback: brief constructive feedback
      
      Return ONLY valid JSON, no additional text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Invalid response format from Gemini');
  } catch (error) {
    console.error('Error evaluating answer:', error);
    throw error;
  }
};