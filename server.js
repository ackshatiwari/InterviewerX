//BACKEND: server.js
import 'dotenv/config';
import process from 'node:process';import express from 'express';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import supabase from './lib/supabase.js';

const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

//Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/createbot.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'createbot.html'));
});

app.post('/create-bot', async (req, res) => {
    const botConfig = req.body;
    console.log('Received bot configuration:', botConfig);
    //Supabase connection
    const {data, error} = await supabase
        .from('Interview_Bots')
        .insert([botConfig]);
    if (error) {
        console.error('Error inserting bot configuration:', error);
        return res.status(500).json({ error: 'Failed to create bot' });
    }
    res.status(200).json({ message: 'Bot created successfully'});
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});