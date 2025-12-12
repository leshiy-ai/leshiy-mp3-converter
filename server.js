const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os'); // <-- 1. ДОБАВЛЕНО для os.tmpdir()
const { promisify } = require('util'); // <-- 2. ДОБАВЛЕНО для промисификации
const execPromise = promisify(exec); // <-- 3. Промисифицируем exec

// 🛑 УДАЛЕН БЛОК СОЗДАНИЯ ПАПКИ 'uploads'

const app = express();

// 🛑 ИСПРАВЛЕНИЕ: Используем os.tmpdir() - системную временную директорию
const upload = multer({ dest: os.tmpdir() });


app.post('/convert', upload.single('audio'), async (req, res) => {
    // 4. Пути теперь ведут во временную директорию
    const inputPath = req.file?.path;
    const outputPath = inputPath ? inputPath + '.mp3' : null;

    try {
        if (!req.file) {
            return res.status(400).send('No audio file uploaded');
        }
        
        // Конвертируем OGG в MP3 (моно, 22050 Гц, 64 кбит/с)
        const command = `ffmpeg -i "${inputPath}" -ar 22050 -ac 1 -b:a 64k "${outputPath}"`;
        
        // 🛑 ИСПРАВЛЕНИЕ: Корректно ждем завершения FFmpeg
        await execPromise(command); 

        const mp3Buffer = fs.readFileSync(outputPath);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.send(mp3Buffer);

    } catch (error) {
        console.error('Conversion error:', error);
        // Отправляем более информативную ошибку
        res.status(500).send(`Failed to convert audio: ${error.message}`); 
    } finally {
        // 5. ГАРАНТИЯ ОЧИСТКИ: Удаляем временные файлы в блоке finally
        if (inputPath && fs.existsSync(inputPath)) {
            fs.unlinkSync(inputPath);
        }
        if (outputPath && fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    }
});

// Проверка работоспособности
app.get('/', (req, res) => {
  res.send('OGG to MP3 Converter is running!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
