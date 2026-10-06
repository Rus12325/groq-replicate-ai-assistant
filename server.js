require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const Replicate = require('replicate');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

const SYSTEM_PROMPT = 'Ты – универсальный ассистент. Отвечай кратко, но содержательно. Если нужно, покажи код с пояснениями.';

// --- Чат с поддержкой нескольких моделей ---
app.post('/api/chat', async (req, res) => {
    const { messages, models } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Не передан массив messages' });
    }
    if (!models || !Array.isArray(models) || models.length === 0) {
        return res.status(400).json({ error: 'Выберите хотя бы одну модель' });
    }

    const fullMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
    ];

    try {
        const promises = models.map(async (model) => {
            try {
                const completion = await groq.chat.completions.create({
                    model: model,
                    messages: fullMessages,
                    temperature: 0.7,
                    max_tokens: 2048,
                });
                return {
                    model: model,
                    reply: completion.choices[0].message.content,
                    error: null
                };
            } catch (err) {
                return {
                    model: model,
                    reply: null,
                    error: err.message || 'Ошибка при запросе к модели'
                };
            }
        });

        const results = await Promise.all(promises);
        res.json({ results });
    } catch (error) {
        console.error('Ошибка Groq:', error);
        res.status(500).json({ error: error.message || 'Ошибка сервера' });
    }
});

// --- Генерация изображений (с поддержкой выбора модели) ---
app.post('/api/image', async (req, res) => {
    const { prompt, model = 'black-forest-labs/flux-1.1-dev' } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Не передан prompt' });
    }

    try {
        const output = await replicate.run(
            model,
            {
                input: {
                    prompt: prompt,
                    negative_prompt: 'low quality, blurry',
                    width: 512,
                    height: 512,
                    num_outputs: 1,
                    scheduler: 'DPMSolverMultistep',
                    num_inference_steps: 25,
                    guidance_scale: 7.5,
                }
            }
        );
        const imageUrl = output[0];
        res.json({ imageUrl });
    } catch (error) {
        console.error('Ошибка Replicate:', error);
        res.status(500).json({ error: error.message || 'Ошибка генерации картинки' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});