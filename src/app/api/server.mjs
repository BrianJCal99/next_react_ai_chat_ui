import OpenAI from 'openai'
import express from 'express'
import cors from 'cors'
import sanitizeHtml from 'sanitize-html';

import { marked } from 'marked'
import { MongoClient, ServerApiVersion } from 'mongodb';

const openai = new OpenAI({
    baseURL: 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',
  });

const uri = "mongodb://127.0.0.1:27017";
const database_name = "next-ollama-app";
const database_collection_name = "tradingCoach"

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const database_client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

async function db_connect() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await database_client.connect();
        // Send a ping to confirm a successful connection
        await database_client.db("admin").command({ ping: 1 });
        console.log("MongoDB server running at " + uri)
    } catch(error) {
        console.error("Failed to connect to MongoDB:", error);
    } finally {
        await database_client.close(); // Ensure the client is closed even if there is an error
    }
}
db_connect().catch(console.dir);

const app = express();
const port = 4000;

const system_message = "You are a professional trading coach who provides one-on-one guidance and customized advice. You provide personalized investment advice, including trading strategies";

// Middleware to parse JSON bodies
app.use(cors());
app.use(express.json()); // Add this line to parse JSON

// Define a POST API endpoint to receive data
app.post('/api/data', async (req, res) => {
    const { info } = req.body; // Get the info sent from the frontend
    

    try {
        await database_client.connect();
        const database = database_client.db(database_name);
        const database_collection = database.collection(database_collection_name);

        const user_document = {"role": "user", "content": info};

        const user_result = await database_collection.insertOne(user_document);
        console.log('Document inserted with _id:', user_result.insertedId);

        const conversation_history = await database_collection
            .find({}, { projection: { _id: 0, role: 1, content: 1 } })
            .toArray(); 

        const messages = [
            {"role": "system", "content": system_message},
            ...conversation_history
        ]

        const completion = await openai.chat.completions.create({
            model: 'llama3',
            messages: messages,
          })

        const assistant_document = {"role": "assistant", "content": completion.choices[0].message.content}

        const assitant_result = await database_collection.insertOne(assistant_document)
        console.log('Document inserted with _id:', assitant_result.insertedId);

        // Get the response content from Ollama
        const response = assistant_document.content;

        // Convert the Markdown content to HTML
        // Sanitize the Markdown content before converting it to HTML
        const responseWithHtml = sanitizeHtml(marked(response), {
            allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'p', 'ol', 'ul', 'li', 'br' ]), // Customize allowed tags as needed
            allowedAttributes: {
                '*': ['href', 'alt', 'src'], // Allow all attributes for all tags, adjust as needed
                'img': ['src', 'alt'] // Allow attributes for <img> specifically
            },
        });

        // Send the response back to the client
        res.status(200).json({ response: responseWithHtml });
    } catch (error) {
        console.error('Error communicating with Ollama:', error);
        res.status(500).json({ error: 'An error occurred while communicating with Ollama' });
    } finally {
    await database_client.close(); // Ensure the client is closed even if there is an error
    }
});

// Start the Express server
app.listen(port, () => {
    console.log(`Express server is running at http://localhost:${port}`);
});

app.get('/api/history', async (req, res) => {
    try {
        await database_client.connect();
        const database = database_client.db(database_name);
        const database_collection = database.collection(database_collection_name);

        const conversation_history = await database_collection
            .find({}, { projection: { _id: 0, role: 1, content: 1 } })
            .toArray();

        const historyWithHtml = conversation_history.map((message) => ({
            ...message,
            content: sanitizeHtml(marked(message.content), {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'p', 'ol', 'ul', 'li', 'br' ]),
                allowedAttributes: {
                    '*': ['href', 'alt', 'src'],
                    'img': ['src', 'alt']
                },
            }),
        }));

        res.status(200).json({ history: historyWithHtml });
    } catch (error) {
        console.error('Error retrieving chat history:', error);
        res.status(500).json({ error: 'An error occurred while retrieving chat history' });
    } finally {
        await database_client.close(); // Ensure the client is closed even if there is an error
    }
});

// Define a GET route for the root path
app.get('/', (req, res) => {
    res.send('Server is up and running!');
});