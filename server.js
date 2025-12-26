// server.js - GovTrans Backend Engine
const express = require('express');
const { TranslationServiceClient } = require('@google-cloud/translate');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Translation Client
// It will automatically look for GOOGLE_APPLICATION_CREDENTIALS in your environment
const translationClient = new TranslationServiceClient();

// Configuration - Replace these with your Google Cloud details
const projectId = process.env.PROJECT_ID || 'your-project-id';
const location = 'us-central1';
const glossaryId = 'legal-official-glossary'; // The ID of your uploaded legal corpus

/**
 * Endpoint to handle specialized legal translation
 */
app.post('/translate-legal', async (req, res) => {
    const { text } = req.body;

    if (!text) {
        return res.status(400).json({ error: "No text provided" });
    }

    // Configure the request with Glossary support
    const request = {
        parent: `projects/${projectId}/locations/${location}`,
        contents: [text],
        mimeType: 'text/plain',
        sourceLanguageCode: 'en',
        targetLanguageCode: 'es', // Set to your desired local language
        glossaryConfig: {
            glossary: `projects/${projectId}/locations/${location}/glossaries/${glossaryId}`,
            ignoreCase: true,
        },
    };

    try {
        // 
        const [response] = await translationClient.translateText(request);
        
        // We prioritize glossary translations over general machine translation
        const translation = response.glossaryTranslations.length > 0 
            ? response.glossaryTranslations[0].translatedText 
            : response.translations[0].translatedText;

        res.json({ translatedText: translation });
    } catch (error) {
        console.error('Translation Error:', error);
        res.status(500).json({ 
            error: "Failed to process legal translation", 
            message: error.details || error.message 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`-----------------------------------------------`);
    console.log(`GovTrans Legal Engine active on port ${PORT}`);
    console.log(`Target Glossary: ${glossaryId}`);
    console.log(`-----------------------------------------------`);
});
