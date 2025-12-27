const express = require('express');
const multer = require('multer');
const { TranslationServiceClient } = require('@google-cloud/translate');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const cors = require('cors');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory buffer
app.use(cors());
app.use(express.json());

// Initialize Clients
const translationClient = new TranslationServiceClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/process-document', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No file uploaded" });

        const fileContent = req.file.buffer.toString('utf8'); // Convert file buffer to string
        const { action, targetLanguage } = req.body; // Action: 'translate' or 'summarize'

        if (action === 'summarize') {
            // --- CHATBOT SUMMARIZATION (Gemini) ---
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const prompt = `You are a government legal assistant. Please provide a concise, high-level summary of this document, highlighting key technical terms and obligations: ${fileContent}`;
            
            const result = await model.generateContent(prompt);
            const summary = result.response.text();
            return res.json({ result: summary });

        } else if (action === 'translate') {
            // --- SPECIALIZED TRANSLATION ---
            const request = {
                parent: `projects/${process.env.PROJECT_ID}/locations/us-central1`,
                contents: [fileContent],
                mimeType: 'text/plain',
                sourceLanguageCode: 'en',
                targetLanguageCode: targetLanguage || 'es',
            };
            const [response] = await translationClient.translateText(request);
            return res.json({ result: response.translations[0].translatedText });
        }

    } catch (error) {
        console.error("Processing Error:", error);
        res.status(500).json({ error: "Failed to process document" });
    }
});

app.listen(3000, () => console.log("Engine running on port 3000"));
