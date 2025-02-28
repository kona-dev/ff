import mongoose from 'mongoose';

// Define the schema for your items
const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name for this item'],
    maxlength: [60, 'Name cannot be more than 60 characters'],
  },
  imageUrl: {
    type: String,
    required: [true, 'Please provide an image URL for this item'],
  },
  hints: {
    type: [String],
    default: [],
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium',
  },
 
}, {

  collection: 'entries'
});

// Use mongoose.models to check if the model already exists, otherwise create a new one
export default mongoose.models.Item || mongoose.model('Item', ItemSchema);
