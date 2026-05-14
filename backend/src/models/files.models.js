import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: false,
    },
    filenames: {
        type: [String],
        required: true,
    },
    publicIds: {
        type: [String],
        required: true,
    },
    urls: {
        type: [String],
        required: false,
    },
    expiresAt: {
        type: Date,
        required: true,
        index: { expires: 0 },
    },
});

export const File = mongoose.model('File', fileSchema);