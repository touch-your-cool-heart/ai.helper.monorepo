import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

export const API_URL = process.env.API_URL || '';

export const ARK_API_KEY = process.env.ARK_API_KEY || '';

export const ModelId = process.env.MODEL_ID || '';

export const PORT = parseInt(process.env.PORT || '10087');
